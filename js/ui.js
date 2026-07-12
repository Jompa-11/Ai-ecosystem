// Dashboard: live-värden ovanpå topbar-bilden + fällbar agent-panel.
//
// Värdena börjar på 0. Dina AI-agenter kan uppdatera dem på två sätt:
//   1) Från JS:  window.dashboard.set('sold', 248500)
//                window.dashboard.setAll({ sold: 248500, apiCost: 12460,
//                                          tokens: 18420000, revenue: 236040 })
//   2) Genom att skriva till  assets/data/dashboard.json  (läses var 5:e sek):
//        { "sold": 0, "apiCost": 0, "tokens": 0, "revenue": 0 }

const FMT = new Intl.NumberFormat('sv-SE');

const STAT_DEFS = {
  sold:    { el: 'val-sold',    suffix: ' kr' },
  apiCost: { el: 'val-apiCost', suffix: ' kr' },
  tokens:  { el: 'val-tokens',  suffix: '' },
  revenue: { el: 'val-revenue', suffix: ' kr' },
};

const state = { sold: 0, apiCost: 0, tokens: 0, revenue: 0 };

function render() {
  for (const key in STAT_DEFS) {
    const el = document.getElementById(STAT_DEFS[key].el);
    if (el) el.textContent = FMT.format(state[key] || 0) + STAT_DEFS[key].suffix;
  }
}

function set(key, value) {
  if (key in state) {
    state[key] = Number(value) || 0;
    render();
  }
}

function setAll(obj) {
  if (obj && typeof obj === 'object') {
    for (const key in state) {
      if (key in obj) state[key] = Number(obj[key]) || 0;
    }
    render();
  }
}

// Publikt API för agenter.
window.dashboard = { set, setAll, get: () => ({ ...state }) };

render();

// Valfri live-koppling: läs assets/data/dashboard.json med jämna mellanrum.
async function poll() {
  try {
    const res = await fetch('assets/data/dashboard.json', { cache: 'no-store' });
    if (res.ok) setAll(await res.json());
  } catch (e) {
    /* ingen datafil ännu – värdena står kvar på 0 */
  }
}
poll();
setInterval(poll, 5000);

// ---- Fäll agent-panelen in/ut ----
function setupToggle() {
  const collapse = () => document.body.classList.add('agents-collapsed');
  const expand = () => document.body.classList.remove('agents-collapsed');
  document.getElementById('agentsToggle').addEventListener('click', collapse);
  document.getElementById('agentsReopen').addEventListener('click', expand);
}
setupToggle();
