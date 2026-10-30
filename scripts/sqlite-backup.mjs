#!/usr/bin/env node
/** Local SQLite online snapshots. No credentials, providers, or automatic restore. */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function validatePaths(source, destination) {
  if (typeof source !== 'string' || !source.trim() || typeof destination !== 'string' || !destination.trim()) {
    throw new Error('Explicit source and destination file paths are required.');
  }
  const sourcePath = path.resolve(source);
  const destinationPath = path.resolve(destination);
  if (sourcePath === destinationPath) throw new Error('Source and destination must be different files.');
  const sourceStat = fs.lstatSync(sourcePath);
  if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) throw new Error('Source must be a regular SQLite file, not a symlink or directory.');
  // lstat detects dangling links too: no existing destination is ever replaced.
  try { fs.lstatSync(destinationPath); throw new Error('Destination already exists; refusing to overwrite.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const destinationDirectory = fs.realpathSync(path.dirname(destinationPath));
  if (!fs.statSync(destinationDirectory).isDirectory()) throw new Error('Destination parent must be an existing directory.');
  const resolvedDestination = path.join(destinationDirectory, path.basename(destinationPath));
  const resolvedSource = fs.realpathSync(sourcePath);
  if ([resolvedSource, `${resolvedSource}-wal`, `${resolvedSource}-shm`, `${resolvedSource}-journal`].includes(resolvedDestination)) {
    throw new Error('Destination must not be the source database or any of its journal files.');
  }
  const header = Buffer.alloc(16);
  const fd = fs.openSync(sourcePath, 'r');
  try { fs.readSync(fd, header, 0, header.length, 0); } finally { fs.closeSync(fd); }
  if (!header.equals(Buffer.from('SQLite format 3\0'))) throw new Error('Source is not a SQLite database.');
  return { sourcePath: resolvedSource, destinationPath: resolvedDestination, destinationDirectory };
}

async function snapshot(source, destination, operation) {
  const paths = validatePaths(source, destination);
  // Same-filesystem private staging directory enables atomic no-clobber publication.
  const stagingDirectory = fs.mkdtempSync(path.join(paths.destinationDirectory, '.kipper-snapshot-'));
  fs.chmodSync(stagingDirectory, 0o700);
  const stagingPath = path.join(stagingDirectory, 'snapshot.sqlite');
  let db;
  try {
    db = new Database(paths.sourcePath, { readonly: true, fileMustExist: true });
    // SQLite's online backup reads committed data, including uncheckpointed WAL.
    // Never copy a live .db file with filesystem copy commands.
    await db.backup(stagingPath);
    db.close(); db = undefined;
    const verification = new Database(stagingPath, { readonly: true, fileMustExist: true });
    let tableCount;
    try {
      const checks = verification.pragma('integrity_check');
      if (checks.length !== 1 || checks[0].integrity_check !== 'ok') throw new Error('Snapshot failed SQLite integrity_check.');
      tableCount = verification.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").get().count;
    } finally { verification.close(); }
    fs.chmodSync(stagingPath, 0o600);
    const fd = fs.openSync(stagingPath, 'r');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    // Atomic link fails with EEXIST even if another process creates the destination
    // after validation. Never rename over a potentially live database.
    fs.linkSync(stagingPath, paths.destinationPath);
    return { operation, destination: paths.destinationPath, bytes: fs.statSync(paths.destinationPath).size, tableCount, integrity: 'ok' };
  } finally {
    if (db?.open) db.close();
    fs.rmSync(stagingDirectory, { recursive: true, force: true });
  }
}

export async function backupDatabase(source, destination) { return snapshot(source, destination, 'backup'); }
export async function restoreDatabase(source, destination) { return snapshot(source, destination, 'restore'); }

async function main(args) {
  const [operation, source, destination, ...extra] = args;
  if (!['backup', 'restore'].includes(operation) || !source || !destination || extra.length) {
    throw new Error('Usage: node scripts/sqlite-backup.mjs <backup|restore> <source.sqlite> <new-destination.sqlite>');
  }
  const result = await (operation === 'backup' ? backupDatabase(source, destination) : restoreDatabase(source, destination));
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => { console.error(`SQLite ${process.argv[2] ?? 'snapshot'} failed: ${error.message}`); process.exitCode = 1; });
}
