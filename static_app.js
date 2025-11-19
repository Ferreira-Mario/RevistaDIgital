// Menú
const menuBtn = document.getElementById('menuBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const sideMenu = document.getElementById('sideMenu');
const menuBackdrop = document.getElementById('menuBackdrop');

function openMenu() {
  if (!sideMenu || !menuBackdrop) return;
  sideMenu.classList.remove('translate-x-full');
  sideMenu.classList.add('translate-x-0');
  menuBackdrop.classList.remove('hidden');
}
function closeMenu() {
  if (!sideMenu || !menuBackdrop) return;
  sideMenu.classList.remove('translate-x-0');
  sideMenu.classList.add('translate-x-full');
  menuBackdrop.classList.add('hidden');
}

if (menuBtn) menuBtn.addEventListener('click', openMenu);
if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);
if (menuBackdrop) menuBackdrop.addEventListener('click', closeMenu);

// Cerrar menú al pulsar cualquier enlace hash
if (sideMenu) {
  // Cierra el menú cuando se hace clic en cualquier enlace con hash
  sideMenu.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link) closeMenu();
  });
}
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

const bocetosToggle = document.getElementById('bocetosToggle');
const bocetosMenu = document.getElementById('bocetosMenu');
const bocetosChevron = document.getElementById('bocetosChevron');
const resultadosToggle = document.getElementById('resultadosToggle');
const resultadosMenu = document.getElementById('resultadosMenu');
const resultadosChevron = document.getElementById('resultadosChevron');
function toggleBocetos() {
  if (!bocetosMenu || !bocetosChevron) return;
  const open = !bocetosMenu.classList.contains('hidden');
  if (open) {
    bocetosMenu.classList.add('hidden');
    bocetosChevron.style.transform = '';
  } else {
    bocetosMenu.classList.remove('hidden');
    bocetosChevron.style.transform = 'rotate(180deg)';
  }
}
if (bocetosToggle) bocetosToggle.addEventListener('click', toggleBocetos);
function toggleResultados() {
  if (!resultadosMenu || !resultadosChevron) return;
  const open = !resultadosMenu.classList.contains('hidden');
  if (open) {
    resultadosMenu.classList.add('hidden');
    resultadosChevron.style.transform = '';
  } else {
    resultadosMenu.classList.remove('hidden');
    resultadosChevron.style.transform = 'rotate(180deg)';
  }
}
if (resultadosToggle) resultadosToggle.addEventListener('click', toggleResultados);

// Navegación dentro del menú lateral (no romper si no existe)
if (sideMenu) {
  // Cierra el menú cuando se hace clic en cualquier enlace hash (#/...)
  sideMenu.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link) { closeMenu(); return; }
    // Compatibilidad: elementos con data-route (si aún existen)
    const btn = e.target.closest('[data-route]');
    if (btn && btn.dataset.route) {
      e.preventDefault();
      window.location.hash = btn.dataset.route;
      closeMenu();
    }
  });
}

// Router simple por hash
const views = {
  home: document.getElementById('view-home'),
  bocetos: document.getElementById('view-bocetos'),
  about: document.getElementById('view-about'),
};
function route() {
  const hasViews = !!(views.home || views.bocetos || views.about);
  if (!hasViews) return;
  const hash = window.location.hash || '#/';
  const parts = hash.replace('#/', '').split('/');
  const base = parts[0] || '';
  const sectionId = parts[1] || 'portada';

  if (views.home) views.home.classList.add('hidden');
  if (views.bocetos) views.bocetos.classList.add('hidden');
  if (views.about) views.about.classList.add('hidden');

  if (base === '' || base === undefined) {
    if (views.home) views.home.classList.remove('hidden');
  } else if (base === 'bocetos') {
    if (views.bocetos) views.bocetos.classList.remove('hidden');
    renderSection(sectionId);
  } else if (base === 'about') {
    if (views.about) views.about.classList.remove('hidden');
  } else {
    if (views.home) views.home.classList.remove('hidden');
  }
}
window.addEventListener('hashchange', route);
// Inicializa la vista al cargar (router si hay vistas) y render directo si se especifica sección
document.addEventListener('DOMContentLoaded', async () => {
  route();
  if (!window.votingOverride) window.votingOverride = 'open';
  const lockEl = document.getElementById('voteLock');
  if (lockEl) { try { lockEl.classList.add('hidden'); lockEl.style.display = 'none'; lockEl.remove(); } catch {} }
  const sectionAttr = (document.body && document.body.dataset) ? document.body.dataset.section : '';
  if (sectionAttr) renderSection(sectionAttr);
  const resultsGrid = document.getElementById('resultsGrid');
  const resultsSection = (document.body && document.body.dataset) ? document.body.dataset.section : '';
  if (resultsGrid && resultsSection) renderResults(resultsSection);
  const siteLogo = document.getElementById('siteLogo');
  const logoId = (window && window.siteLogoDriveId) ? window.siteLogoDriveId : '';
  const onGithub = String(window.location.hostname || '').endsWith('.github.io');
  if (siteLogo && onGithub && logoId) {
    const dUrl = resolveDriveUrl(logoId);
    if (dUrl) siteLogo.src = dUrl;
  }

  

  const sectionSelect = document.getElementById('resultsSectionSelect');
  if (sectionSelect && resultsGrid) {
    const initial = resultsSection || 'portada';
    try { sectionSelect.value = initial; } catch {}
    sectionSelect.addEventListener('change', () => {
      const val = sectionSelect.value || 'portada';
      if (document.body && document.body.dataset) document.body.dataset.section = val;
      renderResults(val);
    });
  }
});

function lsGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
function lsRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

function getCid(card, fallbackId) {
  const dId = String((card && card.dataset && card.dataset.driveId) || '').trim();
  if (dId) return `img_${dId}`;
  const cId = String((card && card.dataset && card.dataset.coverId) || '').trim();
  if (cId) return cId;
  return String(fallbackId || '').trim();
}

async function incVoteRemote(cid, delta) {
  try {
    const USE_REMOTE_VOTES = true;
    if (!USE_REMOTE_VOTES) return;
    if (!db || typeof firebase === 'undefined') return;
    const ref = db.collection('votes').doc(cid);
    if (delta < 0) {
      const snap = await ref.get();
      const current = Number((snap.exists && snap.data().count) || 0);
      if (current <= 0) return;
    }
    await ref.set({ count: firebase.firestore.FieldValue.increment(delta) }, { merge: true });
  } catch {}
}

async function listCoverIdsForSection(sectionId) {
  try {
    const items = await loadImageItems(sectionId);
    const ids = [];
    for (const it of items) {
      const driveId = String(it.driveId || extractDriveId(it.driveUrl || '') || '').trim();
      const coverId = `img_${driveId || getTitleFromPath(String(it.file||'')).toLowerCase().replace(/\s+/g, '_')}`;
      ids.push(coverId);
    }
    return Array.from(new Set(ids));
  } catch { return []; }
}

async function resetVotesSection(sectionId) {
  const ids = await listCoverIdsForSection(sectionId);
  for (const id of ids) {
    try {
      if (db) { await db.collection('votes').doc(id).set({ count: 0 }, { merge: true }); }
    } catch {}
    lsRemove(`votes_local_${id}`);
    lsRemove(`voted_${id}`);
  }
}

window.resetAllVotes = async function resetAllVotes() {
  try {
    const sections = ['portada','seccion1','seccion2','seccion3','seccion4','seccion5'];
    for (const s of sections) { await resetVotesSection(s); }
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (/^(votes_local_|voted_)/.test(String(k||''))) { try { localStorage.removeItem(k); } catch {} }
      }
    } catch {}
  } catch {}
};

window.resetVotesSection = resetVotesSection;
window.listCoverIdsForSection = listCoverIdsForSection;
var resetAllVotes = window.resetAllVotes;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const qs = new URLSearchParams(window.location.search || '');
    if (qs.get('resetAllVotes') === '1') {
      if (typeof window.resetAllVotes === 'function') { await window.resetAllVotes(); }
    }
    const sec = qs.get('resetSection');
    if (sec && typeof window.resetVotesSection === 'function') { await window.resetVotesSection(sec); }
    const sec2 = qs.get('section');
    const auth = qs.get('resetAuthor');
    if (sec2 && auth && typeof window.resetVotesByAuthor === 'function') { await window.resetVotesByAuthor(sec2, auth); }
    const cid = qs.get('resetCoverId');
    if (cid && db) {
      try { await db.collection('votes').doc(String(cid)).set({ count: 0 }, { merge: true }); } catch {}
      try { lsRemove(`votes_local_${cid}`); lsRemove(`voted_${cid}`); } catch {}
    }
  } catch {}
});

function _norm(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function resetVotesByAuthor(sectionId, authorQuery) {
  try {
    const q = _norm(authorQuery);
    const items = await loadImageItems(sectionId);
    let updated = 0;
    for (const it of items) {
      const a = _norm(it.author || getTitleFromPath(String(it.file||'')));
      if (!a || !q || a.indexOf(q) === -1) continue;
      const driveId = String(it.driveId || extractDriveId(it.driveUrl || '') || '').trim();
      const coverId = `img_${driveId || getTitleFromPath(String(it.file||'')).toLowerCase().replace(/\s+/g, '_')}`;
      try { if (db) { await db.collection('votes').doc(coverId).set({ count: 0 }, { merge: true }); } } catch {}
      lsRemove(`votes_local_${coverId}`);
      lsRemove(`voted_${coverId}`);
      updated++;
    }
    return updated;
  } catch { return 0; }
}

window.resetVotesByAuthor = resetVotesByAuthor;

function refreshCardVotes(card) {
  if (!card) return;
  const votesEl = card.querySelector('[data-role="votes"]');
  const btn = card.querySelector('[data-action="vote"]');
  const cid = getCid(card, card && card.dataset ? card.dataset.coverId : '');
  const count = Number(lsGet(`votes_local_${cid}`, '0'));
  const voted = lsGet(`voted_${cid}`, 'false') === 'true';
  if (votesEl) votesEl.textContent = String(count);
  if (btn) {
    btn.textContent = voted ? 'Quitar voto' : 'Votar';
    if (voted) {
      btn.className = 'btn-primary flex-1 px-5 py-3 min-h-[48px] text-base sm:text-lg whitespace-nowrap cursor-pointer';
    } else {
      btn.className = 'btn-danger flex-1 px-5 py-3 min-h-[48px] text-base sm:text-lg whitespace-nowrap cursor-pointer';
    }
  }
}

// Inicialización Firebase + Firestore
let db = null;
let _dbReadyResolve = null;
const dbReady = new Promise((resolve) => { _dbReadyResolve = resolve; });
(async function initFirebase() {
  if (!window.firebaseConfig || typeof firebase === 'undefined') {
    console.warn('Firebase no está disponible o falta firebase_config.js.');
    return;
  }
  try {
    firebase.initializeApp(window.firebaseConfig);
  } catch (e) {
    // Puede fallar si ya está inicializado; ignoramos
  }
  try {
    await firebase.auth().signInAnonymously();
  } catch (e) {
    console.warn('Auth anónima falló:', e);
  }
  try {
    db = firebase.firestore();
    try { await db.enablePersistence({ synchronizeTabs: true }); } catch {}
  } catch (e) {
    console.warn('Firestore no disponible:', e);
  }
  if (db && typeof _dbReadyResolve === 'function') { try { _dbReadyResolve(); } catch {} }
  try {} catch {}
})();

// SISTEMA DE VOTACIÓN SIMPLE - Sin Firestore, solo localStorage

// Cargar portadas desde JSON
let coversCache = [];
async function loadCovers() {
  if (coversCache.length) return coversCache;
  try {
    const r = await fetch('./portadas.json');
    if (!r.ok) throw new Error('No se pudo cargar portadas.json');
    coversCache = await r.json();
  } catch (e) {
    // Fallback de ejemplo
    coversCache = [
      { id: 'ejemplo-1', title: 'Portada Ejemplo', author: 'Jane Doe', description: 'Portada de muestra', section: 'portada', pdfPath: './pdfs/sample.pdf' },
      { id: 'ejemplo-2', title: 'Sección 1 Ejemplo', author: 'John Smith', description: 'Sección 1', section: 'seccion1', pdfPath: './pdfs/sample.pdf' },
    ];
  }
  return coversCache;
}

// Render de sección (lee votos online)
// Sección y votos
const coversGrid = document.getElementById('coversGrid');
const sectionTitleEl = document.getElementById('sectionTitle');
const sectionNames = {
  portada: 'Portada',
  seccion1: '1ª Sección',
  seccion2: '2ª Sección',
  seccion3: '3ª Sección',
  seccion4: '4ª Sección',
  seccion5: '5ª Sección',
};
async function renderSection(sectionId) {
  if (!coversGrid) return;
  // Cancelar suscripciones previas antes de renderizar
  for (const unsub of voteUnsubs.values()) { try { unsub(); } catch {} }
  voteUnsubs.clear();

  if (sectionTitleEl) sectionTitleEl.textContent = sectionNames[sectionId] || 'Bocetos';
  coversGrid.innerHTML = '';

  // Render basado en índice de Drive para todas las secciones
  if (sectionId === 'portada' || (String(sectionId||'').startsWith('seccion'))) {
    const items = await loadImageItems(sectionId);
    if (!items.length) {
      coversGrid.innerHTML = `<div class="text-center py-10 text-gray-500 col-span-full">No hay imágenes. Verifica el feed de Drive o la subcarpeta correspondiente en Google Drive.</div>`;
      return;
    }

    items.forEach(async (item) => {
      const file = String(item.file || '').trim();
      const authorName = item.author || displayNameOverrides(getTitleFromPath(file));
      const displayTitle = `${sectionNames[sectionId] || sectionId} (boceto)`;
      const coverId = `img_${getTitleFromPath(file).toLowerCase().replace(/\s+/g, '_')}`;

      const card = document.createElement('article');
      card.className = 'group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow min-h-[340px]';
      card.innerHTML = `
        <div class="h-56 sm:h-72 bg-gray-100 overflow-hidden relative" data-role="header">
          <img alt="Miniatura de ${displayTitle}" loading="lazy"
               class="w-full h-full object-cover transform transition-transform duration-300 ease-out group-hover:scale-110"
               data-role="thumb">
        </div>
        <div class="p-6">
          <h3 class="text-2xl sm:text-3xl font-bold mb-1">${authorName}</h3>
          <p class="text-gray-600 mb-4 line-clamp-2">${displayTitle}</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 items-stretch">
            <button class="btn-outline flex-1 px-5 py-3 min-h-[48px] text-base sm:text-lg whitespace-nowrap" data-action="info">Info</button>
            <button class="btn-primary flex-1 px-5 py-3 min-h-[48px] text-base sm:text-lg whitespace-nowrap flex items-center justify-center gap-2" data-action="view">
              <img alt="" class="w-6 h-6 sm:w-7 sm:h-7 rounded object-cover" data-role="mini" style="pointer-events:none; display:inline-block;">
              Ver
            </button>
            <button class="btn-danger flex-1 px-5 py-3 min-h-[48px] text-base sm:text-lg whitespace-nowrap cursor-pointer" data-action="vote">Votar</button>
          </div>
          <div class="text-center mt-2">
            <span class="text-3xl sm:text-4xl font-bold text-brand" data-role="votes">0</span>
            <span class="text-gray-500 ml-2">votos</span>
          </div>
        </div>
      `;
      coversGrid.appendChild(card);

      // Guarda datos para la delegación (coverId se ajusta más abajo con driveId si existe)
      card.dataset.scope = sectionId;
      card.dataset.file = file;
      card.dataset.author = authorName;
      card.dataset.title = displayTitle;
      card.dataset.coverId = coverId;

      const thumbEl = card.querySelector('[data-role="thumb"]');
      const miniEl = card.querySelector('[data-role="mini"]');
      const votesEl = card.querySelector('[data-role="votes"]');

      const headerEl = card.querySelector('[data-role="header"]');
      const driveId = String(item && (item.driveId || extractDriveId(item.driveUrl || '')) || '').trim();
      const dUrl = driveId ? resolveDriveUrl(driveId) : '';
      card.dataset.driveId = driveId;
      if (driveId) {
        const prevCid = String(card.dataset.coverId || '').trim();
        const nextCid = `img_${driveId}`;
        card.dataset.coverId = nextCid;
        if (prevCid && prevCid !== nextCid) {
          const prevVotes = lsGet(`votes_local_${prevCid}`, null);
          const prevVoted = lsGet(`voted_${prevCid}`, null);
          if (prevVotes !== null && lsGet(`votes_local_${nextCid}`, null) === null) lsSet(`votes_local_${nextCid}`, prevVotes);
          if (prevVoted !== null && lsGet(`voted_${nextCid}`, null) === null) lsSet(`voted_${nextCid}`, prevVoted);
        }
      }
      if (dUrl) {
        thumbEl.src = dUrl;
        thumbEl.addEventListener('load', () => { miniEl.src = thumbEl.src; });
        card.dataset.imageUrl = dUrl;
        refreshCardVotes(card);
      } else {
        // Intento de resolución por nombre dentro de la subcarpeta de la sección
        const guessedFile = String(file || '').trim();
        try {
          const idByName = await findDriveFileIdByNameInSection(sectionId, guessedFile);
          if (idByName) {
            const url2 = resolveDriveUrl(idByName);
            card.dataset.driveId = idByName;
            const prevCid2 = String(card.dataset.coverId || '').trim();
            const nextCid2 = `img_${idByName}`;
            card.dataset.coverId = nextCid2;
            if (prevCid2 && prevCid2 !== nextCid2) {
              const prevVotes2 = lsGet(`votes_local_${prevCid2}`, null);
              const prevVoted2 = lsGet(`voted_${prevCid2}`, null);
              if (prevVotes2 !== null && lsGet(`votes_local_${nextCid2}`, null) === null) lsSet(`votes_local_${nextCid2}`, prevVotes2);
              if (prevVoted2 !== null && lsGet(`voted_${nextCid2}`, null) === null) lsSet(`voted_${nextCid2}`, prevVoted2);
            }
            card.dataset.imageUrl = url2;
            thumbEl.src = url2;
            thumbEl.addEventListener('load', () => { miniEl.src = thumbEl.src; });
            refreshCardVotes(card);
          } else {
            thumbEl.style.display = 'none';
            headerEl.className = 'h-48 sm:h-64 bg-gray-200 flex items-center justify-center text-gray-500';
            headerEl.textContent = 'Imagen desde Drive requerida';
          }
        } catch {
          thumbEl.style.display = 'none';
          headerEl.className = 'h-48 sm:h-64 bg-gray-200 flex items-center justify-center text-gray-500';
          headerEl.textContent = 'Imagen desde Drive requerida';
        }
      }

      // Votos iniciales y suscripción (con fallback local y espera a Firestore)
      const cidInit = String(card.dataset.coverId || '').trim();
      const localKey = `votes_local_${cidInit}`;
      const localCount = Number(lsGet(localKey, '0'));
      votesEl.textContent = String(localCount);
      // Solo usar contador local - sin Firestore
      
      const voteBtnInit = card.querySelector('[data-action="vote"]');
      if (voteBtnInit) {
        voteBtnInit.dataset.bound = 'true';
        const cid = getCid(card, coverId);
        let voteCount = parseInt(lsGet(`votes_local_${cid}`, '0'));
        let hasVoted = lsGet(`voted_${cid}`, 'false') === 'true';
        if (votesEl) {
          votesEl.textContent = voteCount.toString();
        }
        voteBtnInit.textContent = hasVoted ? 'Quitar voto' : 'Votar';
        if (hasVoted) {
          voteBtnInit.className = 'btn-primary flex-1 px-5 py-3 min-h-[48px] text-base sm:text-lg whitespace-nowrap cursor-pointer';
        } else {
          voteBtnInit.className = 'btn-danger flex-1 px-5 py-3 min-h-[48px] text-base sm:text-lg whitespace-nowrap cursor-pointer';
        }
        voteBtnInit.addEventListener('click', function(e) {
          e.stopPropagation();
          if (hasVoted) {
            voteCount = Math.max(0, voteCount - 1);
            hasVoted = false;
            lsRemove(`voted_${cid}`);
            voteBtnInit.textContent = 'Votar';
            voteBtnInit.className = 'btn-danger flex-1 px-5 py-3 min-h-[48px] text-base sm:text-lg whitespace-nowrap cursor-pointer';
            incVoteRemote(cid, -1);
          } else {
            voteCount = voteCount + 1;
            hasVoted = true;
            lsSet(`voted_${cid}`, 'true');
            voteBtnInit.textContent = 'Quitar voto';
            voteBtnInit.className = 'btn-primary flex-1 px-5 py-3 min-h-[48px] text-base sm:text-lg whitespace-nowrap cursor-pointer';
            incVoteRemote(cid, +1);
          }
          lsSet(`votes_local_${cid}`, voteCount.toString());
          votesEl.textContent = voteCount;
        });
        if (db && USE_REALTIME) {
          try {
            const snapNow = await db.collection('votes').doc(cid).get();
            const remoteNow = Number((snapNow.exists && snapNow.data().count) || 0);
            const mergedNow = Math.max(voteCount, remoteNow);
            votesEl.textContent = String(mergedNow);
            lsSet(`votes_local_${cid}`, String(mergedNow));
          } catch {}
        }
      }

        if (USE_REALTIME) {
          const cid = String(card.dataset.driveId ? `img_${card.dataset.driveId}` : (card.dataset.coverId || coverId || '')).trim();
          const subscribe = () => {
            const ref = db.collection('votes').doc(cid);
            const unsub = ref.onSnapshot((snap) => {
                const data = snap.exists ? snap.data() : null;
                const remote = Number((data && data.count) || 0);
                const localVal = Number(lsGet(`votes_local_${cid}`, '0'));
                const merged = Math.max(localVal, remote);
                votesEl.textContent = String(merged);
                lsSet(`votes_local_${cid}`, String(merged));
            }, (err) => console.warn('onSnapshot error:', err));
            voteUnsubs.set(cid, unsub);
          };
          if (db) subscribe(); else dbReady.then(() => subscribe());
        }
  });

  return;
  }

  const covers = (await loadCovers()).filter(c => c.section === sectionId);

  sectionTitleEl.textContent = sectionNames[sectionId] || 'Bocetos';
  coversGrid.innerHTML = '';
  if (!covers.length) {
    coversGrid.innerHTML = `<div class="text-center py-10 text-gray-500 col-span-full">No hay portadas en esta sección</div>`;
    return;
  }

  covers.forEach(async (cover) => {
    const titleDetected = `${sectionNames[sectionId] || sectionId} (boceto)`;

    const card = document.createElement('article');
    card.className = 'group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow';
    card.dataset.coverId = cover.id;

    const cidBase = (card.dataset.driveId ? `img_${card.dataset.driveId}` : (String(card.dataset.coverId||'').trim() || cover.id));
    let votedLocal = lsGet(`voted_${cidBase}`, 'false') === 'true';
    card.innerHTML = `
      <div class="h-56 sm:h-72 bg-gray-100 overflow-hidden relative" data-role="header">
        <img alt="Miniatura de ${titleDetected}" loading="lazy"
             class="w-full h-full object-cover transform transition-transform duration-300 ease-out group-hover:scale-110"
             data-role="thumb">
      </div>
      <div class="p-6">
        <h3 class="text-2xl sm:text-3xl font-bold mb-2">${titleDetected}</h3>
        <p class="text-gray-600 mb-4 line-clamp-2">${cover.description || ''}</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 items-stretch">
          <button class="flex-1 px-5 py-3 min-h-[48px] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-base sm:text-lg whitespace-nowrap" data-action="info">Info</button>
          <button class="flex-1 px-5 py-3 min-h-[48px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-base sm:text-lg whitespace-nowrap" data-action="view">
            <img alt="" class="w-6 h-6 sm:w-7 sm:h-7 rounded object-cover" data-role="mini">
            Ver
          </button>
          <button class="flex-1 px-5 py-3 min-h-[48px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-base sm:text-lg whitespace-nowrap cursor-pointer" data-action="vote">Votar</button>
        </div>
        <div class="text-center">
          <span class="text-3xl sm:text-4xl font-bold text-indigo-600" data-role="votes">0</span>
          <span class="text-gray-500 ml-2">votos</span>
        </div>
      </div>
    `;
    coversGrid.appendChild(card);

    // Cargar imagen probando candidatos (PNG primero, variantes y normalizaciones)
    const imgEl = card.querySelector('[data-role="thumb"]');
    const miniEl = card.querySelector('[data-role="mini"]');
    let currentImageSrc = null;
    const candidates = getImageCandidates(cover);
    loadImageWithCandidates(
      imgEl,
      candidates,
      (okSrc) => { currentImageSrc = okSrc; miniEl.src = okSrc; },
      () => {
        const headerEl = card.querySelector('[data-role="header"]');
        imgEl.style.display = 'none';
        miniEl.style.display = 'none';
        headerEl.className = 'h-48 sm:h-64 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white';
        headerEl.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16h8M8 12h8M8 8h8" />
          </svg>
        `;
      }
    );

    const votesEl = card.querySelector('[data-role="votes"]');
    const infoBtn = card.querySelector('[data-action="info"]');
    const viewBtn = card.querySelector('[data-action="view"]');
    const voteBtn = card.querySelector('[data-action="vote"]');

    // Votos iniciales rápidos y carga diferida
    const localKey = `votes_local_${cidBase}`;
    const localCount = Number(lsGet(localKey, '0'));
    votesEl.textContent = String(localCount);
    voteBtn.disabled = false;
    const cidChk = (card.dataset.driveId ? `img_${card.dataset.driveId}` : (card.dataset.coverId || cover.id));
    const localVotedState = lsGet(`voted_${cidChk}`, 'false') === 'true';
    voteBtn.textContent = localVotedState ? 'Quitar voto' : 'Votar';
    // Solo usar contador local - sin Firestore
    votesEl.textContent = String(localCount);
    
    const observer2 = new IntersectionObserver(async (entries, obs) => {
      if (!entries.some(e => e.isIntersecting)) return;
      // Solo usar contador local - sin Firestore
      try {
        const cidChk = (card.dataset.driveId ? `img_${card.dataset.driveId}` : (card.dataset.coverId || cover.id));
        const localVotedNow = lsGet(`voted_${cidChk}`, 'false') === 'true';
        voteBtn.textContent = localVotedNow ? 'Quitar voto' : 'Votar';
        lsSet(`voted_${cidChk}`, localVotedNow ? 'true' : 'false');
      } catch {}
      obs.disconnect();
    }, { root: null, threshold: 0.2 });
    observer2.observe(card);

    infoBtn.addEventListener('click', () => showInfo({
      Título: titleDetected,
      Autor: cover.author,
      Sección: sectionNames[cover.section] || cover.section,
      Descripción: cover.description || '—',
      Archivo: (currentImageSrc || cover.imagePath || '—')
    }));

      viewBtn.addEventListener('click', async () => {
        let fullUrl = currentImageSrc;
        if (!fullUrl) fullUrl = await resolveThumbnailUrl(cover);
        if (!fullUrl) { alert('No se pudo abrir la imagen.'); return; }
        openImageViewer(fullUrl, titleDetected);
      });

      // NUEVO SISTEMA DE VOTACIÓN SIMPLE
      const voteBtn2 = card.querySelector('[data-action="vote"]');
      if (voteBtn2) {
        voteBtn2.dataset.bound = 'true';
        const cid = getCid(card, cidBase);
        let voteCount = parseInt(lsGet(`votes_local_${cid}`, '0'));
        let hasVoted = lsGet(`voted_${cid}`, 'false') === 'true';
        if (votesEl) {
          votesEl.textContent = voteCount.toString();
        }
        voteBtn2.textContent = hasVoted ? 'Quitar voto' : 'Votar';
        if (hasVoted) {
          voteBtn2.className = 'flex-1 px-5 py-3 min-h-[48px] bg-red-600 text-white rounded-lg hover:bg-red-700 text-base sm:text-lg whitespace-nowrap cursor-pointer';
        } else {
          voteBtn2.className = 'flex-1 px-5 py-3 min-h-[48px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-base sm:text-lg whitespace-nowrap cursor-pointer';
        }
        voteBtn2.addEventListener('click', function(e) {
          e.stopPropagation();
          if (hasVoted) {
            voteCount = Math.max(0, voteCount - 1);
            hasVoted = false;
            lsRemove(`voted_${cid}`);
            voteBtn2.textContent = 'Votar';
            voteBtn2.className = 'flex-1 px-5 py-3 min-h-[48px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-base sm:text-lg whitespace-nowrap cursor-pointer';
            incVoteRemote(cid, -1);
          } else {
            voteCount = voteCount + 1;
            hasVoted = true;
            lsSet(`voted_${cid}`, 'true');
            voteBtn2.textContent = 'Quitar voto';
            voteBtn2.className = 'flex-1 px-5 py-3 min-h-[48px] bg-red-600 text-white rounded-lg hover:bg-red-700 text-base sm:text-lg whitespace-nowrap cursor-pointer';
            incVoteRemote(cid, +1);
          }
          lsSet(`votes_local_${cid}`, voteCount.toString());
          votesEl.textContent = voteCount;
        });
        if (db && USE_REALTIME) {
          try {
            const snapNow2 = await db.collection('votes').doc(cid).get();
            const remoteNow2 = Number((snapNow2.exists && snapNow2.data().count) || 0);
            const mergedNow2 = Math.max(voteCount, remoteNow2);
            votesEl.textContent = String(mergedNow2);
            lsSet(`votes_local_${cid}`, String(mergedNow2));
          } catch {}
        }
        if (USE_REALTIME) {
          const subscribe = () => {
            const ref = db.collection('votes').doc(cid);
            const unsub = ref.onSnapshot((snap) => {
              const data = snap.exists ? snap.data() : null;
              const remote = Number((data && data.count) || 0);
              const localVal = Number(lsGet(`votes_local_${cid}`, '0'));
              const merged = Math.max(localVal, remote);
              votesEl.textContent = String(merged);
              lsSet(`votes_local_${cid}`, String(merged));
            }, (err) => console.warn('onSnapshot error:', err));
            voteUnsubs.set(cid, unsub);
          };
          if (db) subscribe(); else dbReady.then(() => subscribe());
        }
      }

    // Listener de votar centralizado arriba (voteBtn2)
  });
}

// Info popup
const infoPopup = document.getElementById('infoPopup');
const infoList = document.getElementById('infoList');
const closeInfoBtn = document.getElementById('closeInfoBtn');
function showInfo(info) {
  infoList.innerHTML = '';
  for (const [k, v] of Object.entries(info)) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${k}:</strong> ${v}`;
    infoList.appendChild(li);
  }
  infoPopup.classList.remove('hidden');
}
if (closeInfoBtn) closeInfoBtn.addEventListener('click', () => infoPopup.classList.add('hidden'));
// Cierra al hacer clic en el fondo (backdrop)
if (infoPopup) {
    infoPopup.addEventListener('click', (e) => {
        if (e.target === infoPopup) infoPopup.classList.add('hidden');
    });
}

// Utilidades para PDF
function isPdf(path) {
  return typeof path === 'string' && path.toLowerCase().endsWith('.pdf');
}
function resolvePdfUrl(path) {
  try { return encodeURI(path); } catch { return path; }
}

// NUEVO: resolver URL de imagen con encoding seguro
function resolveImageUrl(path) {
  if (!path) return '';
  try {
    const trimmed = String(path).trim().replace(/\s+/g, ' ');
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    let base = trimmed;
    let prefix = '';
    if (base.startsWith('./')) { prefix = './'; base = base.slice(2); }
    else if (base.startsWith('/')) { prefix = '/'; base = base.slice(1); }
    const segments = base.split('/');
    const encoded = segments.map(seg => {
      const s = String(seg || '').trim();
      if (!s) return s;
      if (/%[0-9A-Fa-f]{2}/.test(s)) return s; // ya codificado
      return encodeURIComponent(s);
    });
    return prefix + encoded.join('/');
  } catch {
    return path;
  }
}
function extractDriveId(input) {
  try {
    const s = String(input || '').trim();
    if (!s) return '';
    const m1 = s.match(/\/file\/d\/([^/]+)\//);
    if (m1 && m1[1]) return m1[1];
    const m1b = s.match(/\/drive\/folders\/([^/?#]+)/);
    if (m1b && m1b[1]) return m1b[1];
    const m2 = s.match(/[?&]id=([^&]+)/);
    if (m2 && m2[1]) return m2[1];
    if (/^[\w-]+$/.test(s)) return s;
    return '';
  } catch { return ''; }
}
function resolveDriveUrl(idOrUrl) {
  const id = extractDriveId(idOrUrl);
  // Usa thumbnail JPEG para evitar ORB/CORB y asegurar Content-Type de imagen
  return id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w2000` : '';
}

async function listDriveFolderFiles(folderId) {
  try {
    const apiKey = (window.firebaseConfig && window.firebaseConfig.apiKey) ? window.firebaseConfig.apiKey : (window.googleApiKey || '');
    const fid = extractDriveId(folderId);
    if (!apiKey || !fid) return [];
    const q = encodeURIComponent(`'${fid}' in parents and trashed=false`);
    const fields = encodeURIComponent('files(id,name,mimeType,thumbnailLink,webContentLink)');
    const params = `q=${q}&fields=${fields}&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=name&key=${apiKey}`;
    const url = `https://www.googleapis.com/drive/v3/files?${params}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const files = Array.isArray(data.files) ? data.files : [];
    return files.filter(f => /image\//.test(String(f.mimeType||''))).map(f => ({ id: f.id, name: f.name }));
  } catch { return []; }
}
async function getDriveSubfolderId(rootFolderId, subName) {
  try {
    const apiKey = (window.firebaseConfig && window.firebaseConfig.apiKey) ? window.firebaseConfig.apiKey : (window.googleApiKey || '');
    const rid = extractDriveId(rootFolderId);
    if (!apiKey || !rid || !subName) return '';
    const q = encodeURIComponent(`'${rid}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`);
    const fields = encodeURIComponent('files(id,name)');
    const params = `q=${q}&fields=${fields}&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=name&key=${apiKey}`;
    const url = `https://www.googleapis.com/drive/v3/files?${params}`;
    const res = await fetch(url);
    if (!res.ok) return '';
    const data = await res.json();
    const files = Array.isArray(data.files) ? data.files : [];
    const norm = (s) => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
    const match = files.find(f => norm(f.name) === norm(subName));
    return match ? String(match.id||'') : '';
  } catch { return ''; }
}
async function fetchDriveFeed(feedUrl) {
  try {
    const res = await fetch(feedUrl);
    if (!res.ok) return [];
    const data = await res.json();
    const arr = Array.isArray(data) ? data : (Array.isArray(data.files) ? data.files : []);
    return arr.map(f => ({ id: String(f.id || '').trim(), name: String(f.name || '').trim() })).filter(x => x.id && x.name);
  } catch { return []; }
}


function getAllCandidateUrls(fileName, authorName, titleHint) {
  if (DRIVE_ONLY) return [];
  const DIRS = [
    './IMGs/Bocetos/Portadas',
    './IMGs/Bocetos/Sección 1'
  ];
  const bases = [fileName, authorName, titleHint].filter(Boolean);
  const fileCandidates = Array.from(new Set(bases.flatMap((b)=> makeFileCandidates(String(b||'').trim()))));
  const urls = [];
  const pushEnc = (p) => { for (const u of encodePathVariantsList(p)) urls.push(u); };
  const MAP_OVERRIDES = {
    'emilio garcia': ['Emilio García.png'],
    'fernando gonzalez': ['Fernando González.png'],
    'fatima ramirez': ['Fátima Ramírez.png'],
    'gabriel de jesus': ['Gabriel de Jesús.png'],
    'luciano perez': ['Luciano Pérez.png'],
    'mateo garduno': ['Mateo Garduño .png','Mateo Garduño.png'],
    'yael nolasco': ['Yael Nolasco .png','Yael Nolasco.png'],
    'joel hernandez': ['Joel Hernández.png','Joel_Hernandez.png'],
    'vanessa bernabe': ['Vanessa Bernabé.png','Vanessa_Bernabe.png']
  };
  const key = String((authorName||fileName||titleHint)||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const extra = MAP_OVERRIDES[key]||[];
  for (const d of DIRS) for (const f of extra) pushEnc(`${d}/${f}`);
  const exact = String(fileName||'').trim();
  if (exact) for (const d of DIRS) pushEnc(`${d}/${exact}`);
  for (const d of DIRS) for (const f of fileCandidates) pushEnc(`${d}/${f}`);
  return Array.from(new Set(urls));
}

function setImageSrcWithFallback(imgEl, candidates, headerEl, card) {
  let i = 0; const total = candidates.length;
  function tryNext() {
    if (i >= total) { if (headerEl) { headerEl.className = 'h-48 sm:h-64 bg-gray-200 flex items-center justify-center text-gray-500'; headerEl.textContent = 'Imagen no encontrada'; } return; }
    const url = candidates[i++];
    imgEl.referrerPolicy = 'no-referrer';
    imgEl.onload = () => { if (card) card.dataset.imageUrl = url; };
    imgEl.onerror = tryNext;
    imgEl.src = url;
  }
  tryNext();
}

function displayNameOverrides(name) {
  const map = {
    'diana gonzalez': 'Diana González',
    'nataly flores': 'Nataly Flores',
    'renata bravo': 'Renata Bravo',
    'sarai bolivar': 'Sarai Bolívar',
    'mateo garduno': 'Mateo Garduño',
    'joel hernandez': 'Joel Hernández',
    'emilio garcia': 'Emilio García',
    'fernando gonzalez': 'Fernando González'
  };
  const k = String(name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return map[k] || name;
}

function encodePathVariantsList(path) {
  const raw = String(path || '').trim().replace(/\s+/g, ' ');
  // NFC y NFD por segmento
  function encodeWith(normType) {
    try {
      let base = raw;
      let prefix = '';
      if (base.startsWith('./')) { prefix = './'; base = base.slice(2); }
      else if (base.startsWith('/')) { prefix = '/'; base = base.slice(1); }
      const segments = base.split('/');
      const encoded = segments.map(seg => {
        const s = String(seg || '').trim();
        if (!s) return s;
        if (/%[0-9A-Fa-f]{2}/.test(s)) return s;
        const norm = s.normalize(normType);
        return encodeURIComponent(norm);
      });
      return prefix + encoded.join('/');
    } catch { return raw; }
  }
  const nfc = encodeWith('NFC');
  const nfd = encodeWith('NFD');
  const out = [];
  if (raw) out.push(raw);
  if (nfc && !out.includes(nfc)) out.push(nfc);
  if (nfd && !out.includes(nfd)) out.push(nfd);
  return out;
}

// Utilidades para imágenes (reemplaza getImageCandidates por esta versión)
// Actualiza getImageCandidates: fuerza carpeta ./pdfs/Portadas/img y variantes robustas
// getImageCandidates(cover)
function getImageCandidates(cover) {
  return [];
  const DIRS = [
    './IMGs/Bocetos/portada',
    './IMGs/Bocetos/seccion1',
    './IMGs/Bocetos/Sección 1',
    './imgs/Bocetos/portada',
    './imgs/Bocetos/seccion1',
    './imgs/Bocetos/Sección 1',
    './Imagenes/Bocetos/Sección 1',
    './IMGs/Portadas/img',
    './imgs/Portadas/img',
    './bocetos/portada',
    './bocetos/seccion1',
    './Imagenes/Portadas/img',
    './Imagagenes/Portadas/img',
    './pdfs/Portadas/img'
  ];

  function normalizeBase(p) {
    const decoded = decodeURI(p || '');
    const trimmed = decoded.trim().replace(/\s+/g, ' ');
    return trimmed.replace(/\.(png|jpe?g|webp|pdf)$/i, '');
  }
  function removeAccents(s) {
    try { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch { return s; }
  }
  function nameVariants(base) {
    const norm = base.trim().replace(/\s+/g, ' ');
    const noAcc = removeAccents(norm);
    const variants = [
      norm, noAcc,
      norm.replace(/ /g, '_'), norm.replace(/ /g, '-'), norm.replace(/ /g, ''),
      noAcc.replace(/ /g, '_'), noAcc.replace(/ /g, '-'), noAcc.replace(/ /g, ''),
      norm.toLowerCase(), noAcc.toLowerCase(),
      norm.toLowerCase().replace(/ /g, '_'), norm.toLowerCase().replace(/ /g, '-'), norm.toLowerCase().replace(/ /g, ''),
      noAcc.toLowerCase().replace(/ /g, '_'), noAcc.toLowerCase().replace(/ /g, '-'), noAcc.toLowerCase().replace(/ /g, ''),
    ];
    return Array.from(new Set(variants.filter(Boolean)));
  }

  const bases = new Set();
  if (cover.imagePath) bases.add(normalizeBase(cover.imagePath));
  if (cover.pdfPath) bases.add(normalizeBase(cover.pdfPath));
  if (bases.size === 0) bases.add('thumbnail');

  const urls = [];

  // Si imagePath apunta ya a img, colócalo primero
  if (cover.imagePath && /\/(Imagenes|Imagagenes|pdfs)\/Portadas\/img\//.test(String(cover.imagePath))) {
    for (const u of encodePathVariantsList(cover.imagePath)) urls.push(u);
  }

  const extsLower = ['png', 'jpg', 'jpeg', 'webp'];
  const extsUpper = ['PNG', 'JPG', 'JPEG', 'WEBP'];

  for (const base of bases) {
    for (const v of nameVariants(base)) {
      for (const dir of DIRS) {
        // Prioriza PNG
        for (const u of encodePathVariantsList(`${dir}/${v}.png`)) urls.push(u);
        for (const u of encodePathVariantsList(`${dir}/${v}.PNG`)) urls.push(u);
        // Luego otras extensiones
        for (const e of extsLower) { for (const u of encodePathVariantsList(`${dir}/${v}.${e}`)) urls.push(u); }
        for (const E of extsUpper) { for (const u of encodePathVariantsList(`${dir}/${v}.${E}`)) urls.push(u); }
      }
    }
  }

  return Array.from(new Set(urls));
}
// Comprueba secuencialmente candidatos y usa el primero que cargue
function loadImageWithCandidates(imgEl, candidates, onSuccess, onFail) {
  let i = 0;
  function tryNext() {
    if (i >= candidates.length) { if (onFail) onFail(); return; }
    const url = candidates[i++];
    imgEl.onerror = () => { tryNext(); };
    imgEl.onload = () => { if (onSuccess) onSuccess(url); };
    imgEl.src = url;
  }
  tryNext();
}
async function urlExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}
// Reemplaza resolveThumbnailUrl: usa sonda con Image(), no HEAD
async function resolveThumbnailUrl(cover) {
  const candidates = getImageCandidates(cover);
  return await new Promise((resolve) => {
    let i = 0;
    function tryNext() {
      if (i >= candidates.length) return resolve(null);
      const url = candidates[i++];
      const probe = new Image();
      probe.onload = () => resolve(url);
      probe.onerror = () => tryNext();
      probe.src = url;
    }
    tryNext();
  });
}
async function urlExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}
function getTitleFromPath(path) {
  try {
    const base = (path || '').split('/').pop() || '';
    return decodeURI(base).replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
  } catch {
    return 'Imagen';
  }
}

// Visor de IMAGEN (único bloque)
(function setupImageViewer() {
  const viewerModal = document.getElementById('viewerModal');
  const viewerTitle = document.getElementById('viewerTitle');
  const viewerImage = document.getElementById('viewerImage');
  const zoomIn = document.getElementById('zoomInBtn');
  const zoomOut = document.getElementById('zoomOutBtn');
  const closeBtn = document.getElementById('closeViewerBtn');

  if (!viewerModal || !viewerTitle || !viewerImage || !zoomIn || !zoomOut || !closeBtn) return;

  let imgScale = 1;
  let isViewing = false;

  function applyImageScale() { viewerImage.style.transform = `scale(${imgScale})`; }

  function closeViewer() {
      // Desactiva el onerror antes de limpiar el src para evitar alertas
      viewerImage.onerror = null;
      isViewing = false;
      viewerModal.classList.add('hidden');
      viewerImage.src = '';
      imgScale = 1;
      applyImageScale();
  }

  zoomIn.addEventListener('click', () => { imgScale = Math.min(imgScale + 0.25, 4); applyImageScale(); });
  zoomOut.addEventListener('click', () => { imgScale = Math.max(imgScale - 0.25, 0.5); applyImageScale(); });
  closeBtn.addEventListener('click', closeViewer);
  // Cierre al hacer clic en el backdrop
  viewerModal.addEventListener('click', (e) => { if (e.target === viewerModal) closeViewer(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeViewer(); });

  window.openImageViewer = async function openImageViewer(url, titleHint) {
    try {
      // Usa codificación segura sin doble-encode
      const encoded = resolveImageUrl(url);
      viewerImage.referrerPolicy = 'no-referrer';
      viewerImage.src = encoded;
      viewerTitle.textContent = titleHint || getTitleFromPath(encoded);
      imgScale = 1;
      viewerModal.classList.remove('hidden');
      viewerImage.onerror = () => {
        alert(`No se pudo abrir la imagen. Verifica la ruta y el nombre exacto:\n${encoded}`);
        viewerModal.classList.add('hidden');
      };
    } catch (e) {
      alert('No se pudo abrir la imagen.');
    }
  };
})();

// NUEVO: listeners para votos y prevención de doble voto por usuario
// Declarar voteUnsubs ANTES de usarlo en renderSection
const voteUnsubs = new Map();







// Cargar índice de imágenes para Portada
async function loadSectionIndex(sectionId) {
  const urls = [`./${sectionId}_index.json`];
  for (const u of urls) {
    try {
      const res = await fetch(u);
      if (res.ok) return await res.json();
    } catch {}
  }
  return [];
}

// Probar carga de imagen con <img> (evita HEAD que falla local)
function probeImage(url) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(true);
    im.onerror = () => resolve(false);
    im.src = url;
  });
}

// Helpers de imágenes: generar variantes y normalizar nombres
function removeAccents(s) {
  try { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch { return s; }
}
function makeFileCandidates(fileName) {
    const hasExt = /\.(png|jpe?g|webp)$/i.test(fileName || '');
    const baseRaw = hasExt ? fileName.replace(/\.(png|jpe?g|webp)$/i, '') : (fileName || '');

    // Normalizaciones robustas
    const trimmed = String(baseRaw || '').trim();
    const normSpaces = trimmed.replace(/\s+/g, ' ');                 // compacta espacios
    const fixHyphenNum = normSpaces.replace(/\s*-\s*(\d+)/g, '-$1'); // "Maxil -1" -> "Maxil-1"
    const noDots = fixHyphenNum.replace(/\./g, '');                  // "Pérez. -1" -> "Pérez -1"
    const packNum = noDots.replace(/(\S)\s+(-\d+)/g, '$1$2');        // "Perez -1" -> "Perez-1"
    const asciiPack = removeAccents(packNum);                        // sin acentos

    // Quita sufijo -n si existe
    const stripSuffix = (s) => String(s || '').replace(/-\d+$/,'');
    // Construye variantes base (incluye con y sin sufijo)
    const basesCore = Array.from(new Set([
        normSpaces, fixHyphenNum, noDots, packNum,
        removeAccents(normSpaces), removeAccents(fixHyphenNum),
        removeAccents(noDots), asciiPack,
        packNum.toLowerCase(), asciiPack.toLowerCase(),
        stripSuffix(packNum), stripSuffix(asciiPack),
        stripSuffix(packNum).toLowerCase(), stripSuffix(asciiPack).toLowerCase()
    ]));

    // Versiones con separadores
    const basesWithSeps = new Set();
    for (const b of basesCore) {
        basesWithSeps.add(b);
        basesWithSeps.add(b.replace(/ /g, '_'));
        basesWithSeps.add(b.replace(/ /g, '-'));
        basesWithSeps.add(b.replace(/ /g, ''));
    }

    // Genera variantes con y sin sufijo; si no hay sufijo, añade también "-1"
    const suffixVariants = (s) => {
        const out = new Set([s, stripSuffix(s)]);
        if (!/-\d+$/.test(s)) out.add(`${stripSuffix(s)}-1`);
        return Array.from(out);
    };
    const basesFinal = Array.from(new Set(
        Array.from(basesWithSeps).flatMap(suffixVariants)
    ));

    const extsLower = ['png', 'jpg', 'jpeg', 'webp'];
    const extsUpper = ['PNG', 'JPG', 'JPEG', 'WEBP'];
    const candidates = [];

    const addWithExt = (b, ext) => {
        candidates.push(`${b}.${ext}`);
        candidates.push(`${b}.${String(ext).toUpperCase()}`);
        // Variante con espacio accidental antes del punto (archivos mal nombrados)
        candidates.push(`${b} .${ext}`);
        candidates.push(`${b} .${String(ext).toUpperCase()}`);
    };
    if (hasExt) {
        const ext = (fileName.split('.').pop() || 'png');
        for (const bv of basesFinal) addWithExt(bv, ext);
    } else {
        for (const b of basesFinal) {
            addWithExt(b, 'png');
            for (const e of extsLower) addWithExt(b, e);
            for (const E of extsUpper) addWithExt(b, E);
        }
    }

    return Array.from(new Set(candidates));
}

// Resuelve la primera URL válida probando múltiples directorios
async function resolveImageFromDirs(fileName, authorName, titleHint) {
  if (DRIVE_ONLY && String(window.location.hostname || '').endsWith('.github.io')) return null;
  const DIRS = [
    './IMGs/Bocetos/Portadas',
    './IMGs/Bocetos/seccion1',
    './IMGs/Bocetos/Sección 1',
    './imgs/Bocetos/Portadas',
    './imgs/Bocetos/seccion1',
    './imgs/Bocetos/Sección 1',
    './Imagenes/Bocetos/Portadas',
    './Imagenes/Bocetos/Sección 1',
    './IMGs/Portadas/img',
    './imgs/Portadas/img',
    './bocetos/portada',
    './bocetos/seccion1',
    './Imagenes/Portadas/img',
    './Imagagenes/Portadas/img',
    './pdfs/Portadas/img'
  ];

    const MAP_OVERRIDES = {
      'emilio garcia': ['Emilio García.png'],
      'fernando gonzalez': ['Fernando González.png'],
      'fatima ramirez': ['Fátima Ramírez.png'],
      'gabriel de jesus': ['Gabriel de Jesús.png'],
      'luciano perez': ['Luciano Pérez.png'],
      'mateo garduno': ['Mateo Garduño .png', 'Mateo Garduño.png'],
      'yael nolasco': ['Yael Nolasco .png', 'Yael Nolasco.png'],
      'joel hernandez': ['Joel Hernández.png', 'Joel_Hernandez.png'],
      'vanessa bernabe': ['Vanessa Bernabé.png', 'Vanessa_Bernabe.png']
    };

    const bases = [fileName, authorName, titleHint].filter(Boolean);
    const fileCandidates = Array.from(new Set(
      bases.flatMap((b) => makeFileCandidates(String(b || '').trim()))
    ));

    const key = String((authorName || fileName || titleHint) || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const extraCandidates = MAP_OVERRIDES[key] || [];

  const tried = [];
  // Probar overrides primero
  for (const dir of DIRS) {
    for (const f of extraCandidates) {
      for (const u of encodePathVariantsList(`${dir}/${f}`)) {
        tried.push(u);
        if (await probeImage(u)) return u;
      }
    }
  }

  // Intentar primero el nombre exacto provisto, antes de variantes
  const exact = String(fileName || '').trim();
  if (exact) {
    for (const dir of DIRS) {
      for (const u of encodePathVariantsList(`${dir}/${exact}`)) {
        tried.push(u);
        if (await probeImage(u)) return u;
      }
    }
  }

  for (const dir of DIRS) {
    for (const f of fileCandidates) {
      for (const u of encodePathVariantsList(`${dir}/${f}`)) {
        tried.push(u);
        if (await probeImage(u)) return u;
      }
    }
  }
    console.warn('Imagen no encontrada (probados primeros 20):', tried.slice(0, 20));
    return null;
}

// Fusiona fuentes: img_index.json + portadas.json (respaldo)
async function loadImageItems(sectionId) {
  const items = [];

  try {
    const feed = (window.driveFeedUrls && window.driveFeedUrls[sectionId]) ? window.driveFeedUrls[sectionId] : '';
    let feedCount = 0;
    if (feed) {
      const listed = await fetchDriveFeed(feed);
      feedCount = Array.isArray(listed) ? listed.length : 0;
      for (const f of listed) {
        items.push({
          driveId: String(f.id || '').trim(),
          driveUrl: `https://drive.google.com/file/d/${encodeURIComponent(f.id)}/view`,
          file: String(f.name || '').trim(),
          title: getTitleFromPath(f.name || ''),
          author: displayNameOverrides(getTitleFromPath(f.name || '')),
          description: ''
        });
      }
    }
    const cfg = (window.driveFolders && window.driveFolders[sectionId]) ? window.driveFolders[sectionId] : (window.driveFolderId || '');
    if (cfg && !feedCount) {
      const listed = await listDriveFolderFiles(cfg);
      for (const f of listed) {
        items.push({
          driveId: String(f.id || '').trim(),
          driveUrl: `https://drive.google.com/file/d/${encodeURIComponent(f.id)}/view`,
          file: String(f.name || '').trim(),
          title: getTitleFromPath(f.name || ''),
          author: displayNameOverrides(getTitleFromPath(f.name || '')),
          description: ''
        });
      }
    }
    const rootId = window.driveRootFolderId || '';
    if (rootId && !feedCount && !cfg) {
      const mapNames = { portada: 'Portadas', seccion1: 'Sección 1', seccion2: 'Sección 2', seccion3: 'Sección 3', seccion4: 'Sección 4', seccion5: 'Sección 5' };
      const subName = mapNames[sectionId] || '';
      const subId = await getDriveSubfolderId(rootId, subName);
      if (subId) {
        const listed = await listDriveFolderFiles(subId);
        for (const f of listed) {
          items.push({
            driveId: String(f.id || '').trim(),
            driveUrl: `https://drive.google.com/file/d/${encodeURIComponent(f.id)}/view`,
            file: String(f.name || '').trim(),
            title: getTitleFromPath(f.name || ''),
            author: displayNameOverrides(getTitleFromPath(f.name || '')),
            description: ''
          });
        }
      }
    }
  } catch {}


  // 0) Desde drive_<section>_index.json (raíz o /data)
  if (!DRIVE_ONLY) {
    try {
      const driveItems = await fetchFirstJSON([`./drive_${sectionId}_index.json`]);
      for (const it of driveItems) {
        items.push({
          driveId: String(it.driveId || '').trim(),
          driveUrl: String(it.driveUrl || '').trim(),
          file: String(it.file || '').trim(),
          title: it.title || '',
          author: it.author || '',
          description: it.description || ''
        });
      }
    } catch {}
  }

  const onGithub = String(window.location.hostname || '').endsWith('.github.io');
  if (DRIVE_ONLY) {
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const hasDrive = (it) => !!String(it.driveId||'').trim() || !!extractDriveId(it.driveUrl||'');
    const seenIds = new Set();
    const seenNames = new Set();
    const out = [];
    for (const it of items) {
      if (!hasDrive(it)) continue;
      const id = String(it.driveId || extractDriveId(it.driveUrl || '') || '').trim().toLowerCase();
      const base = norm(String(it.file || '').replace(/\.[^/.]+$/, ''));
      const author = norm(it.author || '');
      const candidateKeys = [id, base, author].filter(Boolean);
      if (candidateKeys.some(k => seenIds.has(k) || seenNames.has(k))) continue;
      out.push(it);
      for (const k of candidateKeys) { seenIds.add(k); seenNames.add(k); }
    }
    return out;
  }

  // 1) Desde <section>_index.json
  if (!DRIVE_ONLY) {
    try {
      const idx = await loadSectionIndex(sectionId);
      for (const it of idx) {
        items.push({
          file: String(it.file || '').trim(),
          title: it.title || '',
          author: it.author || '',
          description: it.description || ''
        });
      }
    } catch {}
  }

  // 2) Respaldo: desde portadas.json
  if (!DRIVE_ONLY && sectionId !== 'portada') {
    try {
      const r = await fetch('./portadas.json');
      if (r.ok) {
        const covers = await r.json();
        for (const c of covers) {
          if (String(c.section || '') !== sectionId) continue;
          const fileCandidate = (c.imagePath ? c.imagePath.split('/').pop() : '') ||
            (c.pdfPath ? c.pdfPath.split('/').pop().replace(/\.pdf$/i, '') : getTitleFromPath(c.title || ''));
          items.push({
            file: fileCandidate,
            title: c.title || c.description || '',
            author: c.author || '',
            description: c.description || ''
          });
        }
      }
    } catch {}
  }

  // Fallback: si está en GitHub Pages, listar el directorio vía API
  try {
    const host = String(window.location.hostname || '');
    if (host.endsWith('.github.io')) {
      if (DRIVE_ONLY) throw new Error('Drive-only: omitir listado por API');
      const owner = host.replace('.github.io','');
      const pathParts = String(window.location.pathname || '/').split('/').filter(Boolean);
      let repoCandidates = Array.from(new Set([pathParts[0] || '', pathParts[1] || ''].filter(Boolean)));
      if (!repoCandidates.length) repoCandidates = [`${owner}.github.io`];
      if (owner && repoCandidates.length) {
        const dirsToScan = [
          `IMGs/Bocetos/${sectionId}`,
          `imgs/Bocetos/${sectionId}`,
          `Imagenes/Bocetos/${sectionId}`,
          sectionId === 'seccion1' ? 'IMGs/Bocetos/Sección 1' : null,
          sectionId === 'seccion1' ? 'imgs/Bocetos/Sección 1' : null,
          sectionId === 'seccion1' ? 'Imagenes/Bocetos/Sección 1' : null,
          sectionId === 'portada' ? 'IMGs/Bocetos/Portadas' : null,
          sectionId === 'portada' ? 'imgs/Bocetos/Portadas' : null,
          sectionId === 'portada' ? 'Imagenes/Bocetos/Portadas' : null,
          sectionId === 'portada' ? 'IMGs/Portadas/img' : null,
          sectionId === 'portada' ? 'imgs/Portadas/img' : null,
          sectionId === 'portada' ? 'Imagenes/Portadas/img' : null
        ].filter(Boolean);
        for (const repo of repoCandidates) {
          for (const dir of dirsToScan) {
            const api = `https://api.github.com/repos/${owner}/${repo}/contents/${dir}`;
            const res = await fetch(encodeURI(api), { headers: { 'Accept': 'application/vnd.github+json' } });
            if (res.ok) {
              const list = await res.json();
              for (const entry of list) {
                if (!entry || entry.type !== 'file') continue;
                const name = entry.name || '';
                if (!/\.(png|jpe?g|webp)$/i.test(name)) continue;
                items.push({ file: name, title: getTitleFromPath(name), author: getTitleFromPath(name), description: '' });
              }
            }
          }
        }
      }
    }
  } catch {}
  const placeholderAuthors = new Set(['Nombre de la persona autora', 'Otra persona autora', 'Nombre']);
  const placeholderTitles = new Set(['Portada informativa', 'Portada genérica']);

  const norm = (s) => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();

  const byFile = new Map();
  const hasDrive = (it) => !!String(it.driveId||'').trim() || !!extractDriveId(it.driveUrl||'');
  for (const it of items) {
    const isPlaceholder =
      placeholderAuthors.has(String(it.author || '').trim()) ||
      placeholderTitles.has(String(it.title || '').trim());
    if (isPlaceholder) continue;
    const key = norm(it.file || it.title || it.author || '');
    const prev = byFile.get(key);
    if (!prev || (hasDrive(it) && !hasDrive(prev))) byFile.set(key, it);
  }
  return Array.from(byFile.values());
}

async function findDriveFileIdByNameInSection(sectionId, filename) {
  try {
    const items = await loadImageItems(sectionId);
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\.[^/.]+$/,'').replace(/\s+/g,' ').trim().toLowerCase();
    const target = norm(filename);
    for (const it of items) {
      const byFile = norm(it.file || '');
      const byTitle = norm(it.title || '');
      const byAuthor = norm(it.author || '');
      if (target && (target === byFile || target === byTitle || target === byAuthor)) {
        const id = String(it.driveId || extractDriveId(it.driveUrl || '') || '').trim();
        if (id) return id;
      }
    }
    return '';
  } catch { return ''; }
}

async function fetchFirstJSON(urls) {
  for (const u of urls) {
    try {
      const res = await fetch(u);
      if (res.ok) return await res.json();
    } catch {}
  }
  return [];
}

// Delegación: un único listener para Info / Ver / Votar (solo Portada)
  document.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset && btn.dataset.bound === 'true') return;

  const card = btn.closest('article');
  if (!card) return;

  const action = btn.dataset.action;
  const file = card.dataset.file || '';
  const author = card.dataset.author || '';
  const title = card.dataset.title || '';
  const coverId = card.dataset.coverId || '';
  const votesEl = card.querySelector('[data-role="votes"]');

  if (action === 'info') {
    showInfo({
      Título: title,
      Autor: author,
      Sección: 'Portada',
      Archivo: card.dataset.imageUrl || file || '—',
    });
    return;
  }

  if (action === 'view') {
    let fullUrl = card.dataset.imageUrl;
    if (!fullUrl) {
      const dId = card.dataset.driveId || '';
      if (dId) {
        const dUrl = resolveDriveUrl(dId);
        if (dUrl && await probeImage(dUrl)) fullUrl = dUrl;
      }
      if (!fullUrl) fullUrl = await resolveImageFromDirs(file, author, title);
    }
    if (!fullUrl) { alert('No se pudo abrir la imagen.'); return; }
    openImageViewer(fullUrl, title);
    return;
  }

  if (action === 'vote') {
    const cid = getCid(card, coverId);
    const wasVoted = lsGet(`voted_${cid}`, 'false') === 'true';
    const currentCount = parseInt(lsGet(`votes_local_${cid}`, '0'));
    if (wasVoted) {
      const newCount = Math.max(0, currentCount - 1);
      lsSet(`votes_local_${cid}`, newCount.toString());
      lsRemove(`voted_${cid}`);
      if (votesEl) votesEl.textContent = newCount.toString();
      btn.textContent = 'Votar';
      incVoteRemote(cid, -1);
    } else {
      const newCount = currentCount + 1;
      lsSet(`votes_local_${cid}`, newCount.toString());
      lsSet(`voted_${cid}`, 'true');
      if (votesEl) votesEl.textContent = newCount.toString();
      btn.textContent = 'Quitar voto';
      incVoteRemote(cid, +1);
    }
    return;
  }
});

const themeToggleBtn = document.getElementById('themeToggleBtn');

function applyTheme(theme) {
  const html = document.documentElement;
  const next = (theme === 'mono') ? 'mono' : 'color';
  html.setAttribute('data-theme', next);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = next === 'mono' ? 'Blanco y negro' : 'Color';
  }
}

(function initTheme() {
  const saved = localStorage.getItem('siteTheme') || 'color';
  applyTheme(saved);
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = localStorage.getItem('siteTheme') || 'color';
      const next = current === 'color' ? 'mono' : 'color';
      localStorage.setItem('siteTheme', next);
      applyTheme(next);
    });
  }
})();

// Config global de feeds de Drive (merges con existente)
(function initDriveFeeds(){
  const base = 'https://script.google.com/macros/s/AKfycbwGUawSyyK9JSlOu-sSt2dFqCMo51jFZvWMa0nGoQQmQZGZQCxpTm_HvOF3JdeVxu4wjw/exec?folderId=';
  const feeds = {
    portada: base + '1TvO2V-5H_346I8go7Pm2T9IN6qw6FUzL',
    seccion1: base + '11JYPjv-3-Jc7VwMFdxd9QPi1LyRk7NoS',
    seccion2: base + '1PUTDzNC0oph2hAu8_9a7vVNHgqYsTQWq',
    seccion3: base + '1V7VlLsN6cfrrXCUCMJMklW7mpt5TO3kd',
    seccion4: base + '1CecZC0eskhRyjJM4EDMQHheAjH9b0m5Y',
    seccion5: base + '1JJooLvT2urhKKuZjhICPbX9QcTEUSm7V'
  };
  window.driveFeedUrls = Object.assign({}, window.driveFeedUrls || {}, feeds);
})();

function getNextVotingTime() {
  const now = new Date();
  let year = now.getFullYear();
  const nov = 10;
  if (now.getMonth() > nov) year += 1;
  const base = new Date(year, nov, 1, 11, 20, 0, 0);
  if (now.getMonth() < nov) {
    const dow = base.getDay();
    const add = (2 - dow + 7) % 7; // 2 = martes
    base.setDate(1 + add);
    return base;
  }
  if (now.getMonth() === nov) {
    const d = new Date(now.getFullYear(), nov, now.getDate(), 11, 20, 0, 0);
    let tues = new Date(d);
    const dow = d.getDay();
    const add = (2 - dow + 7) % 7;
    tues.setDate(d.getDate() + add);
    if (tues < now) tues.setDate(tues.getDate() + 7);
    return tues;
  }
  return base;
}

async function renderResults(sectionId) {
  const resultsGrid = document.getElementById('resultsGrid');
  const titleEl = document.getElementById('resultsTitle');
  if (!resultsGrid) return;
  if (titleEl) titleEl.textContent = (sectionId === 'portada') ? 'Resultados Portada' : `Resultados ${sectionNames[sectionId] || sectionId}`;
  resultsGrid.innerHTML = '';
  resultsGrid.className = '';

  // Cancelar suscripciones previas de resultados
  if (window._resultsUnsubs && window._resultsUnsubs.size) {
    for (const u of window._resultsUnsubs.values()) { try { u(); } catch {} }
    window._resultsUnsubs.clear();
  } else {
    window._resultsUnsubs = new Map();
  }

  const items = await loadImageItems(sectionId);
  if (!items.length) {
    resultsGrid.innerHTML = '<div class="text-center py-10 text-gray-500">No hay elementos para calcular resultados</div>';
    return;
  }

  const entries = items.map((it) => {
    const file = String(it.file || '').trim();
    const authorName = it.author || getTitleFromPath(file);
    const driveId = String(it.driveId || extractDriveId(it.driveUrl || '') || '').trim();
    const coverId = `img_${driveId || getTitleFromPath(file).toLowerCase().replace(/\s+/g, '_')}`;
    const localCount = Number(lsGet(`votes_local_${coverId}`, '0'));
    return { file, author: authorName, coverId, votes: localCount, driveId };
  });

  if (USE_REALTIME && db) {
    try {
      await Promise.all(entries.map(async (e) => {
        const snap = await db.collection('votes').doc(e.coverId).get();
        const remote = Number((snap.exists && snap.data().count) || 0);
        const merged = Math.max(e.votes, remote);
        e.votes = merged;
        lsSet(`votes_local_${e.coverId}`, String(merged));
      }));
    } catch {}
  }

  function draw() {
    const sorted = [...entries].sort((a,b) => b.votes - a.votes).slice(0,3);
    const total = entries.reduce((sum, e) => sum + (Number(e.votes)||0), 0);
    const crowns = ['🥇','🥈','🥉'];
    const cards = sorted.map((e, i) => {
      const dUrl = e.driveId ? resolveDriveUrl(e.driveId) : '';
      const sizeClass = i === 0 ? 'sm:col-span-1 sm:order-2' : (i === 1 ? 'sm:order-1' : 'sm:order-3');
      return `
        <div class="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center ${sizeClass}">
          <div class="text-5xl">${crowns[i]}</div>
          <div class="mt-3 w-full overflow-hidden rounded-xl bg-gray-100">
            ${dUrl ? `<img src="${dUrl}" alt="${e.author}" loading="lazy" class="w-full h-56 object-cover">` : ''}
          </div>
          <h3 class="text-2xl sm:text-3xl font-bold mt-3">${e.author}</h3>
          <div class="mt-2 text-2xl font-extrabold text-indigo-600">${e.votes} votos</div>
          <div class="mt-4 flex justify-center">
            <button class="btn-primary text-lg px-6 py-3" data-action="view" data-file="${e.file}" data-author="${e.author}" data-drive-id="${e.driveId || ''}" data-image-url="${dUrl}">Ver</button>
          </div>
        </div>
      `;
    }).join('');
    resultsGrid.innerHTML = `
      <div class="max-w-6xl mx-auto">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xl font-bold">${sectionNames[sectionId] || sectionId}</h3>
          <div class="text-sm text-gray-600">Total votos: <span class="font-semibold">${total}</span></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-8 items-end py-4">
          ${cards || '<div class="text-center text-gray-500">Sin votos</div>'}
        </div>
      </div>
    `;
    const sel = document.getElementById('resultsSectionSelect');
    if (sel) { try { sel.value = sectionId; } catch {} }
  }

  draw();

  if (!resultsGrid.dataset.viewBound) {
    resultsGrid.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-action="view"]');
      if (!btn) return;
      const file = btn.getAttribute('data-file') || '';
      const author = btn.getAttribute('data-author') || '';
      const dId = btn.getAttribute('data-drive-id') || '';
      const dUrlAttr = btn.getAttribute('data-image-url') || '';
      let url = dUrlAttr || (dId ? resolveDriveUrl(dId) : '');
      if (!url) url = await resolveImageFromDirs(file, author, getTitleFromPath(file));
      if (!url) { alert('No se pudo abrir la imagen.'); return; }
      const currentSection = (document.body && document.body.dataset) ? (document.body.dataset.section || sectionId) : sectionId;
      const titleLabel = `${sectionNames[currentSection] || currentSection} (boceto)`;
      openImageViewer(url, titleLabel);
    });
    resultsGrid.dataset.viewBound = 'true';
  }

  if (USE_REALTIME && db) {
    entries.forEach((e) => {
      const id = e.coverId;
      if (window._resultsUnsubs.has(id)) return;
      const ref = db.collection('votes').doc(id);
      const unsub = ref.onSnapshot((snap) => {
        const data = snap.exists ? snap.data() : null;
        const remote = Number((data && data.count) || 0);
        const merged = Math.max(localVal, remote);
        e.votes = merged;
        lsSet(`votes_local_${id}`, String(merged));
        draw();
      }, (err) => console.warn('onSnapshot resultados error:', err));
      window._resultsUnsubs.set(id, unsub);
    });
  }
}
const DRIVE_ONLY = true;
const USE_REALTIME = true;
