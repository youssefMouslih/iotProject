// Dashboard logic: SSE, chart, cards, and alert banner
(function(){
  const alertBanner = document.getElementById('alert-banner');
  const indoorTempEl = document.getElementById('indoor-temp');
  const indoorHumidityEl = document.getElementById('indoor-humidity');
  const outdoorTempEl = document.getElementById('outdoor-temp');
  const weatherCondEl = document.getElementById('weather-cond');

  // Settings modal elements
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const settingsBackdrop = settingsModal ? settingsModal.querySelector('.modal-backdrop') : null;

  if (openSettingsBtn && settingsModal) {
    openSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
    });
  }
  if (closeSettingsBtn && settingsModal) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });
  }
  if (settingsBackdrop && settingsModal) {
    settingsBackdrop.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal && !settingsModal.classList.contains('hidden')) {
      settingsModal.classList.add('hidden');
    }
  });

  const modeSelect = document.getElementById('mode-select');
  const granularitySelect = document.getElementById('granularity-select');
  const windowInput = document.getElementById('window-input');
  const thresholdInput = document.getElementById('threshold-input');
  const saveThresholdBtn = document.getElementById('save-threshold-btn');

  // Fetch threshold and show banner
  function refreshStatusBanner(){
    fetch('/status').then(r=>r.json()).then(d => {
      const thresh = d && d.threshold != null ? d.threshold : null;
      window._thresholdCache = thresh;
      alertBanner.textContent = thresh != null ? `Alert threshold: ${thresh} °C` : 'Alert threshold not available';
      alertBanner.classList.remove('hidden');
      alertBanner.style.background = '#1f2937';
      if (thresholdInput) thresholdInput.value = thresh != null ? thresh : '';
    }).catch(() => {
      alertBanner.textContent = 'Status endpoint unavailable';
      alertBanner.classList.remove('hidden');
      alertBanner.style.background = '#ef4444';
    });
  }
  refreshStatusBanner();

  // Save threshold
  if (saveThresholdBtn) {
    saveThresholdBtn.addEventListener('click', () => {
      const val = parseFloat(thresholdInput.value);
      if (Number.isNaN(val)) return;
      fetch('/config/threshold', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threshold: val }) })
        .then(r=>r.json())
        .then(() => { refreshStatusBanner(); updateChartColors(); })
        .catch(()=>{});
    });
  }

  // Chart setup with 3 datasets and dual y-axes
  const ctx = document.getElementById('tempChart').getContext('2d');
  const data = {
    labels: [],
    datasets: [
      {
        label: 'Indoor Temperature (°C)',
        data: [],
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.2)',
        pointBackgroundColor: [],
        tension: 0.25,
        yAxisID: 'yTemp'
      },
      {
        label: 'Outdoor Temperature (°C)',
        data: [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.2)',
        pointBackgroundColor: '#10b981',
        tension: 0.25,
        yAxisID: 'yTemp'
      },
      {
        label: 'Humidity (%)',
        data: [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.2)',
        pointBackgroundColor: '#f59e0b',
        tension: 0.25,
        yAxisID: 'yHumidity'
      }
    ]
  };

  const tempColor = (t, threshold) => {
    if (threshold == null) return '#60a5fa';
    if (t >= threshold) return '#ef4444'; // red
    if (t >= threshold - 2) return '#f59e0b'; // orange near threshold
    return '#10b981'; // green safe
  };

  const chart = new Chart(ctx, {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#9ca3af' }, grid: { color: '#1f2937' } },
        yTemp: { type: 'linear', position: 'left', ticks: { color: '#9ca3af' }, grid: { color: '#1f2937' } },
        yHumidity: { type: 'linear', position: 'right', ticks: { color: '#9ca3af' }, grid: { color: '#1f2937' } }
      },
      plugins: { legend: { labels: { color: '#e5e7eb' } } }
    }
  });

  function updateChartColors(){
    const thresh = window._thresholdCache;
    data.datasets[0].pointBackgroundColor = data.datasets[0].data.map(v => tempColor(v, thresh));
    chart.update();
  }

  // Polling fallback in case SSE is blocked
  function startPollingLatest(){
    if (window._poll) { try { clearInterval(window._poll); } catch(e){} }
    window._poll = setInterval(() => {
      fetch('/data/latest').then(r=>r.json()).then(rec => {
        const thresh = (window._thresholdCache);
        data.labels.push(new Date(rec.timestamp).toLocaleTimeString());
        data.datasets[0].data.push(rec.temperature);
        data.datasets[0].pointBackgroundColor.push(tempColor(rec.temperature, thresh));
        data.datasets[1].data.push(rec.outdoor_temperature != null ? rec.outdoor_temperature : null);
        data.datasets[2].data.push(rec.humidity != null ? rec.humidity : null);
        if (data.labels.length > 200) {
          data.labels.shift();
          data.datasets.forEach(ds => ds.data.shift());
          data.datasets[0].pointBackgroundColor.shift();
        }
        chart.update();
        indoorTempEl.textContent = `${rec.temperature?.toFixed(1)} °C`;
        indoorHumidityEl.textContent = rec.humidity != null ? `${rec.humidity?.toFixed(1)} %` : '-- %';
        outdoorTempEl.textContent = rec.outdoor_temperature != null ? `${rec.outdoor_temperature?.toFixed(1)} °C` : '-- °C';
        weatherCondEl.textContent = rec.weather_condition || '--';
      }).catch(()=>{});
    }, 5000);
  }

  // Live mode: initialize with recent history
  function initLive(){
    data.labels.length = 0;
    data.datasets.forEach(ds => ds.data.length = 0);
    data.datasets[0].pointBackgroundColor.length = 0;

    fetch('/data/history?limit=100').then(r=>r.json()).then(rows => {
      if (!Array.isArray(rows)) return;
      rows.reverse(); // chronological order
      const thresh = (window._thresholdCache);
      rows.forEach(rec => {
        data.labels.push(new Date(rec.timestamp).toLocaleTimeString());
        data.datasets[0].data.push(rec.temperature);
        data.datasets[0].pointBackgroundColor.push(tempColor(rec.temperature, thresh));
        data.datasets[1].data.push(rec.outdoor_temperature != null ? rec.outdoor_temperature : null);
        data.datasets[2].data.push(rec.humidity != null ? rec.humidity : null);
        indoorTempEl.textContent = `${rec.temperature?.toFixed(1)} °C`;
        indoorHumidityEl.textContent = rec.humidity != null ? `${rec.humidity?.toFixed(1)} %` : '-- %';
        outdoorTempEl.textContent = rec.outdoor_temperature != null ? `${rec.outdoor_temperature?.toFixed(1)} °C` : '-- °C';
        weatherCondEl.textContent = rec.weather_condition || '--';
      });
      chart.update();
    }).catch(()=>{});

    // Stream live updates
    if (window._es) { try { window._es.close(); } catch {} }
    if (window._poll) { try { clearInterval(window._poll); } catch(e){} }
    window._es = new EventSource('/stream');
    window._es.onopen = () => {
      // if polling was running, stop it
      if (window._poll) { try { clearInterval(window._poll); } catch(e){} }
      alertBanner.style.background = '#1f2937';
    };
    window._es.onerror = () => {
      // SSE blocked or failed; fall back to polling
      try { window._es.close(); } catch {}
      alertBanner.textContent = 'Live stream unavailable, switching to polling every 5s';
      alertBanner.classList.remove('hidden');
      alertBanner.style.background = '#f59e0b';
      startPollingLatest();
    };
    window._es.onmessage = (ev) => {
      try {
        const rec = JSON.parse(ev.data);
        const thresh = (window._thresholdCache);
        data.labels.push(new Date(rec.timestamp).toLocaleTimeString());
        data.datasets[0].data.push(rec.temperature);
        data.datasets[0].pointBackgroundColor.push(tempColor(rec.temperature, thresh));
        data.datasets[1].data.push(rec.outdoor_temperature != null ? rec.outdoor_temperature : null);
        data.datasets[2].data.push(rec.humidity != null ? rec.humidity : null);
        if (data.labels.length > 200) {
          data.labels.shift();
          data.datasets.forEach(ds => ds.data.shift());
          data.datasets[0].pointBackgroundColor.shift();
        }
        chart.update();
        indoorTempEl.textContent = `${rec.temperature?.toFixed(1)} °C`;
        indoorHumidityEl.textContent = rec.humidity != null ? `${rec.humidity?.toFixed(1)} %` : '-- %';
        outdoorTempEl.textContent = rec.outdoor_temperature != null ? `${rec.outdoor_temperature?.toFixed(1)} °C` : '-- °C';
        weatherCondEl.textContent = rec.weather_condition || '--';
      } catch {}
    };
  }

  // Aggregated mode
  function initAggregate(){
    data.labels.length = 0;
    data.datasets.forEach(ds => ds.data.length = 0);
    data.datasets[0].pointBackgroundColor.length = 0;
    if (window._es) { try { window._es.close(); } catch {} }
    if (window._poll) { try { clearInterval(window._poll); } catch(e){} }

    const gran = granularitySelect.value;
    const win = parseInt(windowInput.value, 10);
    fetch(`/data/aggregate?granularity=${encodeURIComponent(gran)}&window=${encodeURIComponent(win)}`)
      .then(r=>r.json())
      .then(points => {
        if (!Array.isArray(points)) return;
        const thresh = (window._thresholdCache);
        points.forEach(p => {
          data.labels.push(p.period);
          data.datasets[0].data.push(p.avg_indoor_temp != null ? p.avg_indoor_temp : null);
          data.datasets[0].pointBackgroundColor.push(tempColor(p.avg_indoor_temp, thresh));
          data.datasets[1].data.push(p.avg_outdoor_temp != null ? p.avg_outdoor_temp : null);
          data.datasets[2].data.push(p.avg_humidity != null ? p.avg_humidity : null);
        });
        chart.update();
      })
      .catch(()=>{});
  }

  // Mode switching
  function applyMode(){
    const mode = modeSelect.value;
    if (mode === 'aggregate') initAggregate(); else initLive();
  }

  modeSelect.addEventListener('change', applyMode);
  granularitySelect.addEventListener('change', () => { if (modeSelect.value === 'aggregate') initAggregate(); });
  windowInput.addEventListener('change', () => { if (modeSelect.value === 'aggregate') initAggregate(); });

  // Initial load
  applyMode();
})();