import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { backupDatabase, restoreDatabase } from '../scripts/sqlite-backup.mjs';

const roots: string[] = [];
const handles: Database.Database[] = [];
afterEach(() => {
  for (const db of handles.splice(0)) if (db.open) db.close();
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kipper-synthetic-backup-')); roots.push(root);
  const source = path.join(root, 'synthetic.sqlite');
  const db = new Database(source); handles.push(db);
  db.pragma('journal_mode = WAL'); db.pragma('wal_autocheckpoint = 0');
  db.exec(`CREATE TABLE bookings (id TEXT PRIMARY KEY, status TEXT, guest_json TEXT, stay_snapshot_json TEXT, hold_expires_at TEXT);
    CREATE TABLE settings (key TEXT PRIMARY KEY, value_json TEXT);
    CREATE TABLE blocks (id TEXT PRIMARY KEY, property_id TEXT, from_date TEXT, to_date TEXT);
    CREATE TABLE future_outbox (id TEXT PRIMARY KEY, payload TEXT);`);
  // Checkpoint the empty schema. All fixture data below must be read from WAL.
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.prepare('INSERT INTO bookings VALUES (?, ?, ?, ?, ?)').run('synthetic-1', 'pending_payment', JSON.stringify({ name: 'Synthetic Guest', email: 'test@example.invalid' }), JSON.stringify({ configurationId: 'synthetic-3br', bedrooms: 3, maxGuests: 8, cancellationPolicy: 'Synthetic terms only' }), '2099-01-01T12:00:00Z');
  db.prepare('INSERT INTO settings VALUES (?, ?)').run('pricing', JSON.stringify({ cleaningFeeCents: 18000, taxRate: 0.1275 }));
  db.prepare('INSERT INTO blocks VALUES (?, ?, ?, ?)').run('synthetic-block', 'synthetic-home', '2099-01-02', '2099-01-04');
  db.prepare('INSERT INTO future_outbox VALUES (?, ?)').run('synthetic-event', 'not a real notification');
  return { root, source, db, backup: path.join(root, 'backup.sqlite'), restored: path.join(root, 'restored.sqlite') };
}

describe('synthetic SQLite backup and restore', () => {
  it('preserves bookings, settings, immutable snapshots, holds and unknown future tables from uncheckpointed WAL', async () => {
    const f = fixture();
    expect(fs.statSync(`${f.source}-wal`).size).toBeGreaterThan(0);
    const result = await backupDatabase(f.source, f.backup);
    expect(result).toMatchObject({ operation: 'backup', tableCount: 4, integrity: 'ok' });
    // Source can continue changing; restore must represent the saved snapshot.
    f.db.prepare("UPDATE bookings SET status = 'confirmed'").run();
    expect(await restoreDatabase(f.backup, f.restored)).toMatchObject({ operation: 'restore', integrity: 'ok' });
    const restored = new Database(f.restored, { readonly: true }); handles.push(restored);
    const booking = restored.prepare('SELECT * FROM bookings').get() as Record<string, string>;
    expect(booking.status).toBe('pending_payment');
    expect(booking.hold_expires_at).toBe('2099-01-01T12:00:00Z');
    expect(JSON.parse(booking.stay_snapshot_json)).toMatchObject({ configurationId: 'synthetic-3br', maxGuests: 8 });
    expect(JSON.parse((restored.prepare('SELECT value_json FROM settings').get() as { value_json: string }).value_json).taxRate).toBe(0.1275);
    expect(restored.prepare('SELECT COUNT(*) AS n FROM blocks').get()).toEqual({ n: 1 });
    expect(restored.prepare('SELECT payload FROM future_outbox').get()).toEqual({ payload: 'not a real notification' });
    expect(restored.pragma('integrity_check', { simple: true })).toBe('ok');
    expect(fs.statSync(f.backup).mode & 0o777).toBe(0o600);
    expect(fs.readdirSync(f.root).filter(name => name.startsWith('.kipper-snapshot-'))).toEqual([]);
  });
  it('never includes an uncommitted transaction', async () => {
    const f = fixture(); f.db.exec('BEGIN');
    f.db.prepare("UPDATE bookings SET status = 'cancelled'").run();
    await backupDatabase(f.source, f.backup); f.db.exec('ROLLBACK');
    const saved = new Database(f.backup, { readonly: true }); handles.push(saved);
    expect(saved.prepare('SELECT status FROM bookings').get()).toEqual({ status: 'pending_payment' });
  });
  it('refuses missing, invalid, directory and symlink sources without creating destinations', async () => {
    const f = fixture();
    await expect(backupDatabase(path.join(f.root, 'missing'), f.backup)).rejects.toThrow();
    const invalid = path.join(f.root, 'invalid'); fs.writeFileSync(invalid, 'not a database');
    await expect(backupDatabase(invalid, f.backup)).rejects.toThrow('not a SQLite');
    await expect(backupDatabase(f.root, f.backup)).rejects.toThrow('regular SQLite');
    const alias = path.join(f.root, 'alias'); fs.symlinkSync(f.source, alias);
    await expect(backupDatabase(alias, f.backup)).rejects.toThrow('regular SQLite');
    expect(fs.existsSync(f.backup)).toBe(false);
  });
  it('refuses overwrite, source destinations, journal destinations and missing parent directories', async () => {
    const f = fixture(); await backupDatabase(f.source, f.backup);
    const before = fs.readFileSync(f.backup);
    await expect(backupDatabase(f.source, f.backup)).rejects.toThrow('already exists');
    await expect(restoreDatabase(f.backup, f.source)).rejects.toThrow('already exists');
    await expect(backupDatabase(f.source, f.source)).rejects.toThrow('different');
    await expect(backupDatabase(f.source, `${f.source}-journal`)).rejects.toThrow('journal');
    await expect(backupDatabase(f.source, path.join(f.root, 'missing', 'file.sqlite'))).rejects.toThrow();
    const link = path.join(f.root, 'dangling'); fs.symlinkSync('/does-not-exist', link);
    await expect(restoreDatabase(f.backup, link)).rejects.toThrow('already exists');
    expect(fs.readFileSync(f.backup)).toEqual(before);
  });
  it('publishes atomically without overwriting when two backups race for one destination', async () => {
    const f = fixture();
    const results = await Promise.allSettled([backupDatabase(f.source, f.backup), backupDatabase(f.source, f.backup)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    const saved = new Database(f.backup, { readonly: true }); handles.push(saved);
    expect(saved.pragma('integrity_check', { simple: true })).toBe('ok');
    expect(fs.readdirSync(f.root).filter(name => name.startsWith('.kipper-snapshot-'))).toEqual([]);
  });
  it('cleans staging and publishes nothing when the source is corrupt despite a SQLite header', async () => {
    const f = fixture();
    const corrupt = path.join(f.root, 'corrupt.sqlite');
    fs.writeFileSync(corrupt, Buffer.concat([Buffer.from('SQLite format 3\0'), Buffer.alloc(4096, 255)]));
    await expect(backupDatabase(corrupt, f.backup)).rejects.toThrow();
    expect(fs.existsSync(f.backup)).toBe(false);
    expect(fs.readdirSync(f.root).filter(name => name.startsWith('.kipper-snapshot-'))).toEqual([]);
  });

  it('supports the documented CLI without printing synthetic guest data', () => {
    const f = fixture();
    const backup = spawnSync(process.execPath, ['scripts/sqlite-backup.mjs', 'backup', f.source, f.backup], { encoding: 'utf8' });
    expect(backup.status, backup.stderr).toBe(0);
    expect(JSON.parse(backup.stdout)).toMatchObject({ operation: 'backup', integrity: 'ok' });
    expect(backup.stdout).not.toContain('Synthetic Guest');
    expect(backup.stdout).not.toContain('example.invalid');
    const restore = spawnSync(process.execPath, ['scripts/sqlite-backup.mjs', 'restore', f.backup, f.restored], { encoding: 'utf8' });
    expect(restore.status, restore.stderr).toBe(0);
    expect(JSON.parse(restore.stdout)).toMatchObject({ operation: 'restore', integrity: 'ok' });
    const overwrite = spawnSync(process.execPath, ['scripts/sqlite-backup.mjs', 'restore', f.backup, f.source], { encoding: 'utf8' });
    expect(overwrite.status).toBe(1);
    expect(overwrite.stderr).toContain('refusing to overwrite');
  });

});
