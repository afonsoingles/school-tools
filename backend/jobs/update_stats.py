import sentry_sdk
from tools.stats import StatisticTools

def update_statistics():
    print("[STATS UPDATER] Started updating statistics...")
    tools = StatisticTools()

    user_stats = tools.get_user_stats(force_refresh=True)

    sentry_sdk.metrics.gauge("stats.users.total", user_stats.total)
    sentry_sdk.metrics.gauge("stats.users.verified", user_stats.verified)
    sentry_sdk.metrics.gauge("stats.users.unverified", user_stats.unverified)
    sentry_sdk.metrics.gauge("stats.users.active", user_stats.active)
    sentry_sdk.metrics.gauge("stats.users.inactive", user_stats.inactive)
    sentry_sdk.metrics.gauge("stats.users.new_7d", user_stats.new_7d)
    sentry_sdk.metrics.gauge("stats.users.new_30d", user_stats.new_30d)

    print("[STATS UPDATER] Finished updating user statistics.")

    adoption_stats = tools.get_adoption_stats(force_refresh=True)

    sentry_sdk.metrics.gauge("stats.adoption.homework", adoption_stats.homework)
    sentry_sdk.metrics.gauge("stats.adoption.evaluations", adoption_stats.evaluations)
    sentry_sdk.metrics.gauge("stats.adoption.subjects", adoption_stats.subjects)
    sentry_sdk.metrics.gauge("stats.adoption.classes", adoption_stats.classes)
    sentry_sdk.metrics.gauge("stats.adoption.cancellations", adoption_stats.cancellations)
    sentry_sdk.metrics.gauge("stats.adoption.ics", adoption_stats.ics)

    print("[STATS UPDATER] Finished updating adoption statistics.")

    functionality_stats = tools.get_functionality_stats(force_refresh=True)

    sentry_sdk.metrics.gauge("stats.functionality.homework", functionality_stats.homework)
    sentry_sdk.metrics.gauge("stats.functionality.evaluations", functionality_stats.evaluations)
    sentry_sdk.metrics.gauge("stats.functionality.subjects", functionality_stats.subjects)
    sentry_sdk.metrics.gauge("stats.functionality.classes", functionality_stats.classes)
    sentry_sdk.metrics.gauge("stats.functionality.cancellations", functionality_stats.cancellations)

    print("[STATS UPDATER] Finished updating functionality statistics.")
    print("[STATS UPDATER] All done!")
    return