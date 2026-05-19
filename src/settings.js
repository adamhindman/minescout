const KEY       = 'minescout_mine_count';
const TS_KEY    = 'minescout_saved_at';
const DEFAULT   = 34;
// Bump this date to invalidate all stored settings older than it
const INVALIDATE_BEFORE = '2026-05-19T15:26';

function _clearIfStale() {
  const saved = localStorage.getItem(TS_KEY);
  if (!saved || saved < INVALIDATE_BEFORE) {
    localStorage.removeItem(KEY);
    localStorage.removeItem(TS_KEY);
  }
}

export function getMineCount() {
  _clearIfStale();
  const v = parseInt(localStorage.getItem(KEY), 10);
  return isNaN(v) ? DEFAULT : v;
}

export function setMineCount(n) {
  localStorage.setItem(KEY, String(n));
  localStorage.setItem(TS_KEY, new Date().toISOString().slice(0, 16));
}
