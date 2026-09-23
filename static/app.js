const message = document.querySelector('#message');
const send = document.querySelector('#send');
const response = document.querySelector('#response');
const historyKey = 'northstar-brief-history';
let history = JSON.parse(localStorage.getItem(historyKey) || '[]');

const agentLabels = { finance: 'Finance analyst', operations: 'Operations planner', sales: 'Sales strategist', research: 'Market researcher', general: 'Business lead' };

function saveHistory() {
  localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 30)));
  renderHistory();
}

function renderHistory() {
  const filter = document.querySelector('#history-filter')?.value || 'all';
  const filtered = filter === 'all' ? history : history.filter(item => item.agent === filter);
  document.querySelector('#brief-count').textContent = history.length;
  document.querySelector('#last-agent').textContent = history[0] ? agentLabels[history[0].agent].split(' ')[0] : '—';
  document.querySelector('#history-total').textContent = `${filtered.length} brief${filtered.length === 1 ? '' : 's'}`;
  const markup = filtered.length ? filtered.map(item => historyItem(item)).join('') : '<div class="empty-state"><span>◌</span><p>No matching briefs</p><small>Your saved conversations will appear here.</small></div>';
  document.querySelector('#recent-history').innerHTML = history.slice(0, 4).map(item => historyItem(item)).join('') || '<div class="empty-state"><span>◌</span><p>No briefs yet</p><small>Your questions and agent responses will appear here.</small></div>';
  document.querySelector('#full-history-list').innerHTML = markup;
  document.querySelectorAll('.history-item').forEach(item => item.addEventListener('click', () => {
    message.value = item.dataset.message;
    showView('workspace');
    message.focus();
  }));
}

function historyItem(item) {
  const date = new Date(item.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
  return `<button class="history-item" data-message="${escapeHtml(item.message)}"><span class="history-agent ${item.agent}">${agentLabels[item.agent].slice(0, 1)}</span><span class="history-copy"><b>${escapeHtml(item.message)}</b><small>${agentLabels[item.agent]} · ${date}</small></span><span class="history-arrow">↗</span></button>`;
}

function escapeHtml(value) { return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char])); }

function showView(view) {
  document.querySelectorAll('.view').forEach(section => section.classList.toggle('active-view', section.id === `${view}-view`));
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  if (view === 'history') renderHistory();
}

async function ask() {
  const text = message.value.trim();
  if (!text) return;
  send.disabled = true;
  send.innerHTML = 'Thinking <span>...</span>';
  response.classList.remove('hidden');
  response.innerHTML = '<div class="meta">Northstar is routing your brief</div><p>Connecting the right specialist...</p>';
  try {
    const result = await fetch('/api/chat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message: text}) });
    if (!result.ok) throw new Error('Request failed');
    const data = await result.json();
    history.unshift({message: text, agent: data.agent, answer: data.answer, createdAt: new Date().toISOString()});
    saveHistory();
    response.innerHTML = `<div class="meta">${agentLabels[data.agent]} · ${data.demo_mode ? 'demo mode' : 'azure ai foundry'}</div><h3>${escapeHtml(data.answer.split('\n')[0])}</h3><p>${escapeHtml(data.answer.split('\n').slice(1).join('\n') || data.answer)}</p><div class="next-steps">${data.next_steps.map(step => `<span>${escapeHtml(step)}</span>`).join('')}</div>`;
    response.scrollIntoView({behavior: 'smooth', block: 'center'});
  } catch (error) {
    response.innerHTML = '<div class="meta">Connection issue</div><p>Could not reach the assistant. Check that the API is running and try again.</p>';
  } finally { send.disabled = false; send.innerHTML = 'Ask Northstar <span>→</span>'; }
}

document.querySelectorAll('.nav-item, [data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('.agent-filter').forEach(button => button.addEventListener('click', () => { document.querySelector('#history-filter').value = button.dataset.agent; showView('history'); }));
document.querySelector('#history-filter').addEventListener('change', renderHistory);
document.querySelector('#clear-history').addEventListener('click', () => { if (history.length && confirm('Clear your locally saved brief history?')) { history = []; saveHistory(); } });
send.addEventListener('click', ask);
message.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') ask(); });
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => { message.value = button.dataset.prompt; message.focus(); }));
renderHistory();
