# School Tools — Public API (API keys)

This documents the **public-facing** School Tools API. It is the surface meant
for external integrations and is consumed with an **API key (`sk_...`)** through
the `Authorization: Bearer` header. Public (no-auth) endpoints are also listed
and are clearly marked.

- **Base URL (production):** `https://<your-host>/api/v1`
- **Content-Type:** `application/json`
- **Auth:** `Authorization: Bearer sk_...`

> Internal/account-management endpoints (web push, test-sheets stock, account
> deletions, API-key management) are NOT part of the public data API. They are
> listed in the [appendix](#appendix--account-and-internal-endpoints) for
> reference only.

---

## Quick start

API keys are created on the account and used to authenticate any user-data
endpoint. Creating a key requires a one-time session token (from the app's auth
endpoints); every call afterwards uses only the key.

```bash
# 1) Create a key (you need a session token for this one call)
curl -X POST https://<your-host>/api/v1/account/api-keys \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"reporting"}'
```

Response (`201`): `raw_key` is displayed **only once** — store it securely.

```json
{
  "success": true,
  "api_key": {
    "id": "3c8f...",
    "user_id": "b8a1...",
    "name": "reporting",
    "prefix": "sk_AbCdEf1234",
    "created_at": "2026-09-20T10:00:00Z",
    "last_used_at": null,
    "revoked": false
  },
  "raw_key": "sk_AbCdEf1234GhIjKlMnOpQrStUvWxYz..."
}
```

```bash
# 2) Use the key on any data endpoint
curl https://<your-host>/api/v1/evaluations \
  -H "Authorization: Bearer sk_AbCdEf1234GhIjKlMnOp..."
```

An API key authenticates as its owning account and inherits that account's
access (including admin/superadmin, if the account has those roles). It never
expires on its own.

---

## What an `sk_` key unlocks

Every endpoint below is authenticated with `Authorization: Bearer sk_...`.

| Area          | Endpoints                                             | Auth |
| ------------- | ----------------------------------------------------- | ---- |
| Subjects      | `GET/POST/PATCH/DELETE /v1/subjects*`                 | `sk_`|
| Classes       | `GET/POST/PATCH/DELETE /v1/classes*`                  | `sk_`|
| Evaluations   | `GET/POST/PATCH/DELETE /v1/evaluations*`              | `sk_`|
| Homework      | `GET/POST/PATCH/DELETE /v1/homework*`                 | `sk_`|
| Holidays      | `GET/PATCH /v1/holidays`, `POST/DELETE /v1/holidays/overrides*` | `sk_` |
| Calendar feed | `GET/POST /v1/calendar/feeds`, `POST /v1/calendar/feeds/status` | `sk_` |
| Notifications | `GET /v1/notifications`, `unread-count`, read/delete  | `sk_`|

**Public endpoints — no auth required:**

| Method | Path                                            | Returns |
| ------ | ----------------------------------------------- | ------- |
| GET    | `/v1/calendar/feeds/{type}/{token}?user=<uuid>` | `text/calendar` (`.ics`) |
| GET    | `/v1/notifications/vapid-key`                   | `{ "public_key": "..." }` |

---

## Conventions

### Response envelope

```json
{ "success": true, ... }
```

### Errors

Non-2xx status + consistent envelope:

```json
{
  "success": false,
  "code": "evaluation_not_found",
  "message": "This evaluation does not exist."
}
```

| Status | Code                        | Meaning                                |
| ------ | --------------------------- | -------------------------------------- |
| 401    | `invalid_or_expired_token`  | Missing / malformed / expired bearer   |
| 401    | `user_not_verified`         | Email not verified                     |
| 401    | `user_suspended`            | Account suspended                      |
| 403    | `user_not_admin` / `user_not_superadmin` | Insufficient role    |
| 429    | `rate_limit_exceeded`       | Too many requests (production, per IP) |

### Dates & times

- Datetimes (`created_at`, `due_date`, `pushed_at`, …) are ISO-8601 UTC with
  `Z` suffix: `2026-09-20T10:00:00Z`.
- Dates are `YYYY-MM-DD` (`valid_from`, holiday overrides, cancellations in
  responses). **Exception:** classes API *accepts* cancellation dates as
  `DD/MM/YYYY`.
- Times are 24h `HH:MM` strings (`09:00`, `18:30`).
- IDs are UUIDs; `scheduled_weekday` is `1` (Monday) … `7` (Sunday).

---

## Subjects

| Method | Path                            | Description                     |
| ------ | ------------------------------- | ------------------------------- |
| GET    | `/v1/subjects`                  | List subjects                   |
| POST   | `/v1/subjects`                  | Create a subject                |
| PATCH  | `/v1/subjects/{subject_id}`     | Rename / change icon / color    |
| DELETE | `/v1/subjects/{subject_id}`     | Delete a subject                |

`POST /v1/subjects`

```json
{ "name": "Mathematics", "icon": "Calculator", "color": "blue" }
```

- `name`: 3–50 chars. `icon`: any SubjectIcon value (`BookOpen`, `GraduationCap`,
  `Calculator`, `Atom`, `Globe`, `Code`, …). `color`: `blue`, `emerald`,
  `violet`, `amber`, `cyan`, `fuchsia`, `indigo`, `teal`, `rose`, `orange`,
  `lime`, `sky`.

`GET /v1/subjects`

```json
{
  "success": true,
  "subjects": [
    { "id": "3c8f...", "name": "Mathematics", "icon": "Calculator", "color": "blue" }
  ]
}
```

`PATCH /v1/subjects/{subject_id}` — at least one of:

```json
{ "new_name": "Maths", "new_icon": "Sigma", "new_color": "emerald" }
```

---

## Classes

Recurring classes bound to a subject, each with one or more schedules and
embedded cancellations.

| Method | Path                                                     | Description                          |
| ------ | -------------------------------------------------------- | ------------------------------------ |
| GET    | `/v1/classes`                                            | Schedule + cancellations + auto holiday offs |
| GET    | `/v1/classes/schedule`                                   | Classes only (legacy alias)          |
| POST   | `/v1/classes`                                            | Create a class                       |
| PATCH  | `/v1/classes/{class_id}`                                 | Change the class's subject           |
| DELETE | `/v1/classes/{class_id}`                                 | Delete a class                       |
| POST   | `/v1/classes/{class_id}/schedules`                       | Add a schedule                       |
| PATCH  | `/v1/classes/{class_id}/schedules/{schedule_id}`         | Reschedule (+ optional `valid_from`) |
| DELETE | `/v1/classes/{class_id}/schedules/{schedule_id}`         | Remove a schedule                    |
| POST   | `/v1/classes/{class_id}/cancel`                          | Cancel one class instance            |
| DELETE | `/v1/classes/{class_id}/cancellations/{cancellation_id}` | Undo a cancellation                  |
| POST   | `/v1/classes/cancel-day`                                 | Cancel a whole day                   |
| DELETE | `/v1/classes/cancel-day/{day_cancel_id}`                 | Undo a day cancellation              |

`POST /v1/classes`

```json
{
  "subject_id": "3c8f...",
  "schedules": [
    { "scheduled_weekday": 1, "start_time": "09:00", "end_time": "10:30" },
    { "scheduled_weekday": 3, "start_time": "14:00", "end_time": "15:30" }
  ]
}
```

`GET /v1/classes`

```json
{
  "success": true,
  "classes": [
    {
      "id": "7d12...",
      "subject_id": "3c8f...",
      "schedules": [
        {
          "id": "ab91...",
          "chain_id": "ab91...",
          "scheduled_weekday": 1,
          "start_time": "09:00",
          "end_time": "10:30",
          "valid_from": "2026-09-01",
          "valid_until": null
        }
      ],
      "cancellations": [
        { "id": "ff00...", "date": "2026-10-05", "reason": "public_holiday", "note": null }
      ]
    }
  ],
  "day_cancellations": [
    { "id": "ee11...", "date": "2026-12-24", "reason": "break", "note": null }
  ],
  "auto_holiday_offs": ["2026-12-25", "2026-12-31"]
}
```

`auto_holiday_offs` = auto-detected public holidays (from the account's country)
on class days for the next 12 months.

`PATCH /v1/classes/{class_id}` → `{ "subject_id": "..." }`

`PATCH /v1/classes/{class_id}/schedules/{schedule_id}` — `date` is optional
(`DD/MM/YYYY`, sets `valid_from` so the change applies from that date):

```json
{
  "scheduled_weekday": 2,
  "start_time": "10:00",
  "end_time": "11:30",
  "date": "15/09/2026"
}
```

`POST /v1/classes/{class_id}/cancel`

```json
{ "date": "05/10/2026", "reason": "other", "note": "Teacher unavailable" }
```

- `reason`: `break` | `public_holiday` | `other` (`note` required for `other`).
- Response: `{ "success": true, "cancellation": { "id", "date", "reason", "note" } }`

`POST /v1/classes/cancel-day` → `{ "date": "DD/MM/YYYY", "reason", "note"? }`
replies with `day_cancellation`.

---

## Evaluations

| Method | Path                              | Description            |
| ------ | --------------------------------- | ---------------------- |
| GET    | `/v1/evaluations`                 | List evaluations (with grades) |
| POST   | `/v1/evaluations`                 | Create an evaluation   |
| PATCH  | `/v1/evaluations/{evaluation_id}` | Set/clear the grade    |
| DELETE | `/v1/evaluations/{evaluation_id}` | Delete an evaluation   |

`POST /v1/evaluations`

```json
{ "class_id": "7d12...", "type": "exam", "date": "2026-10-05", "grade": 82 }
```

- `type`: `exam` | `quiz` | `other`.
- `date`: ISO-8601 datetime (normalized to midnight in the account's timezone).
  Must fall on a day the class meets and must not be a cancelled day.
- `grade` (optional): integer `0`–`100`.

`GET /v1/evaluations`

```json
{
  "success": true,
  "evaluations": [
    { "id": "0a1b...", "class_id": "7d12...", "date": "2026-10-05T00:00:00", "type": "exam", "grade": 82 }
  ]
}
```

`PATCH /v1/evaluations/{evaluation_id}` — set a grade, or `{ "grade": null }` to
clear it.

---

## Homework

| Method | Path                            | Description     |
| ------ | ------------------------------- | --------------- |
| GET    | `/v1/homework`                  | List homework   |
| POST   | `/v1/homework`                  | Create homework |
| PATCH  | `/v1/homework/{homework_id}`    | Update fields   |
| DELETE | `/v1/homework/{homework_id}`    | Delete homework |

`POST /v1/homework`

```json
{
  "subject_id": "3c8f...",
  "title": "Exercises 1-5",
  "description": "Pages 40-45",
  "due_date": "2026-09-25T18:00:00"
}
```

- `title`: 1–70 chars. `description`: 1–1500 chars.
- `due_date`: future ISO-8601 datetime, interpreted in the account's timezone.

`GET /v1/homework`

```json
{
  "success": true,
  "homework": [
    {
      "id": "91ab...",
      "subject_id": "3c8f...",
      "title": "Exercises 1-5",
      "description": "Pages 40-45",
      "status": "not_started",
      "due_date": "2026-09-25T18:00:00Z"
    }
  ]
}
```

`PATCH /v1/homework/{homework_id}` — any subset of
`due_date`, `status`, `title`, `description`, `subject_id`.
`status`: `not_started` | `ongoing` | `finished`.

---

## Holidays

Automatic public-holiday cancellation plus per-date overrides.

| Method | Path                             | Description                     |
| ------ | -------------------------------- | ------------------------------- |
| GET    | `/v1/holidays`                   | Settings + overrides + country  |
| PATCH  | `/v1/holidays`                   | Enable/disable auto-cancel      |
| POST   | `/v1/holidays/overrides`         | Add a date override             |
| DELETE | `/v1/holidays/overrides/{date}`  | Remove a date override          |

`GET /v1/holidays`

```json
{
  "success": true,
  "auto_cancel_enabled": true,
  "overrides": ["2026-10-15"],
  "country": "PT"
}
```

`PATCH /v1/holidays` → `{ "auto_cancel_enabled": true }` (requires a known
country). `POST /v1/holidays/overrides` → `{ "date": "2026-10-15" }`
(`YYYY-MM-DD`). Both return the same shape as `GET`.

---

## Calendar feeds (ICS subscriptions)

Private calendar subscriptions (`.ics`) for classes and evaluations. Feed URLs
are **public token URLs** — share with calendars/consumers; anyone with the URL
can read the feed.

| Method | Path                                   | Description                     |
| ------ | -------------------------------------- | ------------------------------- |
| GET    | `/v1/calendar/feeds`                   | List feed URLs (create tokens on first call) |
| POST   | `/v1/calendar/feeds`                   | Regenerate tokens (old URLs die) |
| POST   | `/v1/calendar/feeds/status`            | Enable/disable feeds            |
| GET    | `/v1/calendar/feeds/{type}/{token}?user=<uuid>` | **Public** — download `.ics` |

`GET /v1/calendar/feeds`

```json
{
  "success": true,
  "feeds": {
    "classes": "https://<your-host>/api/v1/calendar/feeds/classes/AbCdEf...?user=b8a1...",
    "evaluations": "https://<your-host>/api/v1/calendar/feeds/evaluations/GhIjKl...?user=b8a1..."
  }
}
```

Public download: `GET /v1/calendar/feeds/{type}/{token}?user=<uuid>` →
`text/calendar` (`attachment; filename=...ics`). If the feed hasn't been
generated yet, it is generated on demand (may take a few seconds).

`POST /v1/calendar/feeds/status` → `{ "is_enabled": true }`

---

## Notifications (in-app)

In-app notification inbox. (Web-push subscription management is not part of the
public data API — see the appendix.)

| Method | Path                                        | Description              |
| ------ | ------------------------------------------- | ------------------------ |
| GET    | `/v1/notifications`                         | List (`?limit=`, max 100)|
| GET    | `/v1/notifications/unread-count`            | Unread count             |
| PATCH  | `/v1/notifications/{notification_id}/read`  | Mark one as read         |
| POST   | `/v1/notifications/read-all`                | Mark all as read         |
| DELETE | `/v1/notifications/{notification_id}`       | Delete one               |

`GET /v1/notifications`

```json
{
  "success": true,
  "notifications": [
    {
      "id": "0b1c...",
      "user_id": "b8a1...",
      "type": "evaluation",
      "title": "Exam tomorrow",
      "body": "Maths — Final exam on 2026-10-05",
      "deep_link": "/evaluations",
      "read": false,
      "created_at": "2026-09-20T09:00:00Z",
      "pushed_at": null
    }
  ]
}
```

`type`: `evaluation`, `homework`, `holiday`, `cancelled_class`, `admin`,
`test_sheet_stock`, `test_sheet_reconcile`, `deletion`.

---

## Appendix — account and internal endpoints

Not part of the public data API (internal to the app; some require a session
token). Documented here for reference.

| Method | Path                                        | Auth | Description                       |
| ------ | ------------------------------------------- | ---- | --------------------------------- |
| POST   | `/v1/account/api-keys`                      | session | Create a key (see Quick start) |
| GET    | `/v1/account/api-keys`                      | `sk_`/session | List keys                     |
| DELETE | `/v1/account/api-keys/{key_id}`             | `sk_`/session | Revoke a key                  |
| GET    | `/v1/notifications/settings`                | `sk_`| Notifications on/off flag     |
| PATCH  | `/v1/notifications/settings`                | `sk_`| Toggle notifications             |
| POST   | `/v1/notifications/subscribe`               | `sk_`| Register a web-push device    |
| GET    | `/v1/notifications/subscriptions`           | `sk_`| List push devices            |
| PATCH  | `/v1/notifications/subscriptions`           | `sk_`| Pause/resume a device        |
| POST   | `/v1/notifications/unsubscribe`             | `sk_`| Remove a device              |
| GET    | `/v1/notifications/vapid-key`               | public | VAPID public key             |
| GET    | `/v1/test-sheets`                           | `sk_`| Test-sheet stock + pending   |
| PATCH  | `/v1/test-sheets/stock`                     | `sk_`| Add/remove sheets            |
| POST   | `/v1/test-sheets/reconcile`                 | `sk_`| Reconcile an evaluation      |
| GET    | `/v1/deletions/me`                          | `sk_`| Current deletion request     |
| POST   | `/v1/deletions/request`                     | `sk_`| Request account deletion     |

---

## Examples

Create an evaluation with an API key:

```bash
curl -X POST https://<your-host>/api/v1/evaluations \
  -H "Authorization: Bearer sk_AbCdEf1234GhIjKlMnOp..." \
  -H "Content-Type: application/json" \
  -d '{"class_id":"7d12...","type":"quiz","date":"2026-10-05","grade":88}'
```

Pull the current schedule:

```bash
curl https://<your-host>/api/v1/classes \
  -H "Authorization: Bearer sk_AbCdEf1234GhIjKlMnOp..."
```

Subscribe a calendar to the ICS feed (no auth, token URL):

```
https://<your-host>/api/v1/calendar/feeds/classes/AbCdEf...?user=b8a1...
```