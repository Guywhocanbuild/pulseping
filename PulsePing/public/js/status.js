const slug = window.location.pathname.split('/').pop();
let statusChart = null;

function timeAgo(dateStr) {
  if (!dateStr) return 'never';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

async function loadStatus() {
  try {
    const res = await fetch(`/api/status/${slug}`);
    if (!res.ok) {
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('notFoundState').style.display = 'block';
      return;
    }
    const data = await res.json();
    render(data);
  } catch (err) {
    console.error(err);
  }
}

function render(data) {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('statusContent').style.display = 'block';

  document.getElementById('pageName').textContent = data.name;
  document.getElementById('pageStatusDot').className = `status-dot ${data.status}`;

  const badge = document.getElementById('pageBadge');
  badge.className = `badge ${data.status}`;
  badge.textContent = data.status === 'up' ? 'OPERATIONAL' : data.status === 'down' ? 'DOWN' : 'UNKNOWN';

  const summary = document.getElementById('pageSummary');
  summary.textContent = data.status === 'up'
    ? `This service is responding normally, checked every ${data.intervalSeconds}s.`
    : data.status === 'down'
    ? 'This service is currently not responding as expected.'
    : 'Waiting on the first health check.';

  document.getElementById('pageUptime').textContent = data.uptimePercent != null ? `${data.uptimePercent}%` : '—';
  document.getElementById('pageLatency').textContent = data.lastLatencyMs != null ? `${Math.round(data.lastLatencyMs)} ms` : '—';
  document.getElementById('pageChecked').textContent = timeAgo(data.lastCheckedAt);

  const labels = data.pings.map((p) => new Date(p.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const values = data.pings.map((p) => p.latencyMs);
  const colors = data.pings.map((p) => (p.status === 'up' ? '#3ddc97' : '#ff5c72'));

  const ctx = document.getElementById('statusChart').getContext('2d');
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
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
}

loadStatus();
setInterval(loadStatus, 20000);
