// The local playtest log: after every level, how long each section took and how many hits,
// rescues and helps happened there (kept on this device only, the last 40 runs). ?stats shows it
// as a table, for watching where a young player gets stuck from one session to the next.
const KEY = 'turbo-quest:log';
const MAX = 40;

export function logRun(world, profile) {
  try {
    const log = JSON.parse(localStorage.getItem(KEY) || '[]');
    log.push({
      when: new Date().toISOString(), profile, mode: world.mode, level: world.level.id, autoGo: world.autoGo,
      time: Math.round(world.wonAt || world.time), won: world.won, stars: world.starsGot, gems: world.gems.filter(Boolean).length,
      hits: world.hits, rescues: world.rescues, faints: world.faints,
      sections: world.sectionStats.map((s, i) => ({ name: world.level.sections[i].name, time: Math.round(s.time), hits: s.hits, rescues: s.rescues, helps: s.helps })),
    });
    localStorage.setItem(KEY, JSON.stringify(log.slice(-MAX)));
  } catch {
    /* not fatal */
  }
}

export function showStatsPage() {
  let log = [];
  try {
    log = JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    /* empty */
  }
  document.body.innerHTML = '';
  document.body.style.cssText = 'position:static;overflow:auto;background:#10203a;color:#eaf3ff;font:14px system-ui;padding:16px;touch-action:auto';
  document.documentElement.style.cssText = 'overflow:auto';
  const rows = log.slice().reverse().map((r) => `
    <tr><td>${new Date(r.when).toLocaleString()}</td><td>${r.profile}</td><td>${r.mode}${r.autoGo ? ' (Auto-Go)' : ''}</td><td>${r.level}</td>
    <td>${r.won ? '✔' : '—'}</td><td>${r.time}s</td><td>${r.stars}★ ${r.gems}◆</td><td>${r.hits} / ${r.rescues} / ${r.faints}</td>
    <td>${r.sections.map((s) => `<span title="${s.name}">${s.time}s${s.hits ? ` ♥${s.hits}` : ''}${s.rescues ? ` 🫧${s.rescues}` : ''}${s.helps ? ` 🌉${s.helps}` : ''}</span>`).join(' · ')}</td></tr>`).join('');
  document.body.innerHTML = `<h2>Turbo Quest playtest log</h2>
    <p>Newest first. Hits / rescues (pits) / faints (out of hearts). Per section: time, ♥ hits, 🫧 rescues, 🌉 helping bridges.</p>
    <table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>When</th><th>Player</th><th>Mode</th><th>Level</th><th>Done</th><th>Time</th><th>Got</th><th>Hits/rescues/faints</th><th>Sections</th></tr>${rows || '<tr><td colspan="9">No runs yet.</td></tr>'}</table>`;
}
