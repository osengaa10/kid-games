// Grown-up settings (behind a 2-second hold on the gear or the pause button, so he won't wander
// in). Words are fine here. The game waits while it's open.
//   Who's playing     his pup / your pup
//   This player       Kid or Dad mode; Auto-Go (Kid); auto-fire and aim assist (Dad);
//                     left-handed, bigger buttons
//   Sound             music, sounds, voice
//   Comfort           reduced motion, fewer flashes
//   Grown-up tools    FPS overlay, quality, the feel sliders (with Copy values), the stress test,
//                     the practice field, reset this player's progress
// Switching Kid/Dad mid-level restarts from the last checkpoint in the new mode.
import { RANGES, TUNING } from '../game/tuning.js';
import { ORDER, quality, setQuality } from '../render/quality.js';

export function openSettings(app) {
  if (document.querySelector('.dev')) return;
  app.panelOpen = true;
  const el = document.createElement('div');
  el.className = 'dom-ui dev';
  document.body.append(el);
  let showTuning = false;
  let confirmReset = false;

  const render = () => {
    const st = app.store;
    const prof = st.profile();
    const g = st.data.settings;
    const mode = prof.mode;
    const t = app.tuneFor(mode);
    const check = (key, label, on, scope = 'p') => `<label><input type="checkbox" data-${scope}="${key}" ${on ? 'checked' : ''}> ${label}</label>`;
    const slider = (key, label) => `<label class="vol"><span>${label}</span><input type="range" min="0" max="1" step="0.05" value="${g[key]}" data-vol="${key}"></label>`;
    el.innerHTML = `
      <div class="dev-head">
        <b>Turbo Quest settings</b>
        <button data-act="close" class="dev-close">Done ▶</button>
      </div>
      <div class="dev-title">Who's playing</div>
      <div class="dev-row schemes">
        <button data-profile="kid" class="${prof.id === 'kid' ? 'on' : ''}">🐶 His pup<br><small>${st.profile('kid').stars} ★</small></button>
        <button data-profile="dad" class="${prof.id === 'dad' ? 'on' : ''}">😎 Your pup<br><small>${st.profile('dad').stars} ★</small></button>
      </div>
      <div class="dev-title">This player</div>
      <div class="dev-row schemes">
        <button data-mode="kid" class="${mode === 'kid' && !prof.autoGo ? 'on' : ''}">Kid<br><small>◀ ▶ + jump</small></button>
        <button data-mode="kidAuto" class="${mode === 'kid' && prof.autoGo ? 'on' : ''}">Kid Auto-Go<br><small>tap = jump</small></button>
        <button data-mode="dad" class="${mode === 'dad' ? 'on' : ''}">Dad<br><small>stick + buttons</small></button>
      </div>
      <div class="dev-row checks">
        ${mode === 'dad' ? check('autoFire', 'Auto-fire', prof.autoFire) + check('aimAssist', 'Aim assist', prof.aimAssist !== false) : ''}
        ${check('leftHanded', 'Left-handed', prof.leftHanded)}
        ${check('bigButtons', 'Bigger buttons', prof.bigButtons)}
      </div>
      <div class="dev-title">Sound</div>
      <div class="sliders">${slider('music', 'Music')}${slider('sfx', 'Sounds')}${slider('voice', 'Voice')}</div>
      <div class="dev-title">Comfort</div>
      <div class="dev-row checks">
        ${check('reducedMotion', 'Reduced motion (no shake, fewer effects)', app.settings.reducedMotion, 'g')}
        ${check('reduceFlash', 'Fewer flashes', g.reduceFlash, 'g')}
      </div>
      <div class="dev-title">Grown-up tools</div>
      <div class="dev-row checks">
        ${check('debug', 'Show FPS', g.debug, 'g')}
        <label>Quality <select data-act="quality">${ORDER.map((q) => `<option ${quality().name === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label>
      </div>
      <div class="dev-row">
        <button data-act="tuning">${showTuning ? 'Hide' : 'Feel'} tuning</button>
        <button data-act="practice">Practice field</button>
        <button data-act="stress">Stress test</button>
        <button data-act="reset" class="${confirmReset ? 'warn' : ''}">${confirmReset ? 'Tap again to erase' : 'Reset this player'}</button>
      </div>
      ${showTuning ? `
      <div class="dev-title">${mode === 'dad' ? 'Dad' : 'Kid'} mode feel <small>(${Object.keys(app.tuneOverrides[mode] || {}).length} changed)</small></div>
      <div class="sliders">
        ${Object.keys(TUNING[mode]).map((k) => {
          const [lo, hi, step] = RANGES[k];
          const changed = t[k] !== TUNING[mode][k];
          return `<label class="${changed ? 'changed' : ''}"><span>${k}</span><input type="range" min="${lo}" max="${hi}" step="${step}" value="${t[k]}" data-tune="${k}"><output>${fmt(t[k])}</output></label>`;
        }).join('')}
      </div>
      <div class="dev-row">
        <button data-act="resetTune">Reset ${mode} feel</button>
        <button data-act="copy">Copy values</button>
      </div>
      <textarea class="dev-out" readonly hidden></textarea>` : ''}
    `;
  };

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const st = app.store;
    const prof = st.profile();
    if (b.dataset.profile) {
      st.choose(b.dataset.profile);
      app.applySettings(true);
      render();
      return;
    }
    if (b.dataset.mode) {
      const m = b.dataset.mode;
      prof.mode = m === 'dad' ? 'dad' : 'kid';
      prof.autoGo = m === 'kidAuto';
      st.save();
      app.applySettings(true);
      render();
      return;
    }
    const act = b.dataset.act;
    if (act === 'close') close();
    else if (act === 'tuning') {
      showTuning = !showTuning;
      render();
    } else if (act === 'resetTune') {
      app.tuneOverrides[prof.mode] = {};
      app.applySettings();
      render();
    } else if (act === 'copy') {
      const text = valuesText(app);
      const out = el.querySelector('.dev-out');
      out.hidden = false;
      out.value = text;
      out.select();
      navigator.clipboard?.writeText(text).catch(() => {});
    } else if (act === 'reset') {
      if (!confirmReset) {
        confirmReset = true;
        render();
        return;
      }
      st.resetProfile(prof.id);
      confirmReset = false;
      app.applySettings(true);
      close();
      app.showTitle();
    } else if (act === 'stress') {
      close();
      app.startStress();
    } else if (act === 'practice') {
      close();
      app.startLevel('greybox', null);
    }
  });
  el.addEventListener('input', (e) => {
    const inp = e.target;
    const mode = app.store.profile().mode;
    if (inp.dataset.tune) {
      const k = inp.dataset.tune;
      const v = Number(inp.value);
      app.tuneOverrides[mode] ||= {};
      if (v === TUNING[mode][k]) delete app.tuneOverrides[mode][k];
      else app.tuneOverrides[mode][k] = v;
      inp.nextElementSibling.textContent = fmt(v);
      inp.parentElement.classList.toggle('changed', v !== TUNING[mode][k]);
      app.applySettings();
    } else if (inp.dataset.vol) {
      app.store.data.settings[inp.dataset.vol] = Number(inp.value);
      app.applySettings();
    }
  });
  el.addEventListener('change', (e) => {
    const inp = e.target;
    if (inp.dataset.p) {
      app.store.profile()[inp.dataset.p] = inp.checked;
      app.applySettings();
    } else if (inp.dataset.g) {
      app.store.data.settings[inp.dataset.g] = inp.checked;
      app.applySettings();
    } else if (inp.dataset.act === 'quality') {
      setQuality(inp.value);
      app.resize();
    }
  });

  function close() {
    el.remove();
    app.panelOpen = false;
    app.store.flush();
    app.input.flush();
    app.ui.sig = '';
  }
  render();
}

const fmt = (v) => (Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.?0+$/, '') || '0';

function valuesText(app) {
  const out = {};
  for (const mode of ['kid', 'dad']) out[mode] = app.tuneFor(mode);
  return `// Paste into TUNING in js/game/tuning.js\n${JSON.stringify(out, null, 2)}`;
}
