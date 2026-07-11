// Dashboard (topbar) + agent-panel. Enkelt och data-drivet — ändra
// siffrorna och agenterna här nedan.

const STATS = [
  { icon: 'coin', label: 'Sålt', value: '248 500 kr', color: '#e7b64b' },
  { icon: 'chip', label: 'API-kostnad', value: '12 460 kr', color: '#e0564b' },
  { icon: 'cube', label: 'Tokens', value: '18 420 000', color: '#5aa9e6' },
  { icon: 'bars', label: 'Revenue', value: '236 040 kr', color: '#e79a3a' },
];

const AGENTS = [
  { name: 'Hermes HQ', owner: 'Tony', color: '#c0392b' },
  { name: 'Research Center', owner: 'Max', color: '#4caf50' },
  { name: 'Factory', owner: 'Tommy', color: '#e79a3a' },
  { name: 'Analytics Center', owner: 'Daniel', color: '#4a90d9' },
];

// ---- SVG-ikoner ----
function icon(kind, color) {
  const c = color;
  switch (kind) {
    case 'coin':
      return `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="${c}" stroke="#8a6a20" stroke-width="1.5"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="#8a6a20" stroke-width="1.3"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5" stroke="#8a6a20" stroke-width="1.4"/></svg>`;
    case 'chip':
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="2" fill="${c}" stroke="#7a2c22" stroke-width="1.4"/><rect x="9.5" y="9.5" width="5" height="5" fill="#7a2c22"/><g stroke="${c}" stroke-width="1.6"><path d="M9 6V3M12 6V3M15 6V3M9 21v-3M12 21v-3M15 21v-3M6 9H3M6 12H3M6 15H3M21 9h-3M21 12h-3M21 15h-3"/></g></svg>`;
    case 'cube':
      return `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" fill="${c}" stroke="#28527a" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 3v9l8-4.5M12 12v9M12 12L4 7.5" stroke="#28527a" stroke-width="1.3"/></svg>`;
    case 'bars':
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="13" width="4" height="7" fill="${c}"/><rect x="10" y="9" width="4" height="11" fill="${c}"/><rect x="16" y="5" width="4" height="15" fill="${c}"/></svg>`;
    default:
      return '';
  }
}

// En liten borg-/torn-siluett tonad i agentens färg.
function castleIcon(color) {
  return `<svg viewBox="0 0 40 40" fill="none">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#1a1712"/>
    </linearGradient></defs>
    <path d="M8 34V16l3-2 3 2v-4l3-2 3 2v-3l3-2 3 2v3l3-2 3 2v4l3-2 3 2v18H8z"
      fill="url(#g)" stroke="${color}" stroke-width="1.3" stroke-linejoin="round"/>
    <rect x="18" y="24" width="4" height="10" fill="#0d0b08"/>
    <circle cx="20" cy="12" r="1.4" fill="${color}"/>
  </svg>`;
}

// ---- Rendera topbar ----
function renderStats() {
  const el = document.getElementById('stats');
  el.innerHTML = STATS.map((s) => `
    <div class="stat">
      <span class="stat-ic">${icon(s.icon, s.color)}</span>
      <span class="stat-txt">
        <span class="stat-label">${s.label}:</span>
        <span class="stat-value" style="color:${s.color}">${s.value}</span>
      </span>
    </div>
  `).join('<span class="stat-div"></span>');
}

// ---- Rendera agent-panel ----
function renderAgents() {
  const el = document.getElementById('agentList');
  el.innerHTML = AGENTS.map((a) => `
    <li class="agent">
      <span class="agent-ic">${castleIcon(a.color)}</span>
      <span class="agent-txt">
        <span class="agent-name">${a.name}</span>
        <span class="agent-owner"><span class="dot" style="background:${a.color}"></span>${a.owner}</span>
      </span>
    </li>
  `).join('');
}

// ---- Fäll in/ut ----
function setupToggle() {
  const collapse = () => document.body.classList.add('agents-collapsed');
  const expand = () => document.body.classList.remove('agents-collapsed');
  document.getElementById('agentsToggle').addEventListener('click', collapse);
  document.getElementById('agentsReopen').addEventListener('click', expand);
}

renderStats();
renderAgents();
setupToggle();
