// —————————————————————————
// Constantes y SessionStorage
// —————————————————————————
const K_SID        = 'sesion_id';
const K_SNAME      = 'nombre_sesion';
const K_AID        = 'asunto_id';
const K_ANAME      = 'nombre_asunto';
const K_FULL       = 'resumen_sesion_full';
const K_ASUNTO_CNT = 'asunto_count';

// Backend detrás de CloudFront
const backend = 'https://d32cz7avp3p0jh.cloudfront.net';


const VOTADOS = new Set(); // ← aquí, global

let DIPUTADOS_CACHE = null;

function fotoSrc(f) {
  const placeholder = `${backend}/api/imagenes_Diputados/placeholder.jpg`;
  if (!f) return placeholder;

  let u = String(f).trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (/^https?:\/\//i.test(u)) return u;                 // ya es absoluta
  if (u.startsWith('imagenes_Diputados/')) return `${backend}/api/${u}`; // ya trae carpeta
  return `${backend}/api/imagenes_Diputados/${u}`;       // solo nombre → arma ruta
}

// Normaliza texto (minúsculas + sin acentos)
function norm(s) {
  return (s || '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function absolutize(url) {
  if (!url) return null;
  const u = String(url).replace(/\\/g, '/').replace(/^\/+/, '');
  if (/^https?:\/\//i.test(u)) return u;
  return `${backend}/${u}`;
}

// 👉 Orden preferido (si quieres un orden fijo, mete aquí nombres exactos)
const ordenPreferido = []; // p.ej: ["Víctor Sánchez", "Geraldine...", "Irán López", ...]


// Muestra el asunto activo en el banner de la vista "Diputados"
function actualizarAsuntoActual() {
  const el = document.getElementById('asuntoActual');
  const asunto = sessionStorage.getItem('nombre_asunto') || ''; // K_ANAME
  if (!el) return;
  el.textContent = asunto ? `Asunto en votación: ${asunto}` : '';
}


// —————————————————————————
// Login
// —————————————————————————
async function login() {
  const usuario = document.getElementById('usuarioLogin').value.trim();
  const password = document.getElementById('passwordLogin').value.trim();

  if (!usuario || !password) {
    alert("🚨 Por favor llena todos los campos.");
    return;
  }

  try {
    const res = await fetch(`${backend}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password })
    });

    if (!res.ok) {
      alert("❌ Usuario o contraseña incorrectos.");
      return;
    }

    const data = await res.json();
    sessionStorage.setItem("usuario", data.usuario);
    sessionStorage.setItem("rol", data.rol);
    mostrarApp();
  } catch (err) {
    console.error("Error en login:", err);
    alert("❌ Error al intentar iniciar sesión.");
  }
}

function mostrarApp() {
  document.querySelector('.login-page').classList.add('hidden');
  document.getElementById('login').classList.add('hidden');
  document.querySelector('.sidebar').classList.remove('hidden');
  document.querySelector('.main').classList.remove('hidden');
  showSection('uploadOrden');
  document.getElementById('uploadOrden').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

updateResultadosLinkVisibility();

document.addEventListener('DOMContentLoaded', () => {
  updateResultadosLinkVisibility(); // lo oculta al inicio
});


// —————————————————————————
// 0) Lista global de textos de asuntos
// —————————————————————————
let listaAsuntos = [];

// 0.1) Subir y previsualizar Orden del Día
async function uploadOrden() {
  const input = document.getElementById('fileOrden');
  if (!input.files.length) {
    alert('Selecciona un archivo PDF.');
    return;
  }

  const archivo = input.files[0];
  const nombreArchivo = archivo.name;
  const form = new FormData();
  const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
  const nuevoNombre = `${timestamp}_${nombreArchivo}`;
  form.append('orden', new File([archivo], nuevoNombre, { type: archivo.type }));

  try {
    const res = await fetch(`${backend}/api/orden`, {
      method: 'POST',
      body: form
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      const texto = await res.text();
      console.error("❌ Error en uploadOrden (no JSON):", texto);
      alert("Error al procesar PDF: " + texto);
      return;
    }

    const payload = await res.json();

    // nombre original detectado
    if (payload.nombreOriginal) {
      document.getElementById("nombreSesion").value = payload.nombreOriginal;
      document.getElementById("previewNombreSesionOriginal").innerText = payload.nombreOriginal;
    } else {
      document.getElementById("nombreSesion").value = payload.nombreOriginal || payload.sesion;
      document.getElementById("previewNombreSesionOriginal").innerText = '';
    }

    if (res.status === 201) {
      listaAsuntos = payload.asuntos;
      sessionStorage.setItem(K_SID, payload.sesion_id);

      document.getElementById('previewSesion').innerText = `Sesión: ${payload.nombreOriginal || archivo.name}`;
      renderizarAsuntos();
      document.getElementById('previewOrden').classList.remove('hidden');
    } else {
      const mensaje = payload.message || `Error ${res.status}`;
      alert('Error al leer PDF: ' + mensaje);
    }

  } catch (error) {
    console.error("❌ Error en uploadOrden:", error);
    alert("Hubo un error al subir el PDF.");
  }
}

// —————————————————————————
// 1) Renderizar la lista numerada de asuntos
// —————————————————————————
function renderizarAsuntos() {
  const ul = document.getElementById('previewAsuntos');
  ul.innerHTML = '';

  listaAsuntos.forEach((texto, i) => {
    const roman = toRoman(i + 1);
    const li = document.createElement('li');
    li.className = 'asunto-item';
    li.innerHTML = `
      <div class="punto-rojo"></div>
      <div class="caja-asunto">
        <span style="font-weight:bold; color:#800000;">${roman}.</span>
        ${texto}
      </div>
      <button onclick="eliminarAsunto(${i})">❌</button>
    `;
    ul.appendChild(li);
  });
}

// —————————————————————————
function eliminarAsunto(index) {
  listaAsuntos.splice(index, 1);
  renderizarAsuntos();
}

// —————————————————————————
function toRoman(num) {
  const map = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],
    [100,'C'],[90,'XC'],[50,'L'],[40,'XL'],
    [10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']
  ];
  let result = '';
  for (const [val,sym] of map) {
    while (num >= val) { result += sym; num -= val; }
  }
  return result;
}

// —————————————————————————
// Confirmar Orden: crear sesión + asuntos (bulk)
// —————————————————————————
async function confirmarOrden() {
  const baseNombre = document.getElementById('previewSesion').innerText.replace('Sesión: ', '').trim();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sesionTxt = `${baseNombre} — ${timestamp}`;

  const resS = await fetch(`${backend}/api/sesion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: sesionTxt })
  });

  if (!resS.ok) {
    const err = await resS.text();
    alert("Error al crear sesión: " + err);
    return;
  }

  const { sesion_id } = await resS.json();
  if (!sesion_id) {
    alert("No se obtuvo el ID de la sesión. Verifica el backend.");
    return;
  }

  sessionStorage.setItem(K_SID, sesion_id);
  sessionStorage.setItem(K_SNAME, sesionTxt);

  // 🚀 bulk
  const resA = await fetch(`${backend}/api/asuntos/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sesion_id, asuntos: listaAsuntos })
  });

  if (!resA.ok) {
    const err = await resA.text();
    console.error("❌ Error al enviar asuntos (bulk):", err);
    alert("Error al enviar asuntos: " + err);
    return;
  }

  const asuntos = await resA.json(); // [{id, asunto}, …]
  if (asuntos.length > 0) {
    sessionStorage.setItem('asuntos_array', JSON.stringify(asuntos));
    sessionStorage.setItem('asunto_index', '0');
    sessionStorage.setItem(K_AID, asuntos[0].id);
    sessionStorage.setItem(K_ANAME, asuntos[0].asunto);
    actualizarAsuntoActual();
  } else {
    alert("No se encontraron asuntos después de crearlos.");
  }

  updateResultadosLinkVisibility();

  sessionStorage.setItem(K_ASUNTO_CNT, String(asuntos.length));
  VOTADOS.clear();
  const busc = document.getElementById('buscadorDiputado');
if (busc) busc.value = '';
  showSection('diputados');
  cargarDiputados();
}


async function avanzarAlSiguienteAsunto() {
  const asuntos = JSON.parse(sessionStorage.getItem('asuntos_array') || '[]');
  let index = parseInt(sessionStorage.getItem('asunto_index') || '0', 10);
  await marcarAusentes();

  if (index + 1 < asuntos.length) {
    index++;
    const siguiente = asuntos[index];
    sessionStorage.setItem('asunto_index', String(index));
    sessionStorage.setItem(K_AID, siguiente.id);
    sessionStorage.setItem(K_ANAME, siguiente.asunto);
    actualizarAsuntoActual();
    VOTADOS.clear();
    const busc = document.getElementById('buscadorDiputado');
if (busc) busc.value = '';
    showSection('diputados');
    cargarDiputados();
  } else {
    alert('✅ Todos los asuntos han sido votados. Puedes ver los resultados generales.');
    showSection('resultados');
  }
}

// —————————————————————————
function iniciarApp() { showSection('uploadOrden'); }

// —————————————————————————
async function guardarSesion() {
  const name = document.getElementById('nombreSesion').value.trim();
  if (!name) return alert('Escribe un nombre de sesión.');
  const res = await fetch(`${backend}/api/sesion`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: name })
  });
  const { sesion_id } = await res.json();
  sessionStorage.setItem(K_SID, sesion_id);
  sessionStorage.setItem(K_SNAME, name);
  sessionStorage.setItem(K_ASUNTO_CNT, '0');
  document.getElementById('registroSesion').classList.add('hidden');
  document.getElementById('sesionActiva').classList.remove('hidden');
  document.getElementById('nombreSesionActivo').innerText = name;
  showSection('asunto');
}

// —————————————————————————
async function guardarAsunto() {
  const name = document.getElementById('listaAsuntos').value;
  const sid  = sessionStorage.getItem(K_SID);
  if (!sid || !name) return alert('Faltan datos.');
  const res = await fetch(`${backend}/api/asunto`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asunto: name, sesion_id: sid })
  });
  const { asunto_id } = await res.json();
  sessionStorage.setItem(K_AID, asunto_id);
  sessionStorage.setItem(K_ANAME, name);
  actualizarAsuntoActual();
  updateResultadosLinkVisibility();
  const cnt = parseInt(sessionStorage.getItem(K_ASUNTO_CNT) || '0', 10) + 1;
  sessionStorage.setItem(K_ASUNTO_CNT, String(cnt));
  VOTADOS.clear();  
  const busc = document.getElementById('buscadorDiputado');
if (busc) busc.value = '';
  showSection('diputados');
  cargarDiputados();
}
// —————————————————————————
// Cargar diputados
// —————————————————————————
async function cargarDiputados() {
  if (!DIPUTADOS_CACHE) {
    const res = await fetch(`${backend}/api/diputados`);
    DIPUTADOS_CACHE = await res.json();
  }
  let list = [...DIPUTADOS_CACHE];

  // Ocultar los que ya votaron en este asunto
  list = list.filter(d => !VOTADOS.has(d.id));


  if (ordenPreferido.length) {
    const pos = new Map(ordenPreferido.map((n, i) => [norm(n), i]));
    list.sort((a, b) => (pos.get(norm(a.nombre)) ?? 9999) - (pos.get(norm(b.nombre)) ?? 9999));
  } else {
    list.sort((a, b) => norm(a.nombre).localeCompare(norm(b.nombre)));
  }

  const cont = document.getElementById('diputados-container');
  cont.innerHTML = '<p style="padding:1rem">Cargando diputados…</p>';

  cont.innerHTML = '';
  const batchSize = 12;
  for (let i = 0; i < list.length; i += batchSize) {
    const frag = document.createDocumentFragment();
    const slice = list.slice(i, i + batchSize);

    slice.forEach(d => {
      const card = document.createElement('div');
      card.className = 'diputado-card';
      card.id = `dip-${d.id}`;
      card.dataset.nombre = norm(d.nombre);

      const fotoUrl = fotoSrc(d.foto);

      card.innerHTML = `
        <img class="diputado-img"
             src="${fotoUrl}"
             alt="${d.nombre}"
             loading="lazy" decoding="async"
             width="160" height="160"
             onerror="this.onerror=null; this.src='${backend}/api/imagenes_Diputados/placeholder.jpg'">
        <h3>${d.nombre}</h3>
        <p><strong>${d.bancada || ''}</strong> — ${d.distrito || ''}</p>
        <div class="acciones">
          <button onclick="votar(${d.id},'a favor')">A favor</button>
          <button onclick="votar(${d.id},'en contra')">En contra</button>
          <button onclick="votar(${d.id},'abstenciones')">Abstención</button>
        </div>
      `;
      frag.appendChild(card);
    });

    cont.appendChild(frag);
    await new Promise(r => requestAnimationFrame(r));
  }
}

// —————————————————————————
// Registrar voto
// —————————————————————————
async function votar(did, voto) {
  const sid = sessionStorage.getItem(K_SID);
  const aid = sessionStorage.getItem(K_AID);
  if (!sid || !aid) return alert('Faltan datos para registrar el voto.');

  try {
    const res = await fetch(`${backend}/api/voto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diputado_id: did, voto, asunto_id: aid, sesion_id: sid })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText);
    }

    // 1) Marca como votado
    VOTADOS.add(did);

    // 2) Anima y elimina la tarjeta
    const card = document.getElementById(`dip-${did}`);
    if (card) {
      // (si quieres también puedes desactivar botones antes de ocultar)
      card.style.transition = 'opacity .18s ease, transform .18s ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(.98)';
      setTimeout(() => card.remove(), 220);
    }

    // 3) Limpia buscador y regresa el foco
    const buscador = document.getElementById('buscadorDiputado');
    if (buscador) {
      buscador.value = '';
      filtrarDiputados();
      setTimeout(() => {
        buscador.focus({ preventScroll: true });
        try { buscador.setSelectionRange(0, 0); } catch {}
      }, 120);
    }

    // 4) Mantén vista de Diputados arriba
    const secDip = document.getElementById('diputados');
    if (secDip) secDip.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await updateResultadosLinkVisibility();

  } catch (err) {
    console.error("❌ Error al votar:", err.message);
    alert("Error al votar: " + err.message);
  }
}

// —————————————————————————
// Resultados + Gráfica
// —————————————————————————
// —————————————————————————
// Resultados + Gráfica (versión “card + stats”)
// —————————————————————————
async function cargarResultados() {
  const sid   = sessionStorage.getItem(K_SID);
  const aid   = sessionStorage.getItem(K_AID);
  const nameS = document.getElementById('fileOrden')?.files[0]?.name
             || sessionStorage.getItem('sesion_nombre_original')
             || sessionStorage.getItem(K_SNAME)
             || 'Sesión';
  const nameA = sessionStorage.getItem(K_ANAME) || 'Asunto';
  const index = parseInt(sessionStorage.getItem('asunto_index') || '0', 10);
  const roman = toRoman(index + 1);

  if (!sid || !aid) {
    console.warn("❌ No hay sesión o asunto activo.");
    return;
  }

  const res = await fetch(`${backend}/api/resultados?sesion_id=${sid}&asunto_id=${aid}`);
  let data;
  try {
    data = await res.json();
    if (!Array.isArray(data)) throw new Error("No es un array");
  } catch (err) {
    console.error("❌ Error al cargar resultados:", err);
    return;
  }
  const d = data[0] || { a_favor:0, en_contra:0, abstenciones:0, ausente:0 };

  // Cabeceras y totales con la grilla .card + .stats
  const cont = document.getElementById('resumenSesion');
  cont.innerHTML = `
    <div class="card" style="margin-bottom:12px;">
      <div class="section-title" style="margin-bottom:6px;">Sesión</div>
      <div>${nameS}</div>
    </div>

    <div class="card" style="margin-bottom:12px;">
      <div class="section-title" style="margin-bottom:6px;">Asunto ${roman}</div>
      <div>${nameA}</div>
    </div>

    <div class="stats">
      <div class="stat"><div class="k">${d.a_favor||0}</div><div class="label">A favor</div></div>
      <div class="stat"><div class="k">${d.en_contra||0}</div><div class="label">En contra</div></div>
      <div class="stat"><div class="k">${d.abstenciones||0}</div><div class="label">Abstenciones</div></div>
      <div class="stat"><div class="k">${d.ausente||0}</div><div class="label">Ausente</div></div>
    </div>
  `;

  // Gráfica dentro de su card (el canvas ya existe en el HTML)
  const cnv = document.getElementById('chartResumen');
  if (cnv.chart) cnv.chart.destroy();
  cnv.classList.remove('hidden');
  // tamaño cómodo en móvil; Chart respeta el contenedor
  cnv.style.minHeight = '220px';

  cnv.chart = new Chart(cnv, {
    type: 'bar',
    data: {
      labels: ['A favor', 'En contra', 'Abstenciones', 'Ausente'],
      datasets: [{
        label: 'Votos',
        data: [d.a_favor, d.en_contra, d.abstenciones, d.ausente],
        backgroundColor: 'rgba(128,0,0,0.8)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { size: 14 } } },
        title: { display: false }
      },
      scales: {
        x: { ticks: { font: { size: 12 } } },
        y: { beginAtZero: true, ticks: { font: { size: 12 } } }
      }
    }
  });

  // Mostrar/ocultar botones Siguiente/Terminar
  const btn = document.getElementById('botonSiguienteAsunto');
  btn.classList.add('hidden');
  const btnFin = document.getElementById('botonTerminarSesion');
  btnFin.classList.add('hidden');

  const total = JSON.parse(sessionStorage.getItem('asuntos_array') || '[]').length;
  if (index + 1 < total) btn.classList.remove('hidden');
  else btnFin.classList.remove('hidden');

  // 👉 SOLO mostrar las acciones de la **sesión** en el ÚLTIMO asunto
  const accionesSesion = document.getElementById('accionesSesion');
  if (accionesSesion) accionesSesion.classList.toggle('hidden', index + 1 < total);

}

// —————————————————————————
// Resumen de Sesión / Exportes
// —————————————————————————
async function mostrarResumenSesion() {
  const sid = sessionStorage.getItem(K_SID);
  const sesion = sessionStorage.getItem(K_SNAME);
  const r = await fetch(`${backend}/api/asuntos?sesion_id=${sid}`);
  const asuntos = await r.json();

  let txt = `Informe Completo de Sesión\n\nSesión: ${sesion}\n\n`;
  const header = ['Asunto','Diputado','Voto'];
  const allRows = [header];

  for (let i = 0; i < asuntos.length; i++) {
    const a = asuntos[i];
    const rom = toRoman(i + 1);
    txt += `Asunto ${rom}: ${a.asunto}\n`;

    const rr = await fetch(`${backend}/api/votosDetalle?sesion_id=${sid}&asunto_id=${a.id}`);
    const dets = await rr.json();

    if (dets.length > 0) {
      dets.forEach(v => {
        txt += `  ${v.nombre}: ${v.voto}\n`;
        allRows.push([`Asunto ${rom}`, v.nombre, v.voto]);
      });
    } else {
      txt += '  [Sin votos registrados]\n';
    }
    txt += '\n';
  }

  sessionStorage.setItem(K_FULL, txt);
  window._sesionRows = allRows;

  const div = document.getElementById('resumenSesionCompleto');
  if (div) {
    div.innerText = txt;
    div.classList.remove('hidden');
  }
}

async function exportSesionTXT() {
  const sid = sessionStorage.getItem(K_SID);
  const sesion = sessionStorage.getItem(K_SNAME) || 'Sesión sin título';
  const r = await fetch(`${backend}/api/asuntos?sesion_id=${sid}`);
  const asuntos = await r.json();

  let texto = `Informe Completo de Sesión\n\nSesión: ${sesion}\n\n`;

  for (let i = 0; i < asuntos.length; i++) {
    const asunto = asuntos[i];
    const rom = toRoman(i + 1);

    texto += `Asunto ${rom}: ${asunto.asunto}\n`;

    const resVotos = await fetch(`${backend}/api/votosDetalle?sesion_id=${sid}&asunto_id=${asunto.id}`);
    const votos = await resVotos.json();

    const conteo = { 'A favor': 0,'En contra': 0,'Abstención': 0,'Ausente': 0 };
    votos.forEach(v => {
      const t = normalizarVoto(v.voto);
      if (conteo[t] !== undefined) conteo[t]++;
    });

    texto += `A favor: ${conteo['A favor']}\n`;
    texto += `En contra: ${conteo['En contra']}\n`;
    texto += `Abstenciones: ${conteo['Abstención']}\n`;
    texto += `Ausente: ${conteo['Ausente']}\n\n`;

    texto += `--- Detalle de Votos por Diputado ---\n`;
    votos.forEach(v => { texto += `${v.nombre}: ${v.voto}\n`; });
    texto += '\n';
  }

  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'resumen_sesion.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function normalizarVoto(voto) {
  voto = (voto||'').toLowerCase();
  if (voto.includes('favor')) return 'A favor';
  if (voto.includes('contra')) return 'En contra';
  if (voto.includes('absten')) return 'Abstención';
  if (voto.includes('ausent')) return 'Ausente';
  return 'Otros';
}

// — PDF sesión (versión formal con tablas y resumen global) —
// (la versión que ya tenías está bien; omitida por espacio)
// —————————————————————————

// TXT/PDF/XLS de Asunto (los tuyos ya están bien)
// —————————————————————————

// —————————————————————————
// Marcar Ausentes (vía endpoint bulk del backend)
// —————————————————————————
async function marcarAusentes() {
  const sid = sessionStorage.getItem(K_SID);
  const aid = sessionStorage.getItem(K_AID);
  if (!sid || !aid) {
    console.warn("⚠️ No hay sesión o asunto para marcar ausentes.");
    return;
  }
  try {
    await fetch(`${backend}/api/marcarAusentes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sesion_id: sid, asunto_id: aid })
    });
  } catch (err) {
    console.error('❌ marcarAusentes bulk:', err);
  }
}

// —————————————————————————
// Filtro de diputados
// —————————————————————————
function filtrarDiputados() {
  const q = norm(document.getElementById("buscadorDiputado").value);
  const cards = document.querySelectorAll(".diputado-card");

  cards.forEach(card => {
    const base = card.dataset?.nombre || card.textContent;
    const match = norm(base).includes(q);
    if (match) card.style.removeProperty('display');
    else card.style.display = 'none';
  });
}

// —————————————————————————
// Router de secciones
// —————————————————————————
function showSection(id) {
  // 🔒 Bloqueo: no dejar entrar a "resultados" si aún no hay votación
  if (id === 'resultados') {
    const aid = sessionStorage.getItem('asunto_id');
    const arr = JSON.parse(sessionStorage.getItem('asuntos_array') || '[]');
    if (!aid && (!Array.isArray(arr) || arr.length === 0)) {
      return; // no navegues a resultados
    }
  }

  // Mostrar/ocultar secciones
  ['uploadOrden','sesion','asunto','diputados','resultados','historial','sesionesPasadas','vistaEdicion']
    .forEach(s => {
      const el = document.getElementById(s);
      if (el) el.classList.toggle('hidden', s !== id);
    });

  document.querySelector('.sidebar').style.display = 'block';

  // Side-effects por sección
  if (id === 'resultados') marcarAusentes().then(cargarResultados);
  if (id === 'sesionesPasadas') cargarSesionesPasadas();
  if (id === 'historial') {
    const vp = document.getElementById('votosPrevios');
    if (vp) vp.innerHTML = '';
  }
  if (id === 'diputados') {
    setTimeout(hookSearchShortcuts, 0);
    actualizarAsuntoActual();
}
}
// —————————————————————————
// Sesiones pasadas / edición simple
// —————————————————————————
// ======== Sesiones pasadas (tabla estilo directorio) ========
let SESIONES_CACHE = []; // para filtrar en cliente

function _formatoFecha(f) {
  if (!f) return '—';
  const d = new Date(f);
  if (isNaN(d)) return String(f);
  // ej: 2025-06-02 14:08
  return d.toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function _rowSesionHTML(s) {
  const usuario  = s.usuario || s.creado_por || s.user || '—';
  const nombre   = s.nombre || s.sesion || '—';
  const fechaRaw = s.fecha || s.created_at || s.f_creacion || s.fecha_creacion;
  const fecha    = _formatoFecha(fechaRaw);

  // data-* sirve para el filtro en cliente
  return `
    <tr class="fila-sesion"
        data-usuario="${(usuario||'').toString().toLowerCase()}"
        data-nombre="${(nombre||'').toString().toLowerCase()}">
      <td class="siglas">${usuario}</td>
      <td class="nombre-sesion">${nombre}</td>
      <td class="fecha">${fecha}</td>
      <td class="acciones">
        <button class="btn-link" onclick="descargarSesion(${s.id})">📥 Descargar</button>
        <button class="btn-link" onclick="editarSesion(${s.id})">✏️ Editar</button>
        <button class="btn-link btn-danger" onclick="eliminarSesion(${s.id})">🗑️ Eliminar</button>
      </td>
    </tr>
  `;
}

async function cargarSesionesPasadas() {
  const tbody = document.getElementById('tablaSesionesBody');
  if (!tbody) return; // por si aún no estás en esa vista
  tbody.innerHTML = `<tr><td colspan="4">Cargando sesiones…</td></tr>`;

  try {
    const res = await fetch(`${backend}/api/sesiones`);
    const sesiones = await res.json();

    SESIONES_CACHE = Array.isArray(sesiones) ? sesiones : [];

    if (!SESIONES_CACHE.length) {
      tbody.innerHTML = `<tr><td colspan="4">No hay sesiones aún</td></tr>`;
      return;
    }

    // orden más reciente primero si viene 'fecha' o 'created_at'
    SESIONES_CACHE.sort((a,b) => {
      const fa = new Date(a.fecha || a.created_at || 0).getTime() || 0;
      const fb = new Date(b.fecha || b.created_at || 0).getTime() || 0;
      return fb - fa;
    });

    tbody.innerHTML = SESIONES_CACHE.map(_rowSesionHTML).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="4">Error al cargar.</td></tr>`;
  }
}


async function verDetallesSesion(idSesion, nombreSesion) {
  const cont = document.getElementById('votosPrevios');
  cont.innerHTML = `<h3>${nombreSesion}</h3>`;
  try {
    const rAs = await fetch(`${backend}/api/asuntos?sesion_id=${idSesion}`);
    const asuntos = await rAs.json();
    for (let a of asuntos) {
      const divA = document.createElement('div');
      divA.innerHTML = `<h4>${a.asunto}</h4>`;
      const rV = await fetch(`${backend}/api/votosDetalle?sesion_id=${idSesion}&asunto_id=${a.id}`);
      const votos = await rV.json();
      votos.forEach(v => {
        const p = document.createElement('p');
        p.innerHTML = `
          ${v.nombre}: 
          <select onchange="editarVoto(${v.id}, this.value)">
            <option value="a favor"    ${v.voto==='a favor'    ?'selected':''}>A favor</option>
            <option value="en contra"   ${v.voto==='en contra'   ?'selected':''}>En contra</option>
            <option value="abstenciones"${v.voto==='abstenciones'?'selected':''}>Abstención</option>
            <option value="ausente"     ${v.voto==='ausente'     ?'selected':''}>Ausente</option>
          </select>
        `;
        divA.appendChild(p);
      });
      cont.appendChild(divA);
    }
    showSection('historial');
  } catch (err) {
    alert('Error cargando detalles.');
    console.error(err);
  }
}

async function editarVoto(votoId, nuevoVoto) {
  const res = await fetch(`${backend}/api/voto/${votoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voto: nuevoVoto })
  });
  if (res.ok) console.log('Voto actualizado');
  else alert('Error al actualizar voto');
}

// —————————————————————————
function hookSearchShortcuts() {
  const buscador = document.getElementById('buscadorDiputado');
  if (!buscador) return;
  buscador.oninput  = filtrarDiputadosDebounced;
  buscador.onsearch = filtrarDiputados;
  buscador.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscador.value = '';
      filtrarDiputados();
      buscador.blur();
    }
  };
}

// ========= SESIÓN: PDF (versión formal con tablas + resumen global) =========
async function exportSesionPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Helpers locales para no chocar con otros
  const pdfSafe = (s) =>
    (s || '')
      .normalize('NFC')
      .replace(/\u200B/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const humanizar = (s) => {
    const stop = new Set(['de','del','la','las','el','los','y','o','u','a','en','por','para','con','sin','al']);
    return (s || '')
      .toLowerCase()
      .replace(/\s+/g,' ')
      .trim()
      .split(' ')
      .map((w,i) => stop.has(w) && i!==0 ? w : w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // Encabezado
  doc.setFont('helvetica','bold').setFontSize(18)
     .text('Informe Completo de Sesión', pw/2, 40, { align:'center' });

  // Sesión (nombre bonito, máx 2 líneas)
  const sesionBruta =
    document.getElementById('previewSesion')?.innerText?.replace(/^Sesión:\s*/i,'') ||
    sessionStorage.getItem('sesion_nombre_original') ||
    sessionStorage.getItem('nombre_sesion') ||
    'Sesión';

  const sesionBonita = humanizar(pdfSafe(sesionBruta));
  doc.setFont('helvetica','bold').setFontSize(12).text('Sesión:', 40, 70);

  const maxW = pw - 120;
  let fontSize = 12;
  doc.setFont('helvetica','normal').setFontSize(fontSize);
  let sesLines = doc.splitTextToSize(sesionBonita, maxW);
  while (sesLines.length > 2 && fontSize > 9) {
    fontSize--;
    doc.setFontSize(fontSize);
    sesLines = doc.splitTextToSize(sesionBonita, maxW);
  }
  doc.text(sesLines, 100, 70);

  // Traer asuntos + votos por lote
  const sid = sessionStorage.getItem('sesion_id');
  if (!sid) {
    alert('No hay sesión activa.');
    return;
  }
  const asuntos = await fetch(`${backend}/api/asuntos?sesion_id=${sid}`).then(r => r.json());

  // Contador de votos
  const contar = (votos) => {
    const c = { favor:0, contra:0, abst:0, ausente:0 };
    for (const v of votos) {
      const t = (v.voto || '').toLowerCase();
      if (t.includes('favor')) c.favor++;
      else if (t.includes('contra')) c.contra++;
      else if (t.includes('absten')) c.abst++;
      else if (t.includes('ausent')) c.ausente++;
    }
    return c;
  };

  // Procesar en lotes para no saturar
  const MAX = 6;
  const lotes = [];
  for (let i = 0; i < asuntos.length; i += MAX) lotes.push(asuntos.slice(i, i + MAX));

  let y = 100;
  const totales = { favor:0, contra:0, abst:0, ausente:0 };

  for (const lote of lotes) {
    const prom = lote.map(a =>
      fetch(`${backend}/api/votosDetalle?sesion_id=${sid}&asunto_id=${a.id}`)
        .then(r => r.json())
        .then(votos => ({ a, votos }))
        .catch(() => ({ a, votos: [] }))
    );
    const resultados = await Promise.all(prom);

    for (const { a, votos } of resultados) {
      const idx = asuntos.findIndex(x => x.id === a.id);
      const rom = toRoman(idx + 1);

      if (y > ph - 250) { doc.addPage(); y = 60; }

      // Título del asunto (máx 4 líneas, reduce tamaño si es largo)
      doc.setFont('helvetica','bold').setFontSize(12).text(`Asunto ${rom}:`, 40, y);
      y += 18;

      let asuntoFont = 11;
      doc.setFont('helvetica','normal').setFontSize(asuntoFont);
      let asuntoLines = doc.splitTextToSize(a.asunto || '', pw - 80);
      while (asuntoLines.length > 4 && asuntoFont > 8) {
        asuntoFont--;
        doc.setFontSize(asuntoFont);
        asuntoLines = doc.splitTextToSize(a.asunto || '', pw - 80);
      }
      asuntoLines.forEach(line => { doc.text(line, 40, y); y += 15; });

      // Resumen local
      const c = contar(votos);
      totales.favor   += c.favor;
      totales.contra  += c.contra;
      totales.abst    += c.abst;
      totales.ausente += c.ausente;

      doc.setFont('helvetica','bold').setFontSize(11)
         .text(
           `A favor: ${c.favor}   En contra: ${c.contra}   Abstenciones: ${c.abst}   Ausente: ${c.ausente}`,
           40, y + 6
         );

      // Tabla detalle
      doc.autoTable({
        startY: y + 18,
        head: [['Diputado', 'Voto']],
        body: votos.map(v => [v.nombre, v.voto]),
        margin: { left: 40, right: 40 },
        headStyles: { fillColor: [128, 0, 0], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: 300 }, 1: { cellWidth: 150, halign: 'center' } }
      });

      y = doc.lastAutoTable.finalY + 24;
    }

    // dejar al navegador pintar si esto corre en UI
    await new Promise(r => requestAnimationFrame(r));
  }

  // Resumen global de la sesión
  if (y > ph - 80) { doc.addPage(); y = 60; }
  doc.setFont('helvetica','bold').setFontSize(13)
     .text('Resumen global de la sesión', 40, y);
  y += 18;

  doc.setFont('helvetica','normal').setFontSize(12)
     .text(
       `A favor: ${totales.favor}   En contra: ${totales.contra}   Abstenciones: ${totales.abst}   Ausente: ${totales.ausente}`,
       40, y
     );

  doc.save('resumen_sesion_formal.pdf');
}

// ========= SESIÓN: Excel (usa window._sesionRows si ya existe; si no, los arma) =========
async function exportSesionXLS() {
  // Si ya se generó con mostrarResumenSesion(), úsalo
  if (Array.isArray(window._sesionRows) && window._sesionRows.length > 1) {
    const ws = XLSX.utils.aoa_to_sheet(window._sesionRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sesión');
    XLSX.writeFile(wb, 'resumen_sesion.xlsx');
    return;
  }

  // Si no, lo calculamos aquí
  const sid = sessionStorage.getItem('sesion_id');
  if (!sid) {
    alert('No hay sesión activa.');
    return;
  }
  const asuntos = await fetch(`${backend}/api/asuntos?sesion_id=${sid}`).then(r => r.json());

  const header = ['Asunto','Diputado','Voto'];
  const rows = [header];

  for (let i = 0; i < asuntos.length; i++) {
    const a = asuntos[i];
    const rom = toRoman(i + 1);
    const dets = await fetch(`${backend}/api/votosDetalle?sesion_id=${sid}&asunto_id=${a.id}`).then(r => r.json());
    if (dets.length) {
      dets.forEach(v => rows.push([`Asunto ${rom}: ${a.asunto}`, v.nombre, v.voto]));
    } else {
      rows.push([`Asunto ${rom}: ${a.asunto}`, '(sin votos)', '—']);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sesión');
  XLSX.writeFile(wb, 'resumen_sesion.xlsx');
}

async function exportAsuntoTXT() {
  const sid = sessionStorage.getItem(K_SID);
  const aid = sessionStorage.getItem(K_AID);
  const nameA = sessionStorage.getItem(K_ANAME) || "Asunto sin título";

  if (!sid || !aid) {
    alert("❌ No hay sesión o asunto activo.");
    return;
  }

  // Traer los votos de este asunto
  const res = await fetch(`${backend}/api/votosDetalle?sesion_id=${sid}&asunto_id=${aid}`);
  const votos = await res.json();

  let texto = `Resumen de Votación — ${nameA}\n\n`;

  const conteo = { 'A favor': 0, 'En contra': 0, 'Abstención': 0, 'Ausente': 0 };
  votos.forEach(v => {
    const t = normalizarVoto(v.voto);
    if (conteo[t] !== undefined) conteo[t]++;
  });

  texto += `A favor: ${conteo['A favor']}\n`;
  texto += `En contra: ${conteo['En contra']}\n`;
  texto += `Abstenciones: ${conteo['Abstención']}\n`;
  texto += `Ausentes: ${conteo['Ausente']}\n\n`;

  texto += `--- Detalle de votos ---\n`;
  votos.forEach(v => { texto += `${v.nombre}: ${v.voto}\n`; });

  // Descargar TXT
  const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `resumen_asunto.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function debounce(fn, ms = 80) {
  let t; 
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const filtrarDiputadosDebounced = debounce(filtrarDiputados, 80);

// —————————————————————————
function terminarSesion() {
  sessionStorage.clear();
  updateResultadosLinkVisibility();   
  location.reload();
}

// ========= ASUNTO: PDF (encabezado + tabla + gráfica si existe) =========
async function exportAsuntoPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Datos básicos
  const sid = sessionStorage.getItem('sesion_id');
  const aid = sessionStorage.getItem('asunto_id');
  const asuntoNombre = sessionStorage.getItem('nombre_asunto') || 'Asunto';

  if (!sid || !aid) {
    alert('No hay sesión o asunto activo.');
    return;
  }

  // Título
  doc.setFont('helvetica','bold').setFontSize(18)
     .text('Informe de Asunto', pw/2, 40, { align: 'center' });

  // Sesión (2 líneas máx)
  const sesionBruta =
    document.getElementById('previewSesion')?.innerText?.replace(/^Sesión:\s*/i,'') ||
    sessionStorage.getItem('sesion_nombre_original') ||
    sessionStorage.getItem('nombre_sesion') || 'Sesión';

  doc.setFont('helvetica','bold').setFontSize(12).text('Sesión:', 40, 70);
  let { nextY } = fitTextBlock(doc, sesionBruta, 100, 70, pw - 140, {
    startSize: 12, minSize: 8, maxLines: 2, lineGap: 2, font: ['helvetica','normal']
  });
  let y = Math.max(95, nextY + 6);

  // Asunto (hasta 4 líneas)
  doc.setFont('helvetica','bold').setFontSize(12).text('Asunto:', 40, y);
  ({ nextY } = fitTextBlock(doc, asuntoNombre, 100, y, pw - 140, {
    startSize: 12, minSize: 9, maxLines: 4, lineGap: 2, font: ['helvetica','normal']
  }));
  y = nextY + 10;

  // Votos del asunto
  const votos = await fetch(`${backend}/api/votosDetalle?sesion_id=${sid}&asunto_id=${aid}`).then(r => r.json()).catch(()=>[]);
  const cont = { favor:0, contra:0, abst:0, ausente:0 };
  for (const v of votos) {
    const t = (v.voto || '').toLowerCase();
    if (t.includes('favor')) cont.favor++;
    else if (t.includes('contra')) cont.contra++;
    else if (t.includes('absten')) cont.abst++;
    else if (t.includes('ausent')) cont.ausente++;
  }

  // Resumen numérico
  doc.setFont('helvetica','bold').setFontSize(11)
     .text(`A favor: ${cont.favor}   En contra: ${cont.contra}   Abstenciones: ${cont.abst}   Ausente: ${cont.ausente}`, 40, y);
  y += 16;

  // Tabla detalle
  doc.autoTable({
    startY: y,
    head: [['Diputado', 'Voto']],
    body: votos.map(v => [v.nombre, v.voto]),
    margin: { left: 40, right: 40 },
    headStyles: { fillColor: [128, 0, 0], textColor: [255, 255, 255] },
    styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 320 }, 1: { cellWidth: 160, halign: 'center' } }
  });

  y = doc.lastAutoTable.finalY + 18;
  if (y > ph - 260) { doc.addPage(); y = 60; }

  const canvas = document.createElement('canvas');
  canvas.width = 900;   // más grande = mejor resolución
  canvas.height = 350;

  const ctx = canvas.getContext('2d');

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['A favor', 'En contra', 'Abstenciones', 'Ausente'],
      datasets: [{
        label: 'Votos',
        data: [cont.favor, cont.contra, cont.abst, cont.ausente],
        backgroundColor: 'rgba(128,0,0,0.8)'
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false, // ← clave: sin animación para “congelar” el frame
      plugins: {
        legend: { labels: { font: { size: 16 } } },
        title: { display: true, text: 'Gráfica de Resultados', font: { size: 18 } }
      },
      scales: {
        x: { ticks: { font: { size: 14 } } },
        y: { ticks: { font: { size: 14 } }, beginAtZero: true }
      }
    }
  });

  // Asegurar que esté renderizada antes de capturar
  chart.update();
  const img = canvas.toDataURL('image/png');
  chart.destroy();

  // Insertar imagen ocupando el ancho útil
  const imgW = pw - 80;
  const imgH = (imgW / canvas.width) * canvas.height;
  doc.addImage(img, 'PNG', 40, y, imgW, imgH);
  doc.save('asunto.pdf');


}

// Normaliza/contabiliza votos para gráficas
function _normVoto(v) {
  const s = (v || '').toLowerCase();
  if (s.includes('favor')) return 'favor';
  if (s.includes('contra')) return 'contra';
  if (s.includes('absten')) return 'abstenciones';
  if (s.includes('ausent')) return 'ausente';
  return 'otros';
}
function contarVotosArray(votos) {
  const c = { favor: 0, contra: 0, abstenciones: 0, ausente: 0 };
  for (const v of votos || []) {
    const t = _normVoto(v.voto);
    if (t in c) c[t]++;
  }
  return c;
}

// Renderiza una gráfica off‑DOM y devuelve su dataURL (PNG)
async function chartImage(valores, etiquetas = ['A favor','En contra','Abstenciones','Ausente']) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;         // ancho grande → se ve nítido en PDF
  canvas.height = 390;        // alto mayor para etiquetas legibles
  const ctx = canvas.getContext('2d');

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [{
        label: 'Votos',
        data: valores.map(v => Number(v) || 0),
        backgroundColor: 'rgba(128,0,0,0.8)'
      }]
    },
    options: {
      responsive: false,
      animation: false, // sin animación → se “congela” de inmediato para el toDataURL
      scales: {
        x: { ticks: { font: { size: 18 } } },  // etiquetas más grandes
        y: { beginAtZero: true, ticks: { font: { size: 16 } } }
      },
      plugins: {
        legend: { labels: { font: { size: 16 } } },
        title: {
          display: true,
          text: 'Gráfica de Resultados',
          font: { size: 20, weight: 'bold' }
        }
      }
    }
  });

  // Asegura que el siguiente frame ya tenga la barra dibujada
  await new Promise(r => requestAnimationFrame(r));
  const png = canvas.toDataURL('image/png');
  chart.destroy(); // limpia
  return png;
}


// ========= ASUNTO: Excel =========
async function exportAsuntoXLS() {
  // 1) Datos base
  const sid = sessionStorage.getItem('sesion_id');
  const aid = sessionStorage.getItem('asunto_id');
  const nameA = sessionStorage.getItem('nombre_asunto') || 'Asunto';

  if (!sid || !aid) {
    alert('❌ No hay sesión o asunto activo.');
    return;
  }
  if (typeof XLSX === 'undefined') {
    alert('❌ No se cargó la librería XLSX.');
    return;
  }

  // 2) Traer votos del asunto
  let detalles = [];
  try {
    const res = await fetch(`${backend}/api/votosDetalle?sesion_id=${sid}&asunto_id=${aid}`);
    detalles = await res.json();
  } catch (e) {
    console.error('Error trayendo votosDetalle:', e);
    alert('No se pudieron obtener los votos de este asunto.');
    return;
  }

  // 3) Armar filas
  const rows = [['Diputado', 'Voto']];
  if (Array.isArray(detalles) && detalles.length) {
    detalles.forEach(v => rows.push([v.nombre, v.voto]));
  } else {
    rows.push(['(sin votos registrados)', '—']);
  }

  // 4) Crear y descargar Excel
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asunto');

  // Nombre bonito de archivo
  const safeName = nameA.replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 60).trim() || 'Asunto';
  XLSX.writeFile(wb, `resumen_${safeName}.xlsx`);
}

// Encoge la fuente y parte en líneas hasta que quepa
function fitTextBlock(doc, raw, x, y, maxWidth, {
  startSize = 12,
  minSize = 8,
  maxLines = 3,
  lineGap = 4,
  font = ['helvetica','normal']
} = {}) {
  const clean = String(raw || '')
    .normalize('NFC')
    .replace(/\u200B/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  let size = startSize;
  doc.setFont(font[0], font[1]).setFontSize(size);
  let lines = doc.splitTextToSize(clean, maxWidth);

  while (lines.length > maxLines && size > minSize) {
    size -= 1;
    doc.setFontSize(size);
    lines = doc.splitTextToSize(clean, maxWidth);
  }

  doc.text(lines, x, y);
  const usedHeight = lines.length * (size * 1.2) + (lines.length - 1) * lineGap;
  return { nextY: y + usedHeight, fontSize: size, lines };
}

async function updateResultadosLinkVisibility() {
  const link = document.getElementById('linkResultados');
  if (!link) return;

  const sid = sessionStorage.getItem('sesion_id'); // o K_SID si prefieres
  const aid = sessionStorage.getItem('asunto_id');

  // ✅ Failsafe: si hay asunto activo, muéstralo SIEMPRE
  const hayAsuntoActivo = Boolean(sid && aid);
  link.style.display = hayAsuntoActivo ? 'block' : 'none';
  if (!hayAsuntoActivo) return;

  // (Opcional) Intenta leer resultados solo para log/diagnóstico
  try {
    const res = await fetch(`${backend}/api/resultados?sesion_id=${sid}&asunto_id=${aid}`);
    const arr = await res.json();
    console.log('[Resultados] conteo actual:', arr);
    // No lo ocultamos aunque sea 0; marcarAusentes corre al entrar a "Resultados".
  } catch (e) {
    console.warn('No pude consultar /resultados; dejo visible por asunto activo.', e);
  }
}

function filtrarSesiones() {
  const q = (document.getElementById('buscadorSesiones')?.value || '')
              .trim().toLowerCase();
  const rows = document.querySelectorAll('#tablaSesionesBody .fila-sesion');
  rows.forEach(tr => {
    const u = tr.getAttribute('data-usuario') || '';
    const n = tr.getAttribute('data-nombre')  || '';
    const show = u.includes(q) || n.includes(q);
    tr.style.display = show ? '' : 'none';
  });
}

// 📥 Descargar PDF completo de la sesión.
// Requiere soporte en backend, por ejemplo: GET /api/sesion/:id/pdf
async function descargarSesion(idSesion) {
  try {
    // abre en nueva pestaña (si el backend entrega application/pdf)
    const url = `${backend}/api/sesion/${idSesion}/pdf`;
    const win = window.open(url, '_blank');
    if (!win) alert('No se pudo abrir la descarga. Revisa el bloqueador de ventanas.');
  } catch (e) {
    console.error('descargarSesion:', e);
    alert('No se pudo descargar la sesión.');
  }
}

// ✏️ Editar: reusa tu vista de edición existente (verDetallesSesion)
function editarSesion(idSesion) {
  const ses = SESIONES_CACHE.find(s => s.id === idSesion);
  const nombre = ses?.nombre || 'Sesión';
  verDetallesSesion(idSesion, nombre); // ya la tienes implementada
}

// 🗑️ Eliminar por completo una sesión (con confirmación).
// Requiere DELETE /api/sesion/:id en backend (borra asuntos y votos en cascada).
async function eliminarSesion(idSesion) {
  const ses = SESIONES_CACHE.find(s => s.id === idSesion);
  const nombre = ses?.nombre || `ID ${idSesion}`;
  if (!confirm(`¿Eliminar la sesión "${nombre}"? Esta acción no se puede deshacer.`)) return;

  try {
    const res = await fetch(`${backend}/api/sesion/${idSesion}`, { method: 'DELETE' });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || 'Error al eliminar');
    }
    // refresca tabla
    await cargarSesionesPasadas();
  } catch (e) {
    console.error('eliminarSesion:', e);
    alert('No se pudo eliminar la sesión.');
  }
}



// Exponer funciones al DOM
window.uploadOrden        = uploadOrden;
window.confirmarOrden     = confirmarOrden;
window.eliminarAsunto     = eliminarAsunto;
window.guardarSesion      = guardarSesion;
window.guardarAsunto      = guardarAsunto;
window.votar              = votar;
window.cargarDiputados    = cargarDiputados;
window.cargarResultados   = cargarResultados;
window.terminarSesion     = terminarSesion;
window.mostrarResumenSesion = mostrarResumenSesion;
window.exportSesionTXT    = exportSesionTXT; 
window.cargarSesionesPasadas = cargarSesionesPasadas;
window.verDetallesSesion    = verDetallesSesion;
window.editarVoto           = editarVoto;
window.showSection          = showSection;
window.avanzarAlSiguienteAsunto = avanzarAlSiguienteAsunto;
window.exportSesionPDF = exportSesionPDF;
window.exportSesionXLS = exportSesionXLS;
window.exportAsuntoTXT = exportAsuntoTXT;
window.exportAsuntoPDF = exportAsuntoPDF;
window.exportAsuntoXLS = exportAsuntoXLS;
window.login = login;
window.descargarSesion = descargarSesion;
window.editarSesion    = editarSesion;
window.eliminarSesion  = eliminarSesion;
window.filtrarSesiones = filtrarSesiones;
