from tools.deletions import DeletionTools
import sentry_sdk


deletion_tools = DeletionTools()


def run_deletion_maintenance() -> None:
    print("[DELETIONS] Running scheduled maintenance...")
    try:
        purged = deletion_tools.process_daily_purges()
    except Exception as err:
        sentry_sdk.capture_exception(err)
        purged = 0

    try:
        nominated = deletion_tools.auto_nominate_unverified()
    except Exception as err:
        sentry_sdk.capture_exception(err)
        nominated = 0

    print(f"[DELETIONS] Maintenance finished. Purged {purged}, nominated {nominated}.")
    return
