"""Visibility ranking helpers — boost/plan are orthogonal to reputation."""

from __future__ import annotations

from django.db.models import Exists, OuterRef, Q
from django.utils import timezone

from apps.billing.models import Boost, BoostStatus, BoostTargetType


def active_boost_exists_subquery(target_type: str, *, pk_field="pk"):
    now = timezone.now()
    return Boost.objects.filter(
        target_type=target_type,
        target_id=OuterRef(pk_field),
        status=BoostStatus.ACTIVE,
    ).filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now)).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=now)
    )


def annotate_is_boosted(queryset, target_type: str):
    return queryset.annotate(
        is_boosted=Exists(active_boost_exists_subquery(target_type))
    )
