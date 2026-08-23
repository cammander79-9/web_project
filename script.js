const scanBtn = document.getElementById('scanBtn');
const targetInput = document.getElementById('targetUrl');
const consentBox = document.getElementById('consentBox');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

function badge(text, kind) {
  return `<span class="badge ${kind}">${text}</span>`;
}

function renderHeaders(headers) {
  const el = document.getElementById('headersList');
  el.innerHTML = headers.map(h => {
    const kind = h.present ? 'ok' : (h.importance === 'high' ? 'danger' : 'warn');
    const text = h.present ? 'present' : 'missing';
    return `<div class="row"><span>${h.label}</span>${badge(text, kind)}</div>`;
  }).join('');
}

function renderCert(cert) {
  const el = document.getElementById('certInfo');
  if (!cert) {
    el.innerHTML = `<p class="empty">No certificate info (site may be HTTP, or the check failed).</p>`;
    return;
  }
  el.innerHTML = `
    <div class="row"><span>Issuer</span><span>${cert.issuer}</span></div>
    <div class="row"><span>Valid from</span><span>${cert.validFrom}</span></div>
    <div class="row"><span>Valid to</span><span>${cert.validTo}</span></div>
    <div class="row"><span>Protocol</span><span>${cert.protocol}</span></div>
  `;
}

function renderLibraries(libs) {
  const el = document.getElementById('librariesList');
  if (!libs.length) {
    el.innerHTML = `<p class="empty">No recognized libraries found in page scripts.</p>`;
    return;
  }
  el.innerHTML = libs.map(l => `
    <div class="row">
      <span>${l.library} ${l.version}</span>
      ${l.outdated ? badge('outdated', 'danger') : badge('ok', 'ok')}
    </div>
    ${l.outdated ? `<p class="empty">${l.note}</p>` : ''}
  `).join('');
}

function renderCookies(cookies) {
  const el = document.getElementById('cookiesList');
  if (!cookies.length) {
    el.innerHTML = `<p class="empty">No cookies set on this response.</p>`;
    return;
  }
  el.innerHTML = cookies.map(c => `
    <div class="row"><span>${c.cookie}</span>
      ${c.secure ? badge('Secure', 'ok') : badge('no Secure', 'warn')}
      ${c.httpOnly ? badge('HttpOnly', 'ok') : badge('no HttpOnly', 'warn')}
      ${c.sameSite ? badge('SameSite', 'ok') : badge('no SameSite', 'warn')}
    </div>
  `).join('');
}

function renderMixed(list) {
  const el = document.getElementById('mixedList');
  if (!list.length) {
    el.innerHTML = `<p class="empty">No mixed HTTP content found.</p>`;
    return;
  }
  el.innerHTML = list.map(u => `<div class="row"><span>${u}</span>${badge('http', 'warn')}</div>`).join('');
}

function renderPaths(paths) {
  const el = document.getElementById('pathsList');
  el.innerHTML = paths.map(p => `
    <div class="row"><span>${p.path}</span>${p.exposed ? badge('exposed', 'danger') : badge('not found', 'ok')}</div>
  `).join('');
}

scanBtn.addEventListener('click', async () => {
  const url = targetInput.value.trim();
  if (!url) {
    statusEl.textContent = 'Enter a URL first.';
    return;
  }
  if (!consentBox.checked) {
    statusEl.textContent = 'Please confirm you own or are authorized to test this site.';
    return;
  }

  scanBtn.disabled = true;
  statusEl.textContent = 'Scanning...';
  resultsEl.classList.add('hidden');

  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Scan failed');

    renderHeaders(data.securityHeaders);
    renderCert(data.certificate);
    renderLibraries(data.libraries);
    renderCookies(data.cookies);
    renderMixed(data.mixedContent);
    renderPaths(data.sensitivePaths);

    resultsEl.classList.remove('hidden');
    statusEl.textContent = `Done. HTTP ${data.status} from ${data.target}`;
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
  } finally {
    scanBtn.disabled = false;
  }
});
