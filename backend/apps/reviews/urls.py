"""Review URL routes — additive under /api/v1/reviews/."""

from django.urls import path

from apps.reviews.views import (
    AdminProductReviewHideView,
    AdminReviewHideView,
    EligibleProductReviewItemsView,
    EligibleReviewRequestsView,
    MyProductReviewsListView,
    MyReviewsListView,
    ProductReviewCreateView,
    ProductReviewListView,
    ProductReviewSummaryView,
    ProfessionalReviewListView,
    ProfessionalReviewSummaryView,
    ReviewCreateView,
)

urlpatterns = [
    path("", ReviewCreateView.as_view(), name="review-create"),
    path("me/", MyReviewsListView.as_view(), name="review-me"),
    path(
        "eligible/",
        EligibleReviewRequestsView.as_view(),
        name="review-eligible",
    ),
    path(
        "professionals/<slug:slug>/",
        ProfessionalReviewListView.as_view(),
        name="review-professional-list",
    ),
    path(
        "professionals/<slug:slug>/summary/",
        ProfessionalReviewSummaryView.as_view(),
        name="review-professional-summary",
    ),
    path(
        "admin/<uuid:review_id>/visibility/",
        AdminReviewHideView.as_view(),
        name="review-admin-visibility",
    ),
    # Product reviews
    path(
        "products/",
        ProductReviewCreateView.as_view(),
        name="product-review-create",
    ),
    path(
        "products/me/",
        MyProductReviewsListView.as_view(),
        name="product-review-me",
    ),
    path(
        "products/eligible/",
        EligibleProductReviewItemsView.as_view(),
        name="product-review-eligible",
    ),
    path(
        "products/<slug:store_slug>/<slug:product_slug>/",
        ProductReviewListView.as_view(),
        name="product-review-list",
    ),
    path(
        "products/<slug:store_slug>/<slug:product_slug>/summary/",
        ProductReviewSummaryView.as_view(),
        name="product-review-summary",
    ),
    path(
        "admin/products/<uuid:review_id>/visibility/",
        AdminProductReviewHideView.as_view(),
        name="product-review-admin-visibility",
    ),
]
