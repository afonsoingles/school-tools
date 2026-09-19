from utils.tz_countries import TZ_TO_COUNTRY

# Countries whose users speak Portuguese (uses pt-PT everywhere).
PT_COUNTRIES = {"PT", "BR", "AO", "MZ", "CV", "GW", "ST", "TL"}


def locale_for_timezone(timezone: str | None) -> str:
    if not timezone:
        return "en"
    country = TZ_TO_COUNTRY.get(timezone)
    if country in PT_COUNTRIES:
        return "pt"
    return "en"