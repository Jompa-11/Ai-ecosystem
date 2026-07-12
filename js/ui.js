// Fäll agent-panelen in/ut. Topbaren och panelen är dina exakta bilder
// (assets/ui/topbar.png och assets/ui/panel.png).

function setup() {
  const collapse = () => document.body.classList.add('agents-collapsed');
  const expand = () => document.body.classList.remove('agents-collapsed');
  document.getElementById('agentsToggle').addEventListener('click', collapse);
  document.getElementById('agentsReopen').addEventListener('click', expand);
}

setup();
