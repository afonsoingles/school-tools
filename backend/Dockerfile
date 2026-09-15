FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder
WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev --no-editable

FROM python:3.13-slim AS runner
WORKDIR /app


ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY --from=builder --chown=backend:backend /app/.venv ./.venv
COPY --chown=backend:backend . .
COPY --chown=backend:backend .env ./.env

EXPOSE 8000

CMD ["sh", "-c", "set -a && . ./.env && set +a && exec uvicorn main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips=\"$FORWARDED_ALLOW_IPS\""]