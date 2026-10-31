import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { planIncidentWorktree } from '../scripts/incident-worktree.mjs';

describe('incident worktree plan', () => {
  it('uses a dedicated incident branch from the lavabean integration baseline', () => {
    assert.deepEqual(planIncidentWorktree('BUS-113', '../BUS-113-repair', '/repo'), {
      branch: 'incident/bus-113',
      path: '/BUS-113-repair',
      base: 'origin/lavabean',
    });
  });

  it('rejects identifiers that could create an ambiguous branch name', () => {
    assert.throws(() => planIncidentWorktree('../oops', '../worktree', '/repo'), /Invalid incident id/);
  });

  it('rejects a worktree nested inside the active task checkout', () => {
    assert.throws(() => planIncidentWorktree('BUS-113', 'repair', '/repo'), /outside the current task/);
  });
});
