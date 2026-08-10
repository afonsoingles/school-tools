import requests
import os
import re
import markdown
from pathlib import Path
import datetime

class Mailer:
    def _load_template(self, template, **vars):
        path = os.path.join("mailers", f"{template}.txt")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        return content.format(**vars)

    def _write_to_disk(self, payload):
        path = Path("tmp/emails")
        path.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d%H%M%S")
        safe_subject = re.sub(r"[^a-zA-Z0-9_-]+", "_", payload["subject"])[:50] or "no_subject"

        file = path / f"{timestamp}_{safe_subject}.html"
        file.write_text(payload["html"], encoding="utf-8")

        return



    def send_email(self, subject="", template=None, to=None, **vars):

        text = self._load_template(template, **vars)

        html = markdown.markdown(text, extensions=["extra", "sane_lists", "nl2br"])

        payload = {
            "subject": subject,
            "to": to,
            "html": html
        }
        if not os.environ.get("ENVIRONMENT") == "production":
            return self._write_to_disk(payload)
        
        return requests.post(
            f"https://api.eu.mailgun.net/v3/{os.environ.get('MAILGUN_DOMAIN')}/messages",
            auth=("api", os.environ.get("MAILGUN_API_KEY", "")),
            data={
                "from": f"{os.environ.get("EMAIL_SENDER_NAME", "School Tools")} <{os.environ.get("EMAIL_SENDER_FROM", "example@example.com")}>",
                "to": to,
                "subject": subject,
                "html": html,
            }
        ).json()