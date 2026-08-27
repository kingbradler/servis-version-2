"""Quick live check of JWT HttpOnly cookie flow (stdlib only)."""

import json
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

jar = CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
base = "http://127.0.0.1:8002/api/v1"


def call(method: str, path: str, data=None, headers=None):
    body = None
    req_headers = {"Accept": "application/json"}
    if headers:
        req_headers.update(headers)
    if data is not None:
        body = json.dumps(data).encode()
        req_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(
        f"{base}{path}", data=body, headers=req_headers, method=method
    )
    try:
        with opener.open(req) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}, dict(resp.headers)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw}
        return exc.code, payload, dict(exc.headers)


def cookie_names():
    return [c.name for c in jar]


status, csrf_payload, _ = call("GET", "/auth/csrf/")
csrf = csrf_payload["csrfToken"]
print("csrf", status)

status, login_payload, _ = call(
    "POST",
    "/auth/login/",
    {"email": "jwt.step3@servis.ma", "password": "SecurePass123!"},
    {"X-CSRFToken": csrf},
)
print("login", status, "keys", list(login_payload.keys()))
print("cookies", cookie_names())
assert status == 200
assert "servis_access" in cookie_names()
assert "servis_refresh" in cookie_names()
assert "access" not in login_payload
assert "refresh" not in login_payload

status, me, _ = call("GET", "/auth/me/")
print("me", status, me.get("email"))
assert status == 200

status, csrf_payload, _ = call("GET", "/auth/csrf/")
csrf = csrf_payload["csrfToken"]
status, ref, _ = call("POST", "/auth/refresh/", {}, {"X-CSRFToken": csrf})
print("refresh", status, ref)

status, csrf_payload, _ = call("GET", "/auth/csrf/")
csrf = csrf_payload["csrfToken"]
status, out, _ = call("POST", "/auth/logout/", {}, {"X-CSRFToken": csrf})
print("logout", status, out)

status, me2, _ = call("GET", "/auth/me/")
print("me after logout", status)
assert status == 401
print("OK")
