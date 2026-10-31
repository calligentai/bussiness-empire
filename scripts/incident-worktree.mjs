#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usage = 'Usage: node scripts/incident-worktree.mjs <INCIDENT-ID> <WORKTREE-PATH> [--dry-run]';

export function planIncidentWorktree(incidentId, worktreePath, root = repoRoot) {
  if (!/^BUS-\d+$/.test(incidentId ?? '')) throw new Error(`Invalid incident id. ${usage}`);
  if (!worktreePath) throw new Error(usage);
  const absolutePath = path.resolve(root, worktreePath);
  if (absolutePath === root || absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error('Incident worktree must be outside the current task worktree.');
  }
  return {
    branch: `incident/${incidentId.toLowerCase()}`,
    path: absolutePath,
    base: 'origin/lavabean',
  };
}

function run() {
  const [incidentId, worktreePath, flag] = process.argv.slice(2);
  const plan = planIncidentWorktree(incidentId, worktreePath);
  if (flag && flag !== '--dry-run') throw new Error(usage);
  const args = ['worktree', 'add', '-b', plan.branch, plan.path, plan.base];
  if (flag === '--dry-run') {
    console.log(`git ${args.map((arg) => JSON.stringify(arg)).join(' ')}`);
    return;
  }
  const result = spawnSync('git', args, { cwd: repoRoot, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { run(); } catch (error) { console.error(error.message); process.exitCode = 2; }
}
