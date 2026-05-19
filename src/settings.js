const KEY = 'minescout_mine_count';
const DEFAULT = 55;

export function getMineCount() {
  const v = parseInt(localStorage.getItem(KEY), 10);
  return isNaN(v) ? DEFAULT : v;
}

export function setMineCount(n) {
  localStorage.setItem(KEY, String(n));
}
