#!/bin/sh
set -eu

cd "$(dirname "$0")"

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "${SERVIS_SEED_CATALOG:-}" = "true" ]; then
  python manage.py seed_catalog
fi

# Plans d'abonnement + moyens de paiement SERVIS (idempotent).
# Ne bloque pas le démarrage si le seed échoue : la migration 0003 fait le même travail.
python manage.py seed_billing || echo "WARN: seed_billing a échoué" >&2

exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WEB_WORKERS:-2}" \
  --timeout 120
