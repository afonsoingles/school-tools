from pywebpush import webpush
from base64 import urlsafe_b64decode
import os
import json


def log_vapid_config() -> None:
    """Validate and log the VAPID public key configuration at startup."""
    public_key = os.environ.get("VAPID_PUBLIC_KEY")
    if not public_key:
        print("[VAPID] VAPID_PUBLIC_KEY not set - push sending disabled")
        return
    try:
        padded = public_key + "=" * ((4 - len(public_key) % 4) % 4)
        raw = urlsafe_b64decode(padded)
        ok = len(raw) == 65 and raw[0] == 0x04
        print(
            f"[VAPID] public key: {len(raw)} bytes, first byte {hex(raw[0]) if raw else '?'} "
            + ("(VALID P-256)" if ok else "(MALFORMED!)")
        )
    except Exception as err:
        print(f"[VAPID] public key decode error: {err}")


class VapidHelper:
    def __init__(self) -> None:
        self.public_key = os.environ.get("VAPID_PUBLIC_KEY")
        self.private_key = os.environ.get("VAPID_PRIVATE_KEY")
        self.subject = os.environ.get("VAPID_SUBJECT", "mailto:hi@afonsoingles.dev")

    def send(self, endpoint: str, p256dh: str, auth: str, title: str, body: str, url: str | None = None) -> bool:
        if not self.public_key or not self.private_key:
            return False
        notification = {
            "title": title,
            "body": body,
            "icon": "/logo.png",
            "badge": "/logo.png",
        }
        if url:
            notification["url"] = url
        payload = json.dumps(notification)
        webpush(
            subscription_info={
                "endpoint": endpoint,
                "keys": {"p256dh": p256dh, "auth": auth},
            },
            data=payload,
            vapid_private_key=self.private_key,
            vapid_claims={"sub": self.subject},
            ttl=3600,
        )
        return True


def make_vapid_helper() -> VapidHelper:
    return VapidHelper()