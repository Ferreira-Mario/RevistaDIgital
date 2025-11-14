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
document.addEventListener('DOMContentLoaded', () => {
  route();
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

// Inicialización Firebase + Firestore
let db = null;
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
  } catch (e) {
    console.warn('Firestore no disponible:', e);
  }
})();

// Utilidades de votos en Firestore
async function getVoteCount(coverId) {
  try {
    if (!db) return 0;
    const ref = db.collection('votes').doc(coverId);
    const snap = await ref.get();
    if (!snap.exists) return 0;
    const data = snap.data();
    return Number((data && data.count) || 0);
  } catch (e) {
    console.warn('getVoteCount error:', e);
    return 0;
  }
}

async function incrementVote(coverId) {
  if (!db) throw new Error('Firestore no inicializado');
  const ref = db.collection('votes').doc(coverId);
  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const current = doc.exists ? Number((doc.data() && doc.data().count) || 0) : 0;
    tx.set(ref, { count: current + 1 }, { merge: true });
    return current + 1;
  });
}

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
  // Cancelar suscripciones previas antes de renderizar
  for (const unsub of voteUnsubs.values()) { try { unsub(); } catch {} }
  voteUnsubs.clear();

  sectionTitleEl.textContent = sectionNames[sectionId] || 'Bocetos';
  coversGrid.innerHTML = '';

  // NUEVO: Portada y Sección 1 por imágenes del índice
  if (sectionId === 'portada' || sectionId === 'seccion1') {
    const items = await loadImageItems(sectionId);
    if (!items.length) {
      coversGrid.innerHTML = `<div class="text-center py-10 text-gray-500 col-span-full">No hay imágenes. Verifica el feed de Drive o la subcarpeta correspondiente en Google Drive.</div>`;
      return;
    }

    items.forEach(async (item) => {
      const file = String(item.file || '').trim();
      const title = item.title || getTitleFromPath(file);
      const authorName = item.author || displayNameOverrides(getTitleFromPath(file));
      const coverId = `img_${getTitleFromPath(file).toLowerCase().replace(/\s+/g, '_')}`;

      const card = document.createElement('article');
      card.className = 'group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow min-h-[340px]';
      card.innerHTML = `
        <div class="h-48 sm:h-64 bg-gray-100 overflow-hidden relative" data-role="header">
          <img alt="Miniatura de ${title}" loading="lazy"
               class="w-full h-full object-cover transform transition-transform duration-300 ease-out group-hover:scale-110"
               data-role="thumb">
        </div>
        <div class="p-6">
          <h3 class="text-xl font-bold mb-1">${authorName}</h3>
          <p class="text-gray-600 mb-4 line-clamp-2">${title}</p>
          <div class="grid grid-cols-3 gap-2 mt-4 items-stretch">
            <button class="btn-outline flex-1 min-h-[42px] text-sm sm:text-base whitespace-nowrap" data-action="info">Info</button>
            <button class="btn-primary flex-1 min-h-[42px] text-sm sm:text-base whitespace-nowrap flex items-center justify-center gap-2" data-action="view">
              <img alt="" class="w-5 h-5 sm:w-6 sm:h-6 rounded object-cover" data-role="mini" style="pointer-events:none; display:inline-block;">
              Ver
            </button>
            <button class="btn-danger flex-1 min-h-[42px] text-sm sm:text-base whitespace-nowrap" data-action="vote">Votar</button>
          </div>
          <div class="text-center mt-2">
            <span class="text-2xl font-bold text-brand" data-role="votes">0</span>
            <span class="text-gray-500 ml-2">votos</span>
          </div>
        </div>
      `;
      coversGrid.appendChild(card);

      // Guarda datos para la delegación
      card.dataset.scope = sectionId;
      card.dataset.file = file;
      card.dataset.author = authorName;
      card.dataset.title = title;
      card.dataset.coverId = coverId;

      const thumbEl = card.querySelector('[data-role="thumb"]');
      const miniEl = card.querySelector('[data-role="mini"]');
      const votesEl = card.querySelector('[data-role="votes"]');

      const headerEl = card.querySelector('[data-role="header"]');
      const driveId = String(item && (item.driveId || extractDriveId(item.driveUrl || '')) || '').trim();
      const dUrl = driveId ? resolveDriveUrl(driveId) : '';
      card.dataset.driveId = driveId;
      if (dUrl) {
        thumbEl.src = dUrl;
        thumbEl.addEventListener('load', () => { miniEl.src = thumbEl.src; });
        card.dataset.imageUrl = dUrl;
      } else {
        // Intento de resolución por nombre dentro de la subcarpeta de la sección
        const guessedFile = String(file || '').trim();
        try {
          const idByName = await findDriveFileIdByNameInSection(sectionId, guessedFile);
          if (idByName) {
            const url2 = resolveDriveUrl(idByName);
            card.dataset.driveId = idByName;
            card.dataset.imageUrl = url2;
            thumbEl.src = url2;
            thumbEl.addEventListener('load', () => { miniEl.src = thumbEl.src; });
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

      // Votos iniciales y suscripción (con fallback local)
      const localKey = `votes_local_${coverId}`;
      const localCount = Number(lsGet(localKey, '0'));
      try {
          const remoteCount = await getVoteCount(coverId);
          votesEl.textContent = String(Math.max(localCount, Number(remoteCount || 0)));
      } catch {
          votesEl.textContent = String(localCount);
      }
      const voteBtnInit = card.querySelector('[data-action="vote"]');
      if (voteBtnInit) {
          const voted = lsGet(`voted_${coverId}`, 'false') === 'true';
          voteBtnInit.textContent = voted ? 'Quitar voto' : 'Votar';
          voteBtnInit.disabled = false;
      }

      if (USE_REALTIME && db) {
          const ref = db.collection('votes').doc(coverId);
          const unsub = ref.onSnapshot((snap) => {
              const data = snap.exists ? snap.data() : null;
              const remote = Number((data && data.count) || 0);
              votesEl.textContent = String(remote);
              const voteBtn = card.querySelector('[data-action="vote"]');
              if (voteBtn) {
                  const voted = lsGet(`voted_${coverId}`, 'false') === 'true';
                  voteBtn.textContent = voted ? 'Quitar voto' : 'Votar';
                  voteBtn.disabled = false;
              }
          }, (err) => console.warn('onSnapshot error:', err));
          voteUnsubs.set(coverId, unsub);
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
    const votedKey = `voted_${cover.id}`;
    let votedLocal = lsGet(votedKey, 'false') === 'true';

    const titleDetected = cover.title || getTitleFromPath(cover.imagePath || cover.pdfPath || '');

    const card = document.createElement('article');
    card.className = 'group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow';
    card.innerHTML = `
      <div class="h-48 sm:h-64 bg-gray-100 overflow-hidden relative" data-role="header">
        <img alt="Miniatura de ${titleDetected}" loading="lazy"
             class="w-full h-full object-cover transform transition-transform duration-300 ease-out group-hover:scale-110"
             data-role="thumb">
      </div>
      <div class="p-6">
        <h3 class="text-xl font-bold mb-2">${titleDetected}</h3>
        <p class="text-gray-600 mb-4 line-clamp-2">${cover.description || ''}</p>
        <div class="grid grid-cols-3 gap-2 mb-4 items-stretch">
          <button class="flex-1 px-4 min-h-[42px] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm sm:text-base whitespace-nowrap" data-action="info">Info</button>
          <button class="flex-1 px-4 min-h-[42px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap" data-action="view">
            <img alt="" class="w-5 h-5 sm:w-6 sm:h-6 rounded object-cover" data-role="mini">
            Ver
          </button>
          <button class="flex-1 px-4 min-h-[42px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm sm:text-base whitespace-nowrap" data-action="vote">Votar</button>
        </div>
        <div class="text-center">
          <span class="text-2xl font-bold text-indigo-600" data-role="votes">0</span>
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

    // Votos iniciales (con fallback local)
    const localKey = `votes_local_${cover.id}`;
    const localCount = Number(lsGet(localKey, '0'));
    try {
        const count = await getVoteCount(cover.id);
        votesEl.textContent = String(Math.max(localCount, Number(count || 0)));
    } catch {
        votesEl.textContent = String(localCount);
    }
    // Deshabilitar si ya votó local/online
    voteBtn.disabled = votedLocal;

    // Suscripción remota si hay Firebase
    if (USE_REALTIME && db) {
        const ref = db.collection('votes').doc(cover.id);
        const unsub = ref.onSnapshot((snap) => {
            const data = (snap && typeof snap.data === 'function') ? snap.data() : null;
            const count = (snap && snap.exists && data && typeof data.count !== 'undefined') ? Number(data.count) : 0;
            votesEl.textContent = String(count);
            voteBtn.disabled = votedLocal;
        }, (err) => console.warn('onSnapshot error:', err));
        voteUnsubs.set(cover.id, unsub);
    }

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

    voteBtn.addEventListener('click', async () => {
      if (!isVotingOpen(sectionId)) { showVotingLock(sectionId); return; }
      try {
        voteBtn.disabled = true;
        const newVotes = await toggleVoteWithUserLock(cover.id);
        votesEl.textContent = String(newVotes);
        votedLocal = !votedLocal;
        lsSet(votedKey, votedLocal ? 'true' : 'false');
      } catch (e) {
        alert((e && e.message) ? e.message : 'No se pudo alternar el voto.');
      } finally {
        voteBtn.disabled = false;
      }
    });
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

async function hasVotedOnline(coverId) {
    if (!db || typeof firebase === 'undefined' || !firebase.auth) return false;
    const user = firebase.auth().currentUser;
    if (!user) return false;
    const voteId = `${coverId}_${user.uid}`;
    const ref = db.collection('userVotes').doc(voteId);
    const snap = await ref.get();
    return !!(snap && snap.exists);
}

// NUEVO: alterna voto con bloqueo por usuario (suma/resta y crea/borra userVotes)
async function toggleVoteWithUserLock(coverId) {
    // Respaldo local si Firebase no está disponible
    if (!db || typeof firebase === 'undefined' || !firebase.auth || !firebase.auth().currentUser) {
        const localKey = `votes_local_${coverId}`;
        const votedKey = `voted_${coverId}`;
        const currentLocal = Number(lsGet(localKey, '0'));
        const isVoted = lsGet(votedKey, 'false') === 'true';
        const nextCount = isVoted ? Math.max(0, currentLocal - 1) : currentLocal + 1;
        lsSet(localKey, String(nextCount));
        lsSet(votedKey, isVoted ? 'false' : 'true');
        return nextCount;
    }

    const user = firebase.auth().currentUser;
    if (!user) throw new Error('No autenticado. Activa Auth anónima en Firebase.');
    const voteId = `${coverId}_${user.uid}`;
    const votesRef = db.collection('votes').doc(coverId);
    const userVoteRef = db.collection('userVotes').doc(voteId);

    const result = await db.runTransaction(async (tx) => {
        const userDoc = await tx.get(userVoteRef);
        const voteSnap = await tx.get(votesRef);
        const voteData = (voteSnap && typeof voteSnap.data === 'function') ? voteSnap.data() : null;
        const current = (voteSnap && voteSnap.exists && voteData && typeof voteData.count !== 'undefined') ? Number(voteData.count) : 0;

        if (userDoc.exists) {
            // Quitar voto
            tx.delete(userVoteRef);
            tx.set(votesRef, { count: Math.max(0, current - 1) }, { merge: true });
            return Math.max(0, current - 1);
        } else {
            // Registrar voto
            tx.set(userVoteRef, {
                coverId,
                uid: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            tx.set(votesRef, { count: current + 1 }, { merge: true });
            return current + 1;
        }
    });

    return result;
}

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

  const card = btn.closest('article');
  if (!card || !card.dataset.scope) return;

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
    const sectionScope = card.dataset.scope || '';
    if (!isVotingOpen(sectionScope)) { showVotingLock(sectionScope); return; }
    btn.disabled = true;
    try {
      const newVotes = await toggleVoteWithUserLock(coverId);
      if (votesEl) votesEl.textContent = String(newVotes);
      const nowVoted = await hasVotedOnline(coverId)
        .catch(() => lsGet(`voted_${coverId}`, 'false') === 'true');
      btn.textContent = nowVoted ? 'Quitar voto' : 'Votar';
    } catch (e) {
      console.warn('Delegated toggle vote error:', e);
    } finally {
      btn.disabled = false;
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

function isVotingOpen(sectionId) {
  const target = getNextVotingTime();
  return new Date() >= target;
}

function showVotingLock(sectionId) {
  const lock = document.getElementById('voteLock');
  const countdownEl = document.getElementById('voteCountdown');
  if (!lock || !countdownEl) return;
  if (sectionId !== 'seccion1' && sectionId !== 'portada') { lock.classList.add('hidden'); return; }
  const target = getNextVotingTime();
  lock.classList.remove('hidden');
  let active = true;
  const closeVotingLock = () => { active = false; lock.classList.add('hidden'); };
  const closeBtn = document.getElementById('closeVoteLockBtn');
  if (closeBtn) closeBtn.onclick = closeVotingLock;
  lock.addEventListener('click', (e) => { if (e.target === lock) closeVotingLock(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeVotingLock(); }, { once: true });
  const tick = () => {
    if (!active) return;
    const now = new Date();
    let diff = target - now;
    if (diff <= 0) {
      countdownEl.textContent = '00:00:00';
      closeVotingLock();
      return;
    }
    const d = Math.floor(diff / 86400000);
    diff %= 86400000;
    const h = Math.floor(diff / 3600000);
    diff %= 3600000;
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    countdownEl.textContent = (d > 0 ? `${d}d ` : '') + `${pad(h)}:${pad(m)}:${pad(s)}`;
    requestAnimationFrame(() => setTimeout(tick, 250));
  };
  tick();
}
async function renderResults(sectionId) {
  const resultsGrid = document.getElementById('resultsGrid');
  const titleEl = document.getElementById('resultsTitle');
  if (!resultsGrid) return;
  if (titleEl) titleEl.textContent = (sectionId === 'portada') ? 'Resultados Portada' : 'Resultados Sección 1';
  resultsGrid.innerHTML = '';

  const items = await loadImageItems(sectionId);
  if (!items.length) {
    resultsGrid.innerHTML = '<div class="text-center py-10 text-gray-500">No hay elementos para calcular resultados</div>';
    return;
  }

  const entries = [];
  for (const it of items) {
    const file = String(it.file || '').trim();
    const authorName = it.author || getTitleFromPath(file);
    const coverId = `img_${getTitleFromPath(file).toLowerCase().replace(/\s+/g, '_')}`;
    let count = 0;
    try { count = await getVoteCount(coverId); } catch {}
    const localCount = Number(lsGet(`votes_local_${coverId}`, '0'));
    const driveId = String(it.driveId || extractDriveId(it.driveUrl || '') || '').trim();
    entries.push({ file, author: authorName, coverId, votes: Math.max(Number(count || 0), localCount), driveId });
  }

  entries.sort((a,b) => b.votes - a.votes);
  const podium = entries.slice(0,3);

  const layout = document.createElement('div');
  layout.className = 'grid grid-cols-1 sm:grid-cols-3 gap-6 items-end';

  function podiumCard(entry, rank) {
    const card = document.createElement('div');
    const sizeClass = rank === 1 ? 'sm:col-span-1 sm:order-2' : (rank === 2 ? 'sm:order-1' : 'sm:order-3');
    card.className = `bg-white rounded-xl shadow p-4 text-center ${sizeClass}`;
    const crown = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : '🥉');
    card.innerHTML = `
      <div class="text-3xl">${crown}</div>
      <h3 class="text-xl font-bold mt-2">${entry.author}</h3>
      <p class="text-gray-600">${getTitleFromPath(entry.file)}</p>
      <div class="mt-3 text-2xl font-extrabold text-indigo-600">${entry.votes} votos</div>
      <div class="mt-4 flex justify-center">
        <button class="btn-primary" data-action="view" data-file="${entry.file}" data-author="${entry.author}" data-drive-id="${entry.driveId || ''}">Ver</button>
      </div>
    `;
    layout.appendChild(card);
  }

  if (podium.length) {
    podium.forEach((e, i) => podiumCard(e, i+1));
  } else {
    layout.innerHTML = '<div class="text-center text-gray-500">Sin votos</div>';
  }

  resultsGrid.appendChild(layout);

  layout.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-action="view"]');
    if (!btn) return;
    const file = btn.getAttribute('data-file') || '';
    const author = btn.getAttribute('data-author') || '';
    const dId = btn.getAttribute('data-drive-id') || '';
    let url = dId ? resolveDriveUrl(dId) : '';
    if (!url) url = await resolveImageFromDirs(file, author, getTitleFromPath(file));
    if (!url) { alert('No se pudo abrir la imagen.'); return; }
    openImageViewer(url, author);
  });
}
const DRIVE_ONLY = true;
const USE_REALTIME = false;
