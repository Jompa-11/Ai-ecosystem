// Dashboard (topbar) + agent-panel. Ändra siffror och agenter här nedan.

const STATS = [
  { icon: 'coin', label: 'Sålt', value: '248 500 kr', color: '#e7b64b' },
  { icon: 'chip', label: 'API-kostnad', value: '12 460 kr', color: '#e0564b' },
  { icon: 'cube', label: 'Tokens', value: '18 420 000', color: '#4aa3e6' },
  { icon: 'bars', label: 'Revenue', value: '236 040 kr', color: '#e79a3a' },
];

const AGENTS = [
  { name: 'Hermes HQ', owner: 'Tony', color: '#e0564b', img: 'assets/agents/hermes.png' },
  { name: 'Research Center', owner: 'Max', color: '#4caf50', img: 'assets/agents/research.png' },
  { name: 'Factory', owner: 'Tommy', color: '#e79a3a', img: 'assets/agents/factory.png' },
  { name: 'Analytics Center', owner: 'Daniel', color: '#4a90d9', img: 'assets/agents/analytics.png' },
];

// ---- SVG-ikoner ----
function icon(kind, color) {
  const c = color;
  switch (kind) {
    case 'coin':
      return `<svg viewBox="0 0 28 28" fill="none">
        <ellipse cx="14" cy="20" rx="9" ry="4.5" fill="#b98a24"/>
        <ellipse cx="14" cy="17.5" rx="9" ry="4.5" fill="${c}" stroke="#8a6a20" stroke-width="1"/>
        <ellipse cx="14" cy="11.5" rx="9" ry="4.5" fill="#c99a2e"/>
        <ellipse cx="14" cy="9" rx="9" ry="4.5" fill="${c}" stroke="#8a6a20" stroke-width="1"/>
        <path d="M11.5 7l5 4M16.5 7l-5 4" stroke="#8a6a20" stroke-width="1.3"/>
      </svg>`;
    case 'chip':
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="2" fill="${c}" stroke="#7a2c22" stroke-width="1.4"/><rect x="9.5" y="9.5" width="5" height="5" fill="#7a2c22"/><g stroke="${c}" stroke-width="1.7"><path d="M9 6V3M12 6V3M15 6V3M9 21v-3M12 21v-3M15 21v-3M6 9H3M6 12H3M6 15H3M21 9h-3M21 12h-3M21 15h-3"/></g></svg>`;
    case 'cube':
      return `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" fill="${c}" stroke="#28527a" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 3v9l8-4.5M12 12v9M12 12L4 7.5" stroke="#28527a" stroke-width="1.3"/><path d="M12 12l8-4.5" stroke="#9cccf2" stroke-width="1"/></svg>`;
    case 'bars':
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="13" width="4" height="7" rx="1" fill="${c}"/><rect x="10" y="9" width="4" height="11" rx="1" fill="${c}"/><rect x="16" y="5" width="4" height="15" rx="1" fill="${c}"/></svg>`;
    default:
      return '';
  }
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
  `).join('');
}

// ---- Rendera agent-panel ----
function renderAgents() {
  const el = document.getElementById('agentList');
  el.innerHTML = AGENTS.map((a) => `
    <li class="agent">
      <span class="agent-ic"><img src="${a.img}" alt="${a.name}" /></span>
      <span class="agent-txt">
        <span class="agent-name">${a.name}</span>
        <span class="agent-owner"><span class="dot" style="background:${a.color};color:${a.color}"></span>${a.owner}</span>
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
