"""HTTP checks for cities/categories APIs."""

import json
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

BASE = "http://127.0.0.1:8004/api/v1"


def session():
    jar = CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def call(opener, method, path, data=None, headers=None):
    h = {"Accept": "application/json"}
    if headers:
        h.update(headers)
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=body, headers=h, method=method)
    try:
        with opener.open(req) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {}
        return e.code, payload


def auth_register(opener, email, seller=False):
    csrf = call(opener, "GET", "/auth/csrf/")[1]["csrfToken"]
    path = "/auth/register/seller/" if seller else "/auth/register/"
    return call(
        opener,
        "POST",
        path,
        {
            "email": email,
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "first_name": "T",
            "last_name": "U",
        },
        {"X-CSRFToken": csrf},
    )


def auth_login(opener, email):
    csrf = call(opener, "GET", "/auth/csrf/")[1]["csrfToken"]
    return call(
        opener,
        "POST",
        "/auth/login/",
        {"email": email, "password": "SecurePass123!"},
        {"X-CSRFToken": csrf},
    )


anon = session()
print("GET cities", call(anon, "GET", "/cities/")[0], "count", len(call(anon, "GET", "/cities/")[1]))
print("GET categories", call(anon, "GET", "/categories/")[0], "roots", len(call(anon, "GET", "/categories/")[1]))

op_c = session()
print("CLIENT register", auth_register(op_c, "p31.client@servis.ma")[0])
csrf = call(op_c, "GET", "/auth/csrf/")[1]["csrfToken"]
print(
    "CLIENT admin categories",
    call(op_c, "POST", "/admin/categories/", {"name": "Hack"}, {"X-CSRFToken": csrf})[0],
)

op_s = session()
print("SELLER register", auth_register(op_s, "p31.seller@servis.ma", True)[0])
csrf = call(op_s, "GET", "/auth/csrf/")[1]["csrfToken"]
print(
    "SELLER admin categories",
    call(op_s, "POST", "/admin/categories/", {"name": "Hack"}, {"X-CSRFToken": csrf})[0],
)

op_a = session()
print("ADMIN login", auth_login(op_a, "perm.admin@servis.ma")[0])
csrf = call(op_a, "GET", "/auth/csrf/")[1]["csrfToken"]
print(
    "ADMIN create category",
    call(
        op_a,
        "POST",
        "/admin/categories/",
        {"name": "Test Phase31", "icon": "star", "order": 999},
        {"X-CSRFToken": csrf},
    )[0],
)

schema = call(session(), "GET", "/../schema/")  # wrong
# schema via absolute
req = urllib.request.Request(
    "http://127.0.0.1:8004/api/schema/", headers={"Accept": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
paths = [p for p in data.get("paths", {}) if "cities" in p or "categories" in p]
print("swagger paths", sorted(paths))
print("OK")
