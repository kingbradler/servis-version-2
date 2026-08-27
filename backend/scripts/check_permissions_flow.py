"""Manual HTTP verification of role gates (stdlib)."""

import json
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

BASE = "http://127.0.0.1:8003/api/v1"


def session():
    jar = CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar)), jar


def call(opener, method, path, data=None, headers=None):
    req_headers = {"Accept": "application/json"}
    if headers:
        req_headers.update(headers)
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        req_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(
        f"{BASE}{path}", data=body, headers=req_headers, method=method
    )
    try:
        with opener.open(req) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {}
        return exc.code, payload


def csrf(opener):
    return call(opener, "GET", "/auth/csrf/")[1]["csrfToken"]


def register(opener, email, seller=False):
    token = csrf(opener)
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
        {"X-CSRFToken": token},
    )


def login(opener, email):
    token = csrf(opener)
    return call(
        opener,
        "POST",
        "/auth/login/",
        {"email": email, "password": "SecurePass123!"},
        {"X-CSRFToken": token},
    )


print("Anonymous me", call(session()[0], "GET", "/auth/me/")[0])
print("Anonymous logout", call(session()[0], "POST", "/auth/logout/", {})[0])
print("Anonymous seller", call(session()[0], "GET", "/auth/access/seller/")[0])

op_c, _ = session()
print("Client register", register(op_c, "perm3.client@servis.ma")[0])
print("Client seller", call(op_c, "GET", "/auth/access/seller/")[0])
print("Client admin", call(op_c, "GET", "/auth/access/admin/")[0])
print("Client auth", call(op_c, "GET", "/auth/access/authenticated/")[0])
print(
    "Client me email",
    call(op_c, "GET", "/auth/me/?user_id=00000000-0000-0000-0000-000000000099")[1].get(
        "email"
    ),
)

op_s, _ = session()
print("Seller register", register(op_s, "perm3.seller@servis.ma", True)[0])
print("Seller seller", call(op_s, "GET", "/auth/access/seller/")[0])
print("Seller admin", call(op_s, "GET", "/auth/access/admin/")[0])

op_a, _ = session()
print("Admin login", login(op_a, "perm.admin@servis.ma")[0])
print("Admin admin", call(op_a, "GET", "/auth/access/admin/")[0])
print("Admin seller_or_admin", call(op_a, "GET", "/auth/access/seller-or-admin/")[0])
print("OK")
