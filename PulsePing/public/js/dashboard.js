requireAuth();

const user = getUser();
if (user) document.getElementById('userGreeting').textContent = user.name;

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearSession();
  window.location.href = '/login.html';
});

let monitors = [];
let activeMonitorId = null;
let latencyChart = null;
let pollTimer = null;

const listView = document.getElementById('listView');
const detailView = document.getElementById('detailView');

// ---------- Small pulse-line SVG generator (the signature motif from the landing page) ----------
function pulseLineSVG(status) {
  const isUp = status === 'up';
  const d = isUp
    ? 'M0,10 L18,10 L21,3 L25,17 L28,10 L44,10 L47,5 L50,10 L56,10'
    : 'M0,10 L56,10'; // flatline when down/unknown
  const cls = isUp ? 'animated' : '';
  const wrapClass = status === 'down' ? 'down' : '';
  return `<div class="pulse-line ${wrapClass}"><svg viewBox="0 0 56 20"><path class="${cls}" d="${d}"/></svg></div>`;
}

function timeAgo(dateStr) {
  if (!dateStr) return 'never';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ---------- List view ----------
function renderList() {
  const container = document.getElementById('monitorList');
  const empty = document.getElementById('emptyState');

  if (monitors.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  container.innerHTML = monitors
    .map((m, i) => `
      <div class="monitor-card status-${m.status}" data-id="${m._id}" style="${i > 0 ? 'border-top:1px solid var(--border);' : ''}">
        <span class="status-dot ${m.status}"></span>
        <div class="monitor-info">
          <div class="monitor-name">${escapeHtml(m.name)}</div>
          <div class="monitor-url">${escapeHtml(m.url)}</div>
        </div>
        ${pulseLineSVG(m.status)}
        <div class="monitor-metrics">
          <div class="metric">
            <div class="metric-value">${m.lastLatencyMs != null ? Math.round(m.lastLatencyMs) + 'ms' : '—'}</div>
            <div class="metric-label">Latency</div>
          </div>
          <div class="metric">
            <div class="metric-value">${m.uptimePercent != null ? m.uptimePercent + '%' : '—'}</div>
            <div class="metric-label">Uptime</div>
          </div>
          <div class="metric">
            <div class="metric-value" style="font-size:12px;">${timeAgo(m.lastCheckedAt)}</div>
            <div class="metric-label">Checked</div>
          </div>
        </div>
      </div>
    `)
    .join('');

  container.querySelectorAll('.monitor-card').forEach((el) => {
    el.addEventListener('click', () => openDetail(el.dataset.id));
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadMonitors() {
  try {
    monitors = await api('/monitors');
    renderList();
    if (activeMonitorId) refreshDetailStats();
  } catch (err) {
    if (err.status === 401) {
      clearSession();
      window.location.href = '/login.html';
    }
  }
}

// ---------- Add monitor modal ----------
const addModal = document.getElementById('addModal');
document.getElementById('addMonitorBtn').addEventListener('click', () => addModal.classList.add('show'));
document.getElementById('cancelAddBtn').addEventListener('click', () => addModal.classList.remove('show'));
addModal.addEventListener('click', (e) => { if (e.target === addModal) addModal.classList.remove('show'); });

document.getElementById('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('addError');
  errorEl.classList.remove('show');
  const btn = document.getElementById('addSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    const name = document.getElementById('mName').value.trim();
    const url = document.getElementById('mUrl').value.trim();
    const intervalSeconds = parseInt(document.getElementById('mInterval').value);
    await api('/monitors', { method: 'POST', body: { name, url, intervalSeconds } });
    addModal.classList.remove('show');
    document.getElementById('addForm').reset();
    await loadMonitors();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add monitor';
  }
});

// ---------- Detail view ----------
async function openDetail(id) {
  activeMonitorId = id;
  listView.style.display = 'none';
  detailView.style.display = 'block';
  await refreshDetailStats();
  await loadChart();
}

document.getElementById('backBtn').addEventListener('click', () => {
  activeMonitorId = null;
  detailView.style.display = 'none';
  listView.style.display = 'block';
});

async function refreshDetailStats() {
  const m = monitors.find((mo) => mo._id === activeMonitorId);
  if (!m) return;

  document.getElementById('detailName').textContent = m.name;
  document.getElementById('detailUrl').textContent = m.url;
  document.getElementById('detailStatusDot').className = `status-dot ${m.status}`;

  document.getElementById('statStatus').innerHTML = `<span class="badge ${m.status}">${m.status.toUpperCase()}</span>`;
  document.getElementById('statUptime').textContent = m.uptimePercent != null ? `${m.uptimePercent}%` : '—';
  document.getElementById('statLatency').textContent = m.lastLatencyMs != null ? `${Math.round(m.lastLatencyMs)} ms` : '—';
  document.getElementById('statChecked').textContent = timeAgo(m.lastCheckedAt);

  const link = `${window.location.origin}/s/${m.publicSlug}`;
  document.getElementById('publicLink').textContent = link;
}

async function loadChart() {
  try {
    const pings = await api(`/monitors/${activeMonitorId}/pings?limit=50`);
    const labels = pings.map((p) => new Date(p.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const data = pings.map((p) => p.latencyMs);
    const colors = pings.map((p) => (p.status === 'up' ? '#3ddc97' : '#ff5c72'));

    const ctx = document.getElementById('latencyChart').getContext('2d');
    if (latencyChart) latencyChart.destroy();

    latencyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Latency (ms)',
          data,
          borderColor: '#5b8def',
          backgroundColor: 'rgba(91,141,239,0.08)',
          pointBackgroundColor: colors,
          pointRadius: 3,
          tension: 0.25,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#5c6b85', maxTicksLimit: 8 }, grid: { color: '#1a2230' } },
          y: { ticks: { color: '#5c6b85' }, grid: { color: '#1a2230' }, beginAtZero: true },
        },
      },
    });
  } catch (err) {
    console.error('Failed to load chart', err.message);
  }
}

document.getElementById('checkNowBtn').addEventListener('click', async () => {
  const btn = document.getElementById('checkNowBtn');
  btn.disabled = true;
  btn.textContent = 'Checking...';
  try {
    await api(`/monitors/${activeMonitorId}/check-now`, { method: 'POST' });
    await loadMonitors();
    await loadChart();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Check now';
  }
});

document.getElementById('deleteBtn').addEventListener('click', async () => {
  if (!confirm('Delete this monitor? This also removes its ping history.')) return;
  await api(`/monitors/${activeMonitorId}`, { method: 'DELETE' });
  activeMonitorId = null;
  detailView.style.display = 'none';
  listView.style.display = 'block';
  await loadMonitors();
});

document.getElementById('copyLinkBtn').addEventListener('click', () => {
  const text = document.getElementById('publicLink').textContent;
  navigator.clipboard.writeText(text);
  const btn = document.getElementById('copyLinkBtn');
  const original = btn.textContent;
  btn.textContent = 'Copied!';
  setTimeout(() => (btn.textContent = original), 1500);
});

// ---------- Change password modal ----------
const passwordModal = document.getElementById('passwordModal');
document.getElementById('changePasswordBtn').addEventListener('click', () => passwordModal.classList.add('show'));
document.getElementById('cancelPasswordBtn').addEventListener('click', () => passwordModal.classList.remove('show'));
passwordModal.addEventListener('click', (e) => { if (e.target === passwordModal) passwordModal.classList.remove('show'); });

document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('passwordError');
  const successEl = document.getElementById('passwordSuccess');
  errorEl.classList.remove('show');
  successEl.classList.remove('show');

  const btn = document.getElementById('passwordSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Updating...';

  try {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const data = await api('/auth/change-password', { method: 'PUT', body: { currentPassword, newPassword } });
    successEl.textContent = data.message;
    successEl.classList.add('show');
    document.getElementById('passwordForm').reset();
    setTimeout(() => passwordModal.classList.remove('show'), 1500);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update password';
  }
});

// ---------- Live polling — keeps the dashboard fresh without websockets ----------
loadMonitors();
pollTimer = setInterval(loadMonitors, 15000);
