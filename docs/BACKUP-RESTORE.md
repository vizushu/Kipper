# SQLite backup and restore — single-instance MVP

## Scope and operating boundary

`scripts/sqlite-backup.mjs` creates a complete SQLite snapshot using **better-sqlite3’s online backup API**, then validates the resulting database with `PRAGMA integrity_check`. It preserves all tables and indexes automatically, including future outbox tables; it does not depend on a list of known application tables.

This increment was verified with synthetic temporary databases only. It has not backed up, restored, read, or modified a production database. No backup provider, schedule, account, offsite copy, or paid service is configured.

The current SQLite app must run as a single writable instance on a persistent filesystem. These commands do not make ephemeral storage durable or make SQLite safe for multiple independent replicas.

## Backup command

Run from the repository root with Node and the installed dependencies. Choose an existing private backup directory on a filesystem that supports hard links:

```sh
mkdir -p /private/path/kipper-backups
chmod 700 /private/path/kipper-backups
node scripts/sqlite-backup.mjs backup \
  /absolute/path/to/bookings.db \
  /private/path/kipper-backups/bookings-YYYYMMDD-HHMMSS.sqlite
```

Use a **new, unique destination for every run**. Replace the placeholders deliberately; no database path is inferred. Success prints only the destination path, byte count, table count, operation and `integrity: "ok"`—not guest rows or secrets. Failure exits nonzero. Treat missing success/integrity confirmation as a failed backup, not a usable recovery point.

The source may remain open in WAL mode. Committed rows still in the `-wal` file are included; uncommitted transactions are excluded. Do **not** use `cp bookings.db` against a running database: that can omit committed WAL data. Backup under sustained writes can take longer; monitor completion rather than assuming a fixed duration.

The tool stages its snapshot in a private `0700` directory, validates it, sets the file to `0600`, synchronizes file contents, then publishes it using an atomic no-overwrite hard link. It refuses existing destinations (including dangling symlinks), identical paths, source-journal targets and nonregular/symlink sources. Staging files are cleaned after normal success or failure. A process killed abruptly may leave a `.kipper-snapshot-*` directory; inspect and remove only that orphaned staging directory after confirming no backup process owns it. Never delete active database/WAL/SHM files.

Backup files contain guest information and booking access material. Restrict access, keep them outside public/static/site directories, and use appropriately secured storage. `0600` is an access restriction, **not encryption**. An authorized retention policy, secure offsite copy and periodic recovery drill are still required before production launch. Local backups alone do not survive loss of the host or disk. This script does not delete old backups.

## Restore verification (never in place)

Restore into a **different, nonexistent path**, not the running app database:

```sh
node scripts/sqlite-backup.mjs restore \
  /private/path/kipper-backups/bookings-YYYYMMDD-HHMMSS.sqlite \
  /private/path/kipper-backups/verified-restore-YYYYMMDD-HHMMSS.sqlite
```

Restore also uses the SQLite backup API and integrity checking. It does not launch the application, change `SQLITE_PATH`, send notifications, process an outbox, or enable payments. Opening an old backup does not extend expired holds or refresh external inventory.

Before any separately authorized production recovery:
1. Identify the correct recovery point and the potential data-loss interval. Keep the original database and its journal files intact.
2. Stop the application and every worker/writer before switching database paths. Do not rename a new file over an open SQLite connection.
3. Verify the restored schema, settings, bookings, immutable stay/price terms and hold timestamps in an isolated environment. Keep payments, guest messages and outbound workers disabled.
4. Reconcile bookings and payments that may have occurred after the snapshot with authoritative provider records. Check stale holds, external calendar blocks and outbox delivery state; do not blindly replay notifications or payment operations.
5. Only after owner approval, update the application’s `SQLITE_PATH` to the verified restored file, retaining the old files for rollback. Recheck launch guards and single-instance deployment settings before reopening traffic.

An integrity check validates SQLite structure; it is not proof of business correctness or payment reconciliation. Recovery and retention decisions remain operator-owned.

## Synthetic verification

```sh
npm test -- tests/backup-restore.test.ts
```

Tests create temporary synthetic WAL databases and clean them up. They prove that committed but uncheckpointed bookings/settings/snapshots/holds, blocks and an unknown future table survive backup and restore; post-backup changes do not alter the saved recovery point; uncommitted transactions are excluded; file permissions restrict access; invalid/corrupt sources fail closed; destinations are never overwritten, including concurrent publication races; and staging is cleaned after success/failure.
