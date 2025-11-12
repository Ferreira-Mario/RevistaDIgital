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
});

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
    const res = await fetch('./data/portadas.json');
    if (!res.ok) throw new Error('No se pudo cargar portadas.json');
    coversCache = await res.json();
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

  // NUEVO: Portada por imágenes del índice
  if (sectionId === 'portada') {
    const items = await loadImageItems();
    if (!items.length) {
      coversGrid.innerHTML = `<div class="text-center py-10 text-gray-500 col-span-full">No hay imágenes. Edita <code>data/img_index.json</code> o <code>data/portadas.json</code>, y coloca archivos en <code>Imagenes/Portadas/img</code>.</div>`;
      return;
    }

    items.forEach(async (item) => {
      const file = String(item.file || '').trim();
      const title = item.title || getTitleFromPath(file);
      const authorName = item.author || 'Autor/a';
      const coverId = `img_${getTitleFromPath(file).toLowerCase().replace(/\s+/g, '_')}`;

      const card = document.createElement('article');
      card.className = 'group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow';
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
      card.dataset.scope = 'portada';
      card.dataset.file = file;
      card.dataset.author = authorName;
      card.dataset.title = title;
      card.dataset.coverId = coverId;

      const thumbEl = card.querySelector('[data-role="thumb"]');
      const miniEl = card.querySelector('[data-role="mini"]');
      const votesEl = card.querySelector('[data-role="votes"]');

      // Resuelve y carga imagen
      const imgUrl = await resolveImageFromDirs(file, authorName, title);
      if (imgUrl) {
          thumbEl.src = imgUrl;
          miniEl.src = imgUrl;
          card.dataset.imageUrl = imgUrl;
      } else {
          const headerEl = card.querySelector('[data-role="header"]');
          thumbEl.style.display = 'none';
          miniEl.style.display = 'none';
          headerEl.className = 'h-48 sm:h-64 bg-gray-200 flex items-center justify-center text-gray-500';
          headerEl.textContent = 'Imagen no encontrada';
          card.dataset.imageUrl = '';
      }

      // Votos iniciales y suscripción (con fallback local)
      const localKey = `votes_local_${coverId}`;
      const localCount = Number(localStorage.getItem(localKey) || '0');
      try {
          const remoteCount = await getVoteCount(coverId);
          votesEl.textContent = String(Math.max(localCount, Number(remoteCount || 0)));
      } catch {
          votesEl.textContent = String(localCount);
      }
      const voteBtnInit = card.querySelector('[data-action="vote"]');
      if (voteBtnInit) {
          const voted = localStorage.getItem(`voted_${coverId}`) === 'true';
          voteBtnInit.textContent = voted ? 'Quitar voto' : 'Votar';
          voteBtnInit.disabled = false;
      }

      if (db) {
          const ref = db.collection('votes').doc(coverId);
          const unsub = ref.onSnapshot((snap) => {
              const data = snap.exists ? snap.data() : null;
              const remote = Number((data && data.count) || 0);
              votesEl.textContent = String(remote);
              const voteBtn = card.querySelector('[data-action="vote"]');
              if (voteBtn) {
                  const voted = localStorage.getItem(`voted_${coverId}`) === 'true';
                  voteBtn.textContent = voted ? 'Quitar voto' : 'Votar';
                  voteBtn.disabled = false;
              }
          });
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
    let votedLocal = localStorage.getItem(votedKey) === 'true';

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
    const localCount = Number(localStorage.getItem(localKey) || '0');
    try {
        const count = await getVoteCount(cover.id);
        votesEl.textContent = String(Math.max(localCount, Number(count || 0)));
    } catch {
        votesEl.textContent = String(localCount);
    }
    // Deshabilitar si ya votó local/online
    voteBtn.disabled = votedLocal;

    // Suscripción remota si hay Firebase
    if (db) {
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
      try {
        voteBtn.disabled = true;
        const newVotes = await toggleVoteWithUserLock(cover.id);
        votesEl.textContent = String(newVotes);
        votedLocal = !votedLocal;
        localStorage.setItem(votedKey, votedLocal ? 'true' : 'false');
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
    const trimmed = String(path).trim();
    // No volver a codificar si ya contiene secuencias %XX válidas
    if (/%[0-9A-Fa-f]{2}/.test(trimmed)) return trimmed;
    return encodeURI(trimmed);
  } catch {
    return path;
  }
}

// Utilidades para imágenes (reemplaza getImageCandidates por esta versión)
// Actualiza getImageCandidates: fuerza carpeta ./pdfs/Portadas/img y variantes robustas
// getImageCandidates(cover)
function getImageCandidates(cover) {
  const DIRS = [
    './Imagenes/Portadas/img',
    './Imagagenes/Portadas/img',
    // compat por si quedan archivos antiguos
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
    urls.push(resolveImageUrl(cover.imagePath));
  }

  const extsLower = ['png', 'jpg', 'jpeg', 'webp'];
  const extsUpper = ['PNG', 'JPG', 'JPEG', 'WEBP'];

  for (const base of bases) {
    for (const v of nameVariants(base)) {
      for (const dir of DIRS) {
        // Prioriza PNG
        urls.push(resolveImageUrl(`${dir}/${v}.png`));
        urls.push(resolveImageUrl(`${dir}/${v}.PNG`));
        // Luego otras extensiones
        for (const e of extsLower) urls.push(resolveImageUrl(`${dir}/${v}.${e}`));
        for (const E of extsUpper) urls.push(resolveImageUrl(`${dir}/${v}.${E}`));
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
        const currentLocal = Number(localStorage.getItem(localKey) || '0');
        const isVoted = localStorage.getItem(votedKey) === 'true';
        const nextCount = isVoted ? Math.max(0, currentLocal - 1) : currentLocal + 1;
        localStorage.setItem(localKey, String(nextCount));
        localStorage.setItem(votedKey, isVoted ? 'false' : 'true');
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
async function loadImgIndex() {
  try {
    const res = await fetch('./data/img_index.json');
    if (!res.ok) throw new Error('No se pudo cargar img_index.json');
    return await res.json();
  } catch (e) {
    console.warn('img_index.json no disponible:', e);
    return [];
  }
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

    if (hasExt) {
        const ext = (fileName.split('.').pop() || 'png');
        for (const bv of basesFinal) {
            candidates.push(`${bv}.${ext}`, `${bv}.${ext.toUpperCase()}`);
        }
    } else {
        for (const b of basesFinal) {
            candidates.push(`${b}.png`, `${b}.PNG`);
            for (const e of extsLower) candidates.push(`${b}.${e}`);
            for (const E of extsUpper) candidates.push(`${b}.${E}`);
        }
    }

    return Array.from(new Set(candidates));
}

// Resuelve la primera URL válida probando múltiples directorios
async function resolveImageFromDirs(fileName, authorName, titleHint) {
    const DIRS = [
      './Imagenes/Portadas/img',
      './Imagagenes/Portadas/img',
      './pdfs/Portadas/img'
    ];

    const bases = [fileName, authorName, titleHint].filter(Boolean);
    const fileCandidates = Array.from(new Set(
      bases.flatMap((b) => makeFileCandidates(String(b || '').trim()))
    ));

    const tried = [];
    for (const dir of DIRS) {
      for (const f of fileCandidates) {
        const candidate = resolveImageUrl(`${dir}/${f}`);
        tried.push(candidate);
        if (await probeImage(candidate)) return candidate;
      }
    }
    console.warn('Imagen no encontrada (probados primeros 20):', tried.slice(0, 20));
    return null;
}

// Fusiona fuentes: img_index.json + portadas.json (respaldo)
async function loadImageItems() {
  const items = [];

  // 1) Desde img_index.json
  try {
    const idx = await loadImgIndex();
    for (const it of idx) {
      items.push({
        file: String(it.file || '').trim(),
        title: it.title || '',
        author: it.author || '',
        description: it.description || ''
      });
    }
  } catch {}

  // 2) Respaldo: desde portadas.json
  try {
    const res = await fetch('./data/portadas.json');
    if (res.ok) {
      const covers = await res.json();
      for (const c of covers) {
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
  const seen = new Set();
  const placeholderAuthors = new Set(['Nombre de la persona autora', 'Otra persona autora']);
  const placeholderTitles = new Set(['Portada informativa', 'Portada genérica']);

  return items.filter(it => {
    const key = (it.file || '').toLowerCase();
    const isPlaceholder =
      placeholderAuthors.has(String(it.author || '').trim()) ||
      placeholderTitles.has(String(it.title || '').trim());
    if (isPlaceholder) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Delegación: un único listener para Info / Ver / Votar (solo Portada)
document.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-action]');
  if (!btn) return;

  const card = btn.closest('article');
  if (!card || card.dataset.scope !== 'portada') return;

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
    if (!fullUrl) fullUrl = await resolveImageFromDirs(file, author, title);
    if (!fullUrl) { alert('No se pudo abrir la imagen.'); return; }
    openImageViewer(fullUrl, title);
    return;
  }

  if (action === 'vote') {
    btn.disabled = true;
    try {
      const newVotes = await toggleVoteWithUserLock(coverId);
      if (votesEl) votesEl.textContent = String(newVotes);
      const nowVoted = await hasVotedOnline(coverId)
        .catch(() => localStorage.getItem(`voted_${coverId}`) === 'true');
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
