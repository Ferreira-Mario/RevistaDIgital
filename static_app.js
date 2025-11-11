// Menú
const menuBtn = document.getElementById('menuBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const sideMenu = document.getElementById('sideMenu');
menuBtn.addEventListener('click', () => sideMenu.style.transform = 'translateX(0)');
closeMenuBtn.addEventListener('click', () => sideMenu.style.transform = 'translateX(100%)');
sideMenu.querySelectorAll('[data-route]').forEach(btn => {
  btn.addEventListener('click', () => {
    window.location.hash = btn.dataset.route;
    sideMenu.style.transform = 'translateX(100%)';
  });
});

// Router simple por hash
const views = {
  home: document.getElementById('view-home'),
  bocetos: document.getElementById('view-bocetos'),
  about: document.getElementById('view-about'),
};
function route() {
  const hash = window.location.hash || '#/';
  const parts = hash.replace('#/', '').split('/');
  const base = parts[0] || '';
  const sectionId = parts[1] || 'portada';
  views.home.classList.add('hidden');
  views.bocetos.classList.add('hidden');
  views.about.classList.add('hidden');
  if (base === '' || base === undefined) {
    views.home.classList.remove('hidden');
  } else if (base === 'bocetos') {
    views.bocetos.classList.remove('hidden');
    renderSection(sectionId);
  } else if (base === 'about') {
    views.about.classList.remove('hidden');
  } else {
    views.home.classList.remove('hidden');
  }
}
window.addEventListener('hashchange', route);
window.addEventListener('load', route);

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
  const covers = (await loadCovers()).filter(c => c.section === sectionId);
  sectionTitleEl.textContent = sectionNames[sectionId] || 'Bocetos';
  coversGrid.innerHTML = '';
  if (!covers.length) {
    coversGrid.innerHTML = `<div class="text-center py-10 text-gray-500 col-span-full">No hay portadas en esta sección</div>`;
    return;
  }
  covers.forEach(async (cover) => {
    const votedKey = `voted_${cover.id}`;
    const voted = localStorage.getItem(votedKey) === 'true';

    const card = document.createElement('article');
    card.className = 'bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow';
    card.innerHTML = `
      <div class="h-64 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16h8M8 12h8M8 8h8" />
        </svg>
      </div>
      <div class="p-6">
        <h3 class="text-xl font-bold mb-2">${cover.title}</h3>
        <p class="text-gray-600 mb-4 line-clamp-2">${cover.description || ''}</p>
        <div class="flex gap-2 mb-4">
          <button class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200" data-action="info">Info</button>
          <button class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" data-action="view">Ver</button>
          <button class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" data-action="vote" ${voted ? 'disabled' : ''}>Votar</button>
        </div>
        <div class="text-center">
          <span class="text-2xl font-bold text-indigo-600" data-role="votes">0</span>
          <span class="text-gray-500 ml-2">votos</span>
        </div>
      </div>
    `;
    coversGrid.appendChild(card);

    const votesEl = card.querySelector('[data-role="votes"]');
    const infoBtn = card.querySelector('[data-action="info"]');
    const viewBtn = card.querySelector('[data-action="view"]');
    const voteBtn = card.querySelector('[data-action="vote"]');

    // Cargar votos online
    try {
      const count = await getVoteCount(cover.id);
      votesEl.textContent = String(count);
    } catch (e) {
      console.warn('No se pudieron cargar votos:', e);
    }

    infoBtn.addEventListener('click', () => showInfo({
      Título: cover.title,
      Autor: cover.author,
      Sección: sectionNames[cover.section] || cover.section,
      Descripción: cover.description || '—',
      Archivo: cover.pdfPath || '—'
    }));
    viewBtn.addEventListener('click', () => openViewer(cover.pdfPath));
    voteBtn.addEventListener('click', async () => {
      if (localStorage.getItem(votedKey) === 'true') return;
      try {
        voteBtn.disabled = true;
        const newVotes = await incrementVote(cover.id);
        votesEl.textContent = String(newVotes);
        localStorage.setItem(votedKey, 'true');
      } catch (e) {
        console.error('Error al votar:', e);
        alert('No se pudo registrar el voto. Verifica tu conexión.');
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
closeInfoBtn.addEventListener('click', () => infoPopup.classList.add('hidden'));

// Utilidades para PDF
function isPdf(path) {
  return typeof path === 'string' && path.toLowerCase().endsWith('.pdf');
}
function resolvePdfUrl(path) {
  try {
    return encodeURI(path);
  } catch (e) {
    return path;
  }
}
// Visor PDF
const viewerModal = document.getElementById('viewerModal');
const pdfCanvas = document.getElementById('pdfCanvas');
const ctx = pdfCanvas.getContext('2d');
let currentScale = 1; // factor relativo al ajuste a ancho
let currentUrl = '';

document.getElementById('zoomInBtn').addEventListener('click', () => {
  currentScale = Math.min(currentScale + 0.25, 3);
  if (currentUrl) renderFirstPage(currentUrl);
});
=document.getElementById('zoomOutBtn').addEventListener('click', () => {
  currentScale = Math.max(currentScale - 0.25, 0.5);
  if (currentUrl) renderFirstPage(currentUrl);
});
=document.getElementById('closeViewerBtn').addEventListener('click', () => {
  viewerModal.classList.add('hidden');
  currentUrl = '';
  try { ctx && ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height); } catch {}
});

// cierre con ESC
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    viewerModal.classList.add('hidden');
    currentUrl = '';
  }
});

// Indicador de carga en el visor
function showLoading(on) {
  let loader = document.getElementById('pdfLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'pdfLoader';
    loader.className = 'absolute top-2 right-2 text-sm text-gray-600';
    loader.textContent = 'Cargando...';
    viewerModal.querySelector('.border-b').appendChild(loader);
  }
  loader.style.display = on ? 'block' : 'none';
}

async function openViewer(url) {
  try {
    if (!isPdf(url)) {
      alert('El archivo seleccionado no es un PDF. Verifica la ruta o el formato.');
      return;
    }
    const encoded = resolvePdfUrl(url);
    currentUrl = encoded;
    viewerModal.classList.remove('hidden');
    showLoading(true);
    await renderFirstPage(encoded);
  } catch (e) {
    console.error('Error abriendo visor:', e);
    alert('No se pudo abrir el PDF. Usa un servidor local (http://localhost) y verifica la ruta.');
  } finally {
    showLoading(false);
  }
}

async function renderFirstPage(url) {
  try {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    // Ajuste a ancho del contenedor
    const container = viewerModal.querySelector('.flex-1');
    const baseViewport = page.getViewport({ scale: 1 });
    const fitScale = Math.max(0.5, Math.min((container.clientWidth - 16) / baseViewport.width, 3));
    const viewport = page.getViewport({ scale: fitScale * currentScale });

    pdfCanvas.width = Math.floor(viewport.width);
    pdfCanvas.height = Math.floor(viewport.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
  } catch (err) {
    console.error('Error renderizando PDF:', err);
    alert('No se pudo renderizar el PDF. Verifica la ruta y usa un servidor local si el navegador bloquea archivos.');
  }
}

// re-render al cambiar tamaño
window.addEventListener('resize', () => {
  if (currentUrl && !viewerModal.classList.contains('hidden')) {
    renderFirstPage(currentUrl);
  }
});