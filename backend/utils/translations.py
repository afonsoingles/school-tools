import datetime

# Notification text translations. Kept dependency-free so jobs can render text
# in the recipient's locale at creation time.

_STRINGS: dict[str, dict[str, str]] = {
    "eval_exam": {"pt": "Exame", "en": "Exam"},
    "eval_quiz": {"pt": "Ficha", "en": "Quiz"},
    "eval_other": {"pt": "Avaliação", "en": "Evaluation"},
    "eval_title": {"pt": "Avaliação amanhã", "en": "Evaluation tomorrow"},
    "eval_body": {
        "pt": "{type} de {subject} amanhã ({date}).",
        "en": "{type} in {subject} tomorrow ({date}).",
    },
    "hw_title_24h": {"pt": "Trabalho de casa", "en": "Homework due"},
    "hw_title_12h": {"pt": "Trabalho de casa", "en": "Homework due soon"},
    "hw_title_1h": {"pt": "Trabalho de casa", "en": "Homework due very soon"},
    "hw_body": {
        "pt": "\"{title}\" de {subject} entrega {when}.",
        "en": "\"{title}\" for {subject} is due {when}.",
    },
    "when_24h": {"pt": "em 24 horas", "en": "in 24 hours"},
    "when_12h": {"pt": "em 12 horas", "en": "in 12 hours"},
    "when_1h": {"pt": "dentro de 1 hora", "en": "within 1 hour"},
    "hw_overdue_title": {"pt": "Trabalho de casa atrasado", "en": "Homework overdue"},
    "hw_overdue_body": {
        "pt": "\"{title}\" de {subject} está atrasado.",
        "en": "\"{title}\" for {subject} is overdue.",
    },
    "holiday_title": {"pt": "Feriado", "en": "Public holiday"},
    "holiday_body": {"pt": "Hoje é feriado! Não há aulas.", "en": "Today is a holiday! No school today."},
    "cancelled_title": {"pt": "Aula cancelada", "en": "Class cancelled"},
    "cancelled_body": {
        "pt": "A aula de {subject} de hoje foi cancelada.",
        "en": "Today's {subject} class has been cancelled.",
    },
    "sheet_stock_title": {"pt": "Folhas de teste em falta", "en": "Test sheets running low"},
    "sheet_stock_body": {
        "pt": "Só tens {total} folhas de teste ({lined} lisas, {graph} quadriculadas). Adiciona mais nas definições.",
        "en": "You only have {total} test sheets left ({lined} lined, {graph} graph). Add more in your settings.",
    },
    "sheet_reconcile_title": {"pt": "Regular folhas de teste", "en": "Reconcile test sheets"},
    "sheet_reconcile_body": {
        "pt": "Tens {count} avaliação(ões) por regular. Atualiza o teu stock de folhas de teste.",
        "en": "You have {count} assessment(s) to reconcile. Update your test sheet stock.",
    },
    "deletion_title": {"pt": "Pedido de eliminação de conta", "en": "Account deletion request"},
}


def _pick(key: str, locale: str) -> str:
    entry = _STRINGS.get(key, {})
    return entry.get(locale) or entry.get("en") or key


def evaluation_type_label(eval_type: str, locale: str) -> str:
    return _pick(f"eval_{eval_type}", locale)


def _format_date(date: datetime.date, locale: str) -> str:
    if locale == "pt":
        return date.strftime("%d/%m/%Y")
    return date.strftime("%Y-%m-%d")


def evaluation_reminder(locale: str, eval_type: str, subject: str, date: datetime.date) -> tuple[str, str]:
    return (
        _pick("eval_title", locale),
        _pick("eval_body", locale).format(
            type=evaluation_type_label(eval_type, locale),
            subject=subject,
            date=_format_date(date, locale),
        ),
    )


def homework_reminder(locale: str, window: str, subject: str, title: str) -> tuple[str, str]:
    return (
        _pick(f"hw_title_{window}", locale),
        _pick("hw_body", locale).format(
            title=title,
            subject=subject,
            when=_pick(f"when_{window}", locale),
        ),
    )


def homework_overdue(locale: str, subject: str, title: str) -> tuple[str, str]:
    return (
        _pick("hw_overdue_title", locale),
        _pick("hw_overdue_body", locale).format(title=title, subject=subject),
    )


def holiday(locale: str) -> tuple[str, str]:
    return (_pick("holiday_title", locale), _pick("holiday_body", locale))


def cancelled_class(locale: str, subject: str) -> tuple[str, str]:
    return (
        _pick("cancelled_title", locale),
        _pick("cancelled_body", locale).format(subject=subject),
    )


def test_sheet_stock_low(locale: str, total: int, lined: int, graph: int) -> tuple[str, str]:
    return (
        _pick("sheet_stock_title", locale),
        _pick("sheet_stock_body", locale).format(total=total, lined=lined, graph=graph),
    )


def test_sheet_reconcile(locale: str, count: int) -> tuple[str, str]:
    return (
        _pick("sheet_reconcile_title", locale),
        _pick("sheet_reconcile_body", locale).format(count=count),
    )