"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useOptionalCart } from "@/providers/cart-provider";

export function AddToCartButton({
  productId,
  disabled,
  className,
}: {
  productId: string;
  disabled?: boolean;
  className?: string;
}) {
  const cart = useOptionalCart();
  const { toast, toastError } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const handleAdd = async () => {
    if (!cart || cart.authLoading) return;

    if (!cart.isAuthenticated) {
      setLoginOpen(true);
      return;
    }

    setLoading(true);
    try {
      await cart.addItem(productId, 1);
      toast({
        title: "Ajouté au panier",
        description: "Le produit a été ajouté à votre panier.",
        variant: "success",
      });
    } catch (err) {
      toastError(err, {
        title: "Ajout au panier impossible",
        fallback: "Une erreur est survenue. Réessayez.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        className={className}
        loading={loading}
        disabled={disabled || loading || cart?.authLoading}
        onClick={() => void handleAdd()}
      >
        Ajouter au panier
      </Button>

      <Modal open={loginOpen} onOpenChange={setLoginOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Connexion requise</ModalTitle>
            <ModalDescription>
              Connectez-vous pour ajouter ce produit à votre panier. Vous
              reviendrez ensuite sur cette page.
            </ModalDescription>
          </ModalHeader>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setLoginOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setLoginOpen(false);
                router.push(
                  `/login?next=${encodeURIComponent(pathname || "/")}`
                );
              }}
            >
              Se connecter
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}
