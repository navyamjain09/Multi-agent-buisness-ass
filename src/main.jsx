import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const AGENTS = {
  finance: { label: 'Finance analyst', color: 'orange', icon: '◈' },
  operations: { label: 'Operations planner', color: 'blue', icon: '⌁' },
  sales: { label: 'Sales strategist', color: 'yellow', icon: '↗' },
  research: { label: 'Market researcher', color: 'purple', icon: '◎' },
  general: { label: 'Business lead', color: 'green', icon: '✦' },
};
const HISTORY_KEY = 'agentgrid-brief-history';
const quickBriefs = [
  { title: 'Grow pipeline', agent: 'sales', prompt: 'Build a plan to improve our sales pipeline conversion this quarter.', icon: '↗' },
  { title: 'Reduce costs', agent: 'operations', prompt: 'Find the biggest opportunities to reduce operating costs.', icon: '⌁' },
  { title: 'Read the market', agent: 'research', prompt: 'What market trends should shape our next product decision?', icon: '◎' },
];

function App() {
  const [view, setView] = useState('overview');
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'));
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30))), [history]);
  const filteredHistory = useMemo(() => filter === 'all' ? history : history.filter((item) => item.agent === filter), [history, filter]);

  const ask = async () => {
    const text = message.trim();
    if (!text || loading) return;
    setLoading(true);
    setResponse({ loading: true });
    try {
      const result = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
      if (!result.ok) throw new Error('Request failed');
      const data = await result.json();
      const item = { message: text, agent: data.agent, answer: data.answer, nextSteps: data.next_steps, createdAt: new Date().toISOString() };
      setHistory((current) => [item, ...current].slice(0, 30));
      setResponse({ ...data, loading: false });
    } catch {
      setResponse({ error: 'Could not reach the assistant. Check that the API is running and try again.' });
    } finally { setLoading(false); }
  };

  const openBrief = (prompt = '') => { setMessage(prompt); setResponse(null); setView('workspace'); };
  const clearHistory = () => { if (history.length && window.confirm('Clear your locally saved brief history?')) setHistory([]); };
  const reopen = (item) => openBrief(item.message);

  return <div className="app-shell">
    <Sidebar view={view} setView={setView} setFilter={setFilter} />
    <main className="main-area">
      <header className="topbar"><div><span className="mono eyebrow">AGENTGRID WORKSPACE</span><h1>Business command center.</h1></div><div className="top-actions"><button className="clear-button" onClick={clearHistory} title="Clear local brief history">⌫</button><button className="avatar" onClick={() => setView('profile')} title="Open profile">A</button></div></header>
      <div className="page-content">
        {view === 'overview' && <Overview history={history} setView={setView} openBrief={openBrief} reopen={reopen} />}
        {view === 'workspace' && <Workspace message={message} setMessage={setMessage} ask={ask} loading={loading} response={response} openBrief={openBrief} />}
        {view === 'history' && <History history={filteredHistory} filter={filter} setFilter={setFilter} reopen={reopen} />}
        {view === 'knowledge' && <Knowledge openBrief={openBrief} />}
        {view === 'profile' && <Profile />}
      </div>
    </main>
  </div>;
}

function Sidebar({ view, setView, setFilter }) {
  return <aside className="sidebar"><div className="brand"><span className="brand-mark">A</span><span>AgentGrid</span></div><p className="mono eyebrow">MULTI-AGENT WORKSPACE</p><nav>{[['overview', '✦', 'Overview'], ['history', '↺', 'Brief history'], ['knowledge', '▦', 'Knowledge'], ['workspace', '＋', 'New brief']].map(([id, icon, label]) => <button key={id} className={`nav-button ${view === id ? 'selected' : ''}`} onClick={() => setView(id)}><span>{icon}</span>{label}</button>)}</nav><div className="agent-list"><p className="mono eyebrow">SPECIALISTS <b>4 ONLINE</b></p>{Object.entries(AGENTS).filter(([id]) => id !== 'general').map(([id, agent]) => <button key={id} className="agent-button" onClick={() => { setFilter(id); setView('history'); }}><i className={`dot ${agent.color}`} />{agent.label}<span>↗</span></button>)}</div><button className="sidebar-profile" onClick={() => setView('profile')}><span className="avatar small">A</span><span><b>Workspace operator</b><small>Workspace owner</small></span><em>↗</em></button><div className="sidebar-status"><i className="status-dot" />Connected to Foundry <small>v1.0</small></div></aside>;
}

function Overview({ history, setView, openBrief, reopen }) {
  return <section className="view"><div className="hero-heading"><div><p className="mono eyebrow accent">BUSINESS COMMAND CENTER</p><h2>See the business<br /><em>clearly.</em></h2></div><div className="agent-orbit"><span /><strong>4</strong><small>agents ready</small></div></div><div className="metrics"><Metric label="BRIEFS THIS WEEK" value={history.length} note="↗ Your workspace" /><Metric label="ACTIVE SPECIALISTS" value={<><b>4</b><small>/4</small></>} note="● All systems ready" /><Metric label="LAST RESPONSE" value={history[0] ? AGENTS[history[0].agent].label.split(' ')[0] : '—'} note={history[0] ? 'Ready for your next brief' : 'Waiting for your brief'} /></div><div className="dashboard-grid"><section className="panel"><PanelTitle label="RECENT ACTIVITY" title="Decision trail" action={<button className="link-button" onClick={() => setView('history')}>View all →</button>} />{history.length ? history.slice(0, 4).map((item) => <HistoryRow key={item.createdAt} item={item} onClick={() => reopen(item)} />) : <EmptyState />}</section><section className="panel callout"><PanelTitle label="START A CONVERSATION" title="What needs clarity?" /><p>Bring a business question to the right specialist and get a focused point of view.</p><button className="primary-button" onClick={() => openBrief()}>Open a new brief <span>↗</span></button><div className="mini-agents">{Object.entries(AGENTS).filter(([id]) => id !== 'general').map(([id, agent]) => <span key={id}><i className={`dot ${agent.color}`} />{agent.label.split(' ')[0]}</span>)}</div></section></div></section>;
}

function Workspace({ message, setMessage, ask, loading, response, openBrief }) {
  return <section className="view"><div className="workspace-heading"><p className="mono eyebrow accent">NEW BUSINESS BRIEF</p><h2>What are we<br /><em>working on?</em></h2><p>AgentGrid routes your question to the right specialist and returns a decision-ready point of view.</p></div><div className="composer"><div className="composer-top"><b>Tell us what you need to decide</b><span className="shortcut">⌘ ↵</span></div><textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') ask(); }} placeholder="e.g. Where can we reduce operating costs by 10% this quarter?" autoFocus /><div className="composer-bottom"><span>Be specific about the outcome, timeframe, or constraint</span><button className="primary-button" disabled={loading} onClick={ask}>{loading ? 'Thinking…' : 'Ask AgentGrid'} <b>→</b></button></div></div><div className="quick-section"><span className="mono eyebrow">QUICK BRIEFS</span><div className="quick-grid">{quickBriefs.map((brief) => <button key={brief.title} onClick={() => openBrief(brief.prompt)}><span className={`quick-icon ${brief.agent}`}>{brief.icon}</span><span><b>{brief.title}</b><small>{AGENTS[brief.agent].label}</small></span><em>↗</em></button>)}</div></div>{response && <Response response={response} />}</section>;
}

function Response({ response }) { if (response.loading) return <div className="response"><span className="mono eyebrow accent">AGENTGRID IS ROUTING YOUR BRIEF</span><p>Connecting the right specialist…</p></div>; if (response.error) return <div className="response error"><span className="mono eyebrow">CONNECTION ISSUE</span><p>{response.error}</p></div>; const agent = AGENTS[response.agent]; return <div className="response"><span className="mono eyebrow accent">{agent.label.toUpperCase()} · {response.demo_mode ? 'DEMO MODE' : 'AZURE AI FOUNDRY'}</span><h3>{response.answer.split('\n')[0]}</h3><p>{response.answer.split('\n').slice(1).join('\n') || response.answer}</p><div className="next-steps">{response.next_steps?.map((step) => <span key={step}>{step}</span>)}</div></div>; }
function History({ history, filter, setFilter, reopen }) { return <section className="view"><div className="history-heading"><div><p className="mono eyebrow accent">WORKSPACE MEMORY</p><h2>Your brief<br /><em>history.</em></h2></div><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All specialists</option>{Object.entries(AGENTS).map(([id, agent]) => <option key={id} value={id}>{agent.label}</option>)}</select></div><section className="panel full-history"><PanelTitle label="SAVED LOCALLY" title="Every question, in context" action={<span className="mono history-count">{history.length} briefs</span>} />{history.length ? history.map((item) => <HistoryRow key={item.createdAt} item={item} onClick={() => reopen(item)} />) : <EmptyState />}</section></section>; }
function Knowledge({ openBrief }) { const cards = [['Company playbook', '12 documents', 'Core strategy, positioning, and operating principles', 'green'], ['Revenue & finance', '8 documents', 'Budgets, forecasts, pricing, and margin context', 'orange'], ['Market intelligence', '16 documents', 'Competitor notes, customer research, and trends', 'purple']]; return <section className="view"><div className="workspace-heading"><p className="mono eyebrow accent">SHARED CONTEXT</p><h2>Knowledge<br /><em>at hand.</em></h2><p>Give your specialists a trusted context layer. These collections are ready to ground your next decision.</p></div><div className="knowledge-grid">{cards.map(([title, count, description, color]) => <button className="knowledge-card" key={title} onClick={() => openBrief(`What should I know from the ${title.toLowerCase()} before making my next decision?`)}><span className={`knowledge-icon ${color}`}>▦</span><span><b>{title}</b><small>{count}</small><p>{description}</p></span><em>Open brief ↗</em></button>)}</div><section className="panel knowledge-note"><span className="mono eyebrow">GROUNDING STATUS</span><h3>Foundry project context is connected</h3><p>Agent answers can be grounded with Azure AI Search, Blob Storage, and approved business sources.</p><button className="link-button" onClick={() => openBrief('Which knowledge sources should we connect first for a grounded business assistant?')}>Ask about sources →</button></section></section>; }
function Profile() { return <section className="view"><div className="workspace-heading"><p className="mono eyebrow accent">YOUR WORKSPACE</p><h2>Profile &<br /><em>preferences.</em></h2><p>Personalize how AgentGrid works with your team and business context.</p></div><section className="profile-card panel"><div className="profile-identity"><span className="profile-avatar">A</span><div><h3>Workspace operator</h3><p>Workspace owner</p></div><span className="connected-pill"><i className="status-dot" />Active</span></div><div className="profile-fields"><label>Workspace name<input value="AgentGrid business team" readOnly /></label><label>Default response style<select defaultValue="decision"><option value="decision">Decision-ready</option><option value="detailed">Detailed analysis</option><option value="brief">Executive brief</option></select></label></div><div className="profile-footer"><span className="mono eyebrow">MICROSOFT FOUNDRY</span><b>Connected project · 4 agents configured</b></div></section></section>; }
function Metric({ label, value, note }) { return <article className="metric"><span className="mono eyebrow">{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function PanelTitle({ label, title, action }) { return <div className="panel-title"><div><span className="mono eyebrow">{label}</span><h3>{title}</h3></div>{action}</div>; }
function HistoryRow({ item, onClick }) { const agent = AGENTS[item.agent] || AGENTS.general; return <button className="history-row" onClick={onClick}><span className={`history-avatar ${agent.color}`}>{agent.icon}</span><span><b>{item.message}</b><small>{agent.label} · {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></span><em>↗</em></button>; }
function EmptyState() { return <div className="empty"><span>◌</span><b>No briefs yet</b><small>Your questions and agent responses will appear here.</small></div>; }

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
