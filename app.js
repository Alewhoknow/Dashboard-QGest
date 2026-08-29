// ============================================================
// DASHBOARD QGEST — app.js
// Nessuna dipendenza esterna. Legge il JSON esposto dalla Apps
// Script Web App e lo rende leggibile su iPhone come PWA.
// ============================================================

const REFRESH_MS = 45000; // ogni 45 secondi

const GALLERY_ORDER = ['Modena', 'La Spezia', 'I Gigli', 'Montecatini', 'Empoli'];

const els = {
  summary: document.getElementById('summary'),
  updatedNote: document.getElementById('updated-note'),
  list: document.getElementById('list'),
  state: document.getElementById('state-screen'),
  detail: document.getElementById('detail'),
  dateEyebrow: document.getElementById('date-eyebrow'),
};

let pollTimer = null;
let lastData = null;

// ---------------- fetch ----------------
// Semplice: la PWA chiede i dati al proprio stesso sito (/api/data),
// che a sua volta li prende da Google lato server. Nessuna configurazione
// da inserire nell'app: URL e token restano sul server (variabili
// d'ambiente su Vercel), mai nel browser.

async function fetchData() {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    const data = await res.json();
    if (data && data.error) {
      showState('error', 'Configurazione mancante', data.message || 'Controlla le variabili d\'ambiente su Vercel (WEBAPP_URL, WEBAPP_TOKEN).', true);
      return;
    }
    lastData = data;
    render(data);
  } catch (err) {
    if (!lastData) {
      showState('error', 'Connessione non riuscita', 'Dettaglio tecnico: ' + err.message, true);
    }
  }
}

function boot() {
  showState('loading');
  fetchData();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(fetchData, REFRESH_MS);
}

// ---------------- stati (loading / errore) ----------------

function showState(kind, headline, sub, showRetry) {
  els.list.classList.add('hidden');
  els.summary.classList.add('hidden');
  els.state.classList.remove('hidden');

  if (kind === 'loading') {
    els.state.innerHTML = `<div class="spinner"></div><div class="headline">Carico i dati…</div>`;
    return;
  }
  els.state.innerHTML = `
    <div class="headline">${headline}</div>
    <div class="sub">${sub}</div>
    ${showRetry ? '<button class="btn primary" id="retry-btn">Riprova</button><button class="btn" id="config-btn">Modifica impostazioni</button>' : ''}
  `;
  if (showRetry) {
    document.getElementById('retry-btn').addEventListener('click', () => { showState('loading'); fetchData(); });
    document.getElementById('config-btn').addEventListener('click', () => openSettings(false));
  }
}

// ---------------- utility numeriche ----------------

const fmtInt = n => (typeof n === 'number' ? Math.round(n).toLocaleString('it-IT') : '—');
const fmtPct = n => (typeof n === 'number' ? Math.round(n * 100) + '%' : '—');

function gaugeSvg(pct, colorVar, size, idSuffix) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct || 0));
  const dash = c * clamped;
  const over = pct > 1;
  return `
    <div class="gauge-wrap">
      <svg viewBox="0 0 ${size} ${size}">
        <circle class="gauge-track" cx="${size/2}" cy="${size/2}" r="${r}"/>
        <circle class="gauge-fill" cx="${size/2}" cy="${size/2}" r="${r}"
          stroke="${over ? 'var(--c-green)' : colorVar}"
          stroke-dasharray="${dash} ${c}"/>
      </svg>
      <div class="gauge-label">${fmtPct(pct)}</div>
    </div>`;
}

function chip(colorVar, label, value) {
  return `<span class="chip"><span class="dot" style="background:${colorVar}"></span>${label} <b>${value}</b></span>`;
}

// ---------------- render lista home ----------------

function render(data) {
  els.state.classList.add('hidden');
  els.list.classList.remove('hidden');
  els.summary.classList.remove('hidden');

  const gallerie = data.gallerie || {};
  const nomi = GALLERY_ORDER.filter(n => n in gallerie);

  // riepilogo rete
  let totCommodity = 0, totSwitch = 0, totFibra = 0, pctSum = 0, pctCount = 0;
  nomi.forEach(n => {
    const k = gallerie[n];
    if (!k || k.errore) return;
    totCommodity += k.puntiCommodity || 0;
    totSwitch += k.totSwitch || 0;
    totFibra += k.fibra || 0;
    if (typeof k.targetPctCommodity === 'number') { pctSum += k.targetPctCommodity; pctCount++; }
  });
  els.summary.innerHTML = `
    <div class="stat"><span class="label">Punti commodity</span><span class="value">${fmtInt(totCommodity)}</span></div>
    <div class="stat"><span class="label">Switch totali</span><span class="value">${fmtInt(totSwitch)}</span></div>
    <div class="stat"><span class="label">Target medio</span><span class="value">${pctCount ? fmtPct(pctSum / pctCount) : '—'}</span></div>
  `;

  els.dateEyebrow.textContent = data.aggiornato
    ? 'Aggiornato ' + new Date(data.aggiornato).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Dashboard';
  els.updatedNote.textContent = data.attenzione ? '⚠ ' + data.attenzione : '';

  els.list.innerHTML = nomi.map(nome => {
    const k = gallerie[nome];
    if (!k || k.errore) {
      return `
        <div class="card card-error">
          <div class="card-body">
            <p class="name">${nome}</p>
            <p class="msg">Dati non disponibili${k?.errore ? ': ' + k.errore : ''}</p>
          </div>
        </div>`;
    }
    return `
      <div class="card" data-gallery="${nome}">
        ${gaugeSvg(k.targetPctCommodity, 'var(--c-commodity)', 62)}
        <div class="card-body">
          <p class="name">${nome}</p>
          <div class="chip-row">
            ${chip('var(--c-switch)', 'Switch', fmtInt(k.totSwitch))}
            ${chip('var(--c-switch)', 'Fibra', fmtInt(k.fibra))}
            ${chip('var(--c-nds)', 'NDS', fmtInt(k.puntiNds))}
            ${chip('var(--c-green)', 'Green', fmtInt(k.puntiGreen))}
          </div>
        </div>
        <svg class="card-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>`;
  }).join('');

  els.list.querySelectorAll('.card[data-gallery]').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.gallery, gallerie[card.dataset.gallery]));
  });
}

// ---------------- render drill-down ----------------

function renderVenditori(venditori) {
  if (!venditori || venditori.length === 0) {
    return `<p style="color:var(--text-muted); font-size:13px; margin:0;">Nessun venditore trovato per questa galleria.</p>`;
  }
  return venditori.map((v, i) => {
    const totale = (v.switchResidenziale || 0) + (v.switchBusiness || 0) + (v.fibra || 0) + (v.nds || 0) + (v.green || 0);
    return `
      <div class="seller-row" data-seller-index="${i}">
        <div class="seller-head">
          <span class="seller-name">${v.nome}</span>
          <span class="seller-total">${fmtInt(totale)} punti
            <svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </div>
        <div class="seller-detail">
          <div class="seller-detail-inner">
            <div class="seller-stat"><div class="label">Switch residenziale</div><div class="value">${fmtInt(v.switchResidenziale)}</div></div>
            <div class="seller-stat"><div class="label">Switch business</div><div class="value">${fmtInt(v.switchBusiness)}</div></div>
            <div class="seller-stat"><div class="label">Fibra</div><div class="value">${fmtInt(v.fibra)}</div></div>
            <div class="seller-stat"><div class="label">NDS</div><div class="value">${fmtInt(v.nds)}</div></div>
            <div class="seller-stat"><div class="label">Green</div><div class="value">${fmtInt(v.green)}</div></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function openDetail(nome, k) {
  els.detail.innerHTML = `
    <div class="detail-header">
      <button class="icon-btn" id="back-btn" aria-label="Indietro">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <h2>${nome}</h2>
    </div>

    <div class="detail-hero">
      ${gaugeSvg(k.targetPctCommodity, 'var(--c-commodity)', 96)}
      <div class="hero-text">
        <div class="label">Punti commodity</div>
        <div class="value">${fmtInt(k.puntiCommodity)}</div>
      </div>
    </div>

    <div class="section">
      <p class="section-title"><span class="dot" style="background:var(--c-nds)"></span>Venditori</p>
      ${renderVenditori(k.venditori)}
    </div>

    <div class="section">
      <p class="section-title"><span class="dot" style="background:var(--c-switch)"></span>Switch &amp; fibra</p>
      <div class="stat-grid">
        <div class="stat-box"><div class="label">Switch totali</div><div class="value">${fmtInt(k.totSwitch)}</div></div>
        <div class="stat-box"><div class="label">Fibra</div><div class="value">${fmtInt(k.fibra)}</div></div>
        <div class="stat-box"><div class="label">Residenziale</div><div class="value">${fmtInt(k.switchResidenziale)}</div></div>
        <div class="stat-box"><div class="label">Business</div><div class="value">${fmtInt(k.switchBusiness)}</div></div>
        <div class="stat-box"><div class="label">RID</div><div class="value">${fmtInt(k.rid)} <span style="color:var(--text-faint);font-size:12px">(${fmtPct(k.pctRid)})</span></div></div>
        <div class="stat-box"><div class="label">TAB</div><div class="value">${fmtInt(k.tab)} <span style="color:var(--text-faint);font-size:12px">(${fmtPct(k.pctTab)})</span></div></div>
      </div>
    </div>

    <div class="section">
      <p class="section-title"><span class="dot" style="background:var(--c-nds)"></span>NDS &amp; green</p>
      <div class="stat-grid">
        <div class="stat-box"><div class="label">Punti NDS</div><div class="value">${fmtInt(k.puntiNds)}</div></div>
        <div class="stat-box"><div class="label">Punti green</div><div class="value">${fmtInt(k.puntiGreen)}</div></div>
        <div class="stat-box"><div class="label">Ancillari</div><div class="value">${fmtInt(k.ndsAncillari)}</div></div>
        <div class="stat-box"><div class="label">Intermediate</div><div class="value">${fmtInt(k.ndsIntermediate)}</div></div>
        <div class="stat-box wide"><div class="label">Zero pensieri</div><div class="value">${fmtInt(k.ndsZeroPensieri)}</div></div>
      </div>
    </div>

    <div class="section">
      <p class="section-title"><span class="dot" style="background:var(--c-green)"></span>Lead &amp; adozioni</p>
      <div class="stat-grid">
        <div class="stat-box"><div class="label">Fotovoltaico</div><div class="value">${fmtInt(k.leadFotovoltaico)}</div></div>
        <div class="stat-box"><div class="label">Clima / PDC</div><div class="value">${fmtInt(k.leadClimaPdc)}</div></div>
        <div class="stat-box"><div class="label">Caldaia</div><div class="value">${fmtInt(k.leadCaldaia)}</div></div>
        <div class="stat-box"><div class="label">Wallbox</div><div class="value">${fmtInt(k.leadWallbox)}</div></div>
        <div class="stat-box wide"><div class="label">Adozioni</div><div class="value">${fmtInt(k.adozioni)}</div></div>
      </div>
    </div>

    <div class="section">
      <p class="section-title"><span class="dot" style="background:var(--c-commodity)"></span>Proiezioni fine mese</p>
      <div class="stat-grid">
        <div class="stat-box"><div class="label">Commodity</div><div class="value">${fmtInt(k.proiezioneCommodity)} <span style="color:var(--text-faint);font-size:12px">(${fmtPct(k.proiezionePctCommodity)})</span></div></div>
        <div class="stat-box"><div class="label">Fibra</div><div class="value">${fmtInt(k.proiezioneFibra)}</div></div>
        <div class="stat-box"><div class="label">NDS</div><div class="value">${fmtInt(k.proiezioneNds)}</div></div>
        <div class="stat-box"><div class="label">Green</div><div class="value">${fmtInt(k.proiezioneGreen)}</div></div>
      </div>
    </div>

    <div class="section">
      <p class="section-title">Soglie provvigionali</p>
      <div class="stat-grid">
        <div class="stat-box"><div class="label">Intermedia</div><div class="value">${fmtInt(k.sogliaIntermedia)}</div></div>
        <div class="stat-box"><div class="label">Avanzata</div><div class="value">${fmtInt(k.sogliaAvanzata)}</div></div>
        <div class="stat-box wide"><div class="label">On top</div><div class="value">${fmtInt(k.sogliaOnTop)}</div></div>
      </div>
    </div>
  `;
  els.detail.classList.add('open');
  els.detail.setAttribute('aria-hidden', 'false');
  document.getElementById('back-btn').addEventListener('click', closeDetail);
  els.detail.querySelectorAll('.seller-row').forEach(row => {
    row.querySelector('.seller-head').addEventListener('click', () => {
      row.classList.toggle('expanded');
    });
  });
}

function closeDetail() {
  els.detail.classList.remove('open');
  els.detail.setAttribute('aria-hidden', 'true');
}

// ---------------- avvio ----------------

boot();
