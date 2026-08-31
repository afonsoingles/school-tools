import importlib.util
import sys
import datetime
from pathlib import Path
from utils.database import Database
import sentry_sdk


MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "jobs" / "migrations"


def _discover_migrations() -> list[Path]:
    files = []
    for path in sorted(MIGRATIONS_DIR.glob("*.py")):
        if path.name.startswith("_"):
            continue
        files.append(path)
    return files


def _load_migration(path: Path):
    """Load a migration module and return (migration_id, migrate_fn)."""
    module_name = f"school_migrations.{path.stem}"

    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load migration module from {path}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)

    migration_id = getattr(module, "MIGRATION_ID", None)
    migrate_fn = getattr(module, "migrate", None)

    if not migration_id or not callable(migrate_fn):
        raise RuntimeError(
            f"Migration {path.name} must define a 'MIGRATION_ID' and a 'migrate()' function."
        )

    return migration_id, migrate_fn


def get_applied_migrations() -> set[str]:
    db = Database()
    applied = db.mongo.migrations.find({}, {"_id": 1})
    return {doc["_id"] for doc in applied}


def mark_applied(migration_id: str) -> None:
    db = Database()
    try:
        db.mongo.migrations.insert_one(
            {
                "_id": migration_id,
                "applied_at": datetime.datetime.now(datetime.timezone.utc),
            }
        )
    except Exception:
        # Already recorded (duplicate key), which is fine.
        pass


def run_migrations() -> list[str]:
    applied = get_applied_migrations()
    ran: list[str] = []

    for path in _discover_migrations():
        try:
            migration_id, migrate_fn = _load_migration(path)

            if migration_id in applied:
                print(f"[MIGRATIONS] Skipping {migration_id} (already applied)")
                continue

            print(f"[MIGRATIONS] Applying {migration_id}...")
            migrate_fn()
            mark_applied(migration_id)
            ran.append(migration_id)
            print(f"[MIGRATIONS] Applied {migration_id}")
        except Exception as e:
            sentry_sdk.capture_exception(e)
            print(f"[MIGRATIONS] Failed to apply migration {path.name}: {e}")
            quit(1)

    if not ran:
        print("[MIGRATIONS] Nothing to run, all migrations are up to date.")

    return ran