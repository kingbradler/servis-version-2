"""Cart helpers and order checkout (atomic stock decrement)."""

from __future__ import annotations

import logging
from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from django.db.models import F
from rest_framework.exceptions import NotFound, ValidationError

logger = logging.getLogger(__name__)

from apps.orders.models import Cart, CartItem, Order, OrderItem, OrderStatus
from apps.products.models import Product, ProductStatus
from apps.stores.models import StoreStatus


def get_or_create_cart(user) -> Cart:
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def assert_product_purchasable(product: Product, quantity: int) -> None:
    if quantity <= 0:
        raise ValidationError({"quantity": "La quantité doit être supérieure à 0."})

    if product.status != ProductStatus.ACTIVE:
        raise ValidationError(
            {"product": "Ce produit n'est pas disponible à l'achat."}
        )

    if product.store.status != StoreStatus.ACTIVE:
        raise ValidationError(
            {"product": "La boutique de ce produit n'est pas active."}
        )

    if product.stock < quantity:
        raise ValidationError(
            {
                "quantity": (
                    f"Stock insuffisant (disponible: {product.stock}, "
                    f"demandé: {quantity})."
                )
            }
        )


def add_or_update_cart_item(cart: Cart, product_id, quantity: int) -> CartItem:
    if quantity <= 0:
        raise ValidationError({"quantity": "La quantité doit être supérieure à 0."})

    try:
        product = Product.objects.select_related("store").get(pk=product_id)
    except Product.DoesNotExist as exc:
        raise NotFound("Produit introuvable.") from exc

    existing = CartItem.objects.filter(cart=cart, product=product).first()
    new_qty = quantity if existing is None else existing.quantity + quantity
    assert_product_purchasable(product, new_qty)

    if existing is None:
        return CartItem.objects.create(cart=cart, product=product, quantity=quantity)

    existing.quantity = new_qty
    existing.save(update_fields=["quantity", "updated_at"])
    cart.save(update_fields=["updated_at"])
    return existing


def set_cart_item_quantity(cart: Cart, item_id, quantity: int) -> CartItem:
    if quantity <= 0:
        raise ValidationError({"quantity": "La quantité doit être supérieure à 0."})

    try:
        item = CartItem.objects.select_related("product", "product__store").get(
            pk=item_id, cart=cart
        )
    except CartItem.DoesNotExist as exc:
        raise NotFound("Article introuvable.") from exc

    assert_product_purchasable(item.product, quantity)
    item.quantity = quantity
    item.save(update_fields=["quantity", "updated_at"])
    cart.save(update_fields=["updated_at"])
    return item


def remove_cart_item(cart: Cart, item_id) -> None:
    deleted, _ = CartItem.objects.filter(pk=item_id, cart=cart).delete()
    if not deleted:
        raise NotFound("Article introuvable.")
    cart.save(update_fields=["updated_at"])


def clear_cart(cart: Cart) -> None:
    cart.items.all().delete()
    cart.save(update_fields=["updated_at"])


@transaction.atomic
def cancel_order(order: Order) -> Order:
    """Cancel an order, restore stock, and cancel open payment if any."""
    if order.status == OrderStatus.CANCELLED:
        return order

    order = Order.objects.select_for_update().prefetch_related("items").get(pk=order.pk)
    if order.status == OrderStatus.CANCELLED:
        return order

    for item in order.items.all():
        if item.product_id:
            Product.objects.filter(pk=item.product_id).update(
                stock=F("stock") + item.quantity
            )
            product = Product.objects.get(pk=item.product_id)
            if (
                product.status == ProductStatus.OUT_OF_STOCK
                and product.stock > 0
            ):
                product.status = ProductStatus.ACTIVE
                product.save(update_fields=["status", "updated_at"])

    order.status = OrderStatus.CANCELLED
    order.save(update_fields=["status", "updated_at"])

    from apps.payments.models import Payment, PaymentStatus

    payment = Payment.objects.select_for_update().filter(order=order).first()
    if payment and payment.status not in (
        PaymentStatus.CONFIRMED,
        PaymentStatus.CANCELLED,
    ):
        payment.status = PaymentStatus.CANCELLED
        payment.save(update_fields=["status", "updated_at"])

    return order


@transaction.atomic
def checkout_cart(user, *, delivery: dict) -> list[Order]:
    """
    Create one Order per store from the user's cart.

    Locks product rows (select_for_update) to prevent oversell / double checkout.
    Decrements stock only after all validations succeed.
    Clears the cart on success.
    """
    try:
        cart = Cart.objects.select_for_update().get(user=user)
    except Cart.DoesNotExist as exc:
        raise ValidationError({"detail": "Votre panier est vide."}) from exc

    items = list(
        cart.items.select_related("product", "product__store").all()
    )
    if not items:
        raise ValidationError({"detail": "Votre panier est vide."})

    product_ids = sorted({item.product_id for item in items})
    # Lock products in stable PK order to reduce deadlock risk
    products = {
        p.id: p
        for p in Product.objects.select_for_update()
        .select_related("store")
        .filter(id__in=product_ids)
        .order_by("id")
    }

    # Re-validate against locked rows
    for item in items:
        product = products.get(item.product_id)
        if product is None:
            raise ValidationError({"detail": f"Produit {item.product_id} introuvable."})
        assert_product_purchasable(product, item.quantity)

    # Group by store
    by_store: dict = defaultdict(list)
    for item in items:
        product = products[item.product_id]
        by_store[product.store_id].append((item, product))

    delivery_fields = {
        "delivery_name": delivery["delivery_name"],
        "delivery_phone": delivery["delivery_phone"],
        "delivery_address": delivery["delivery_address"],
        "delivery_city": delivery.get("delivery_city") or "",
        "delivery_notes": delivery.get("delivery_notes") or "",
    }

    orders: list[Order] = []
    for store_id, lines in by_store.items():
        store = lines[0][1].store
        order_items_data = []
        total = Decimal("0.00")
        for item, product in lines:
            unit = product.price
            subtotal = (unit * item.quantity).quantize(Decimal("0.01"))
            total += subtotal
            order_items_data.append(
                {
                    "product": product,
                    "product_name_snapshot": product.name,
                    "unit_price": unit,
                    "quantity": item.quantity,
                    "subtotal": subtotal,
                }
            )

        order = Order.objects.create(
            user=user,
            store=store,
            status=OrderStatus.PENDING,
            total_amount=total.quantize(Decimal("0.01")),
            store_name_snapshot=store.name,
            **delivery_fields,
        )
        OrderItem.objects.bulk_create(
            [
                OrderItem(order=order, **data)
                for data in order_items_data
            ]
        )
        orders.append(order)

        # Decrement stock for this store's products
        for item, product in lines:
            Product.objects.filter(pk=product.pk).update(stock=F("stock") - item.quantity)
            # Refresh and apply OUT_OF_STOCK if needed
            product.refresh_from_db()
            if product.stock == 0 and product.status == ProductStatus.ACTIVE:
                product.status = ProductStatus.OUT_OF_STOCK
                product.save(update_fields=["status", "updated_at"])
            elif product.stock < 0:
                # Should be unreachable after locks + checks
                raise ValidationError(
                    {"detail": f"Stock incohérent pour {product.name}."}
                )

    clear_cart(cart)
    # Re-fetch with items for serialization
    result = list(
        Order.objects.filter(id__in=[o.id for o in orders])
        .select_related("store", "user", "store__owner")
        .prefetch_related("items", "items__product")
        .order_by("created_at")
    )
    committed_ids = [o.id for o in result]

    def _notify_after_commit() -> None:
        from apps.notifications.services import notify_order_created

        for order in Order.objects.filter(id__in=committed_ids).select_related(
            "store", "store__owner"
        ):
            try:
                notify_order_created(order)
            except Exception:
                logger.exception("Order notification failed for %s", order.id)

    transaction.on_commit(_notify_after_commit)
    return result
