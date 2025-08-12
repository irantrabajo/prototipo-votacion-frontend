// —————————————————————————
// Constantes y SessionStorage
// —————————————————————————
const K_SID        = 'sesion_id';
const K_SNAME      = 'nombre_sesion';
const K_AID        = 'asunto_id';
const K_ANAME      = 'nombre_asunto';
const K_FULL       = 'resumen_sesion_full';
const K_ASUNTO_CNT = 'asunto_count';

const backend = 'http://10.120.21.155:3000';
let DIPUTADOS_CACHE = null;

function fotoSrc(f) {
  const placeholder = `${backend}/imagenes_Diputados/placeholder.jpg`;
  if (!f) return placeholder;

  let u = String(f).trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (/^https?:\/\//i.test(u)) return u;                 // ya es absoluta
  if (u.startsWith('imagenes_Diputados/')) return `${backend}/${u}`; // ya trae carpeta
  return `${backend}/imagenes_Diputados/${u}`;           // solo nombre → arma ruta
}


// Normaliza texto (minúsculas + sin acentos)
function norm(s) {
  return (s || '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function absolutize(url) {
  if (!url) return null;
  const u = String(url).replace(/\\/g, '/').replace(/^\/+/, '');
  if (/^https?:\/\//i.test(u)) return u;   // ya es absoluta
  return `${backend}/${u}`;                 // hazla absoluta con tu backend
}


// 👉 Orden preferido (si luego quieres un orden fijo, mete aquí los nombres exactos)
const ordenPreferido = []; // p.ej: ["Víctor Sánchez", "Geraldine...", "Irán López", ...]


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

   // alert(`🎉 Bienvenido, ${data.usuario}`);
    mostrarApp();
  } catch (err) {
    console.error("Error en login:", err);
    alert("❌ Error al intentar iniciar sesión.");
  }
}
function mostrarApp() {
  // 1️⃣ Oculta todo el div.login-page, no solo el section#login
  document.querySelector('.login-page').classList.add('hidden');

  // 2️⃣ Oculta también el section#login (por si acaso)
  document.getElementById('login').classList.add('hidden');

  // 3️⃣ Muestra sidebar y main
  document.querySelector('.sidebar').classList.remove('hidden');
  document.querySelector('.main').classList.remove('hidden');

  // 4️⃣ Ve directo a la sección de subir PDF
  showSection('uploadOrden');

  // 5️⃣ (Opcional) Auto-scroll para asegurarte de verlo arriba
  document
    .getElementById('uploadOrden')
    .scrollIntoView({ behavior: 'smooth', block: 'start' });
}



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

    // 🔒 Evita reventar si la respuesta NO es JSON válido (por PDF malo, error 500, etc)
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      const texto = await res.text();
      console.error("❌ Error en uploadOrden (no JSON):", texto);
      alert("Error al procesar PDF: " + texto);
      return;
    }

    const payload = await res.json();

    // 🟢 1. Mostrar nombre original si viene en la respuesta
    if (payload.nombreOriginal) {
      document.getElementById("nombreSesion").value = payload.nombreOriginal;
      document.getElementById("previewNombreSesionOriginal").innerText = payload.nombreOriginal;
    } else {
      document.getElementById("nombreSesion").value = payload.nombreOriginal || payload.sesion;
      document.getElementById("previewNombreSesionOriginal").innerText = '';
    }

    if (res.status === 201) {
      // Sesión nueva creada exitosamente
      listaAsuntos = payload.asuntos;
      sessionStorage.setItem(K_SID, payload.sesion_id);

     document.getElementById('previewSesion')
  .innerText = `Sesión: ${payload.nombreOriginal || archivo.name}`;
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
// 2) Eliminar un asunto y volver a renderizar
// —————————————————————————
function eliminarAsunto(index) {
  listaAsuntos.splice(index, 1);
  renderizarAsuntos();
}

// —————————————————————————
// 3) Conversor a números romanos (1 → I, 2 → II, …)
// —————————————————————————
function toRoman(num) {
  const map = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],
    [100,'C'],[90,'XC'],[50,'L'],[40,'XL'],
    [10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']
  ];
  let result = '';
  for (const [val,sym] of map) {
    while (num >= val) {
      result += sym;
      num -= val;
    }
  }
  return result;
}

// —————————————————————————
// 0.1) Confirmar Orden: crear sesión y asuntos
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

  for (let texto of listaAsuntos) {
    const resA = await fetch(`${backend}/api/asunto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asunto: texto, sesion_id })
    });

    if (!resA.ok) {
      const err = await resA.text();
      console.error("❌ Error al enviar asunto:", texto, "->", err);
    }
  }

  const resAll = await fetch(`${backend}/api/asuntos?sesion_id=${sesion_id}`);
  if (resAll.ok) {
    const asuntos = await resAll.json();
    if (asuntos.length > 0) {
      sessionStorage.setItem('asuntos_array', JSON.stringify(asuntos));
      sessionStorage.setItem('asunto_index', '0');
      sessionStorage.setItem(K_AID, asuntos[0].id);
      sessionStorage.setItem(K_ANAME, asuntos[0].asunto);
    } else {
      alert("No se encontraron asuntos después de crearlos.");
    }
  } else {
    const err = await resAll.text();
    console.error("❌ Error al obtener asuntos:", err);
  }

  sessionStorage.setItem(K_ASUNTO_CNT, String(listaAsuntos.length));
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
    showSection('diputados');
    cargarDiputados();
  } else {
    alert('✅ Todos los asuntos han sido votados. Puedes ver los resultados generales.');
    showSection('resultados');
  }
}
// —————————————————————————
// Inicio: mostrar carga de "Orden del Día"
// —————————————————————————
function iniciarApp() {
  showSection('uploadOrden');
}

// —————————————————————————
// Guardar sesión manual (fallback)
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
// Guardar asunto
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
  const cnt = parseInt(sessionStorage.getItem(K_ASUNTO_CNT) || '0', 10) + 1;
  sessionStorage.setItem(K_ASUNTO_CNT, String(cnt));
  showSection('diputados');
  cargarDiputados();
}

// —————————————————————————
// Cargar diputados
// —————————————————————————
async function cargarDiputados() {
  // 1) Descarga una sola vez y reutiliza
  if (!DIPUTADOS_CACHE) {
    const res = await fetch(`${backend}/api/diputados`);
    DIPUTADOS_CACHE = await res.json();
  }
  let list = [...DIPUTADOS_CACHE];

  // 2) Orden (igual que antes)
  if (ordenPreferido.length) {
    const pos = new Map(ordenPreferido.map((n, i) => [norm(n), i]));
    list.sort((a, b) => (pos.get(norm(a.nombre)) ?? 9999) - (pos.get(norm(b.nombre)) ?? 9999));
  } else {
    list.sort((a, b) => norm(a.nombre).localeCompare(norm(b.nombre)));
  }

  // 3) Placeholder “cargando…”
  const cont = document.getElementById('diputados-container');
  cont.innerHTML = '<p style="padding:1rem">Cargando diputados…</p>';

  // 4) Render por lotes para no bloquear
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
             onerror="this.onerror=null; this.src='${backend}/imagenes_Diputados/placeholder.jpg'">
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
    // cede el hilo para que el navegador pinte
    // y empiece a cargar imágenes del primer bloque
    // antes de seguir con el siguiente
    // (mejora muchísimo la sensación de velocidad)
    // eslint-disable-next-line no-await-in-loop
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

    // 🟢 Mostrar que ya votó
    const card = document.getElementById(`dip-${did}`);
    const botones = card.querySelectorAll('button');
    botones.forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = 0.6;
      btn.style.cursor = 'not-allowed';
    });

    // ✅ Limpia y vuelve a enfocar el buscador para la siguiente búsqueda rápida
    const buscador = document.getElementById('buscadorDiputado');
    if (buscador) {
      buscador.value = '';      // limpia el texto
      filtrarDiputados();       // muestra de nuevo toda la lista
      setTimeout(() => {
        buscador.focus({ preventScroll: true });
        try { buscador.setSelectionRange(0, 0); } catch {}
      }, 120);
    }
        // 👆 Sube al inicio de la sección de diputados (ayuda en pantallas pequeñas)
    const secDip = document.getElementById('diputados');
    if (secDip) {
      secDip.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

  } catch (err) {
    console.error("❌ Error al votar:", err.message);
    alert("Error al votar: " + err.message);
  }
} 

// —————————————————————————
// Cargar Resultados + Gráfica
// —————————————————————————
async function cargarResultados() {
  const sid   = sessionStorage.getItem(K_SID);
  const aid   = sessionStorage.getItem(K_AID);
  const nameS = document.getElementById('fileOrden')?.files[0]?.name || sessionStorage.getItem('sesion_nombre_original') || sessionStorage.getItem(K_SNAME);
  const nameA = sessionStorage.getItem(K_ANAME);
  const index = parseInt(sessionStorage.getItem('asunto_index') || '0', 10);
  const roman = toRoman(index + 1); // 🧠 Este es el número real del asunto actual

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
  
  const [d] = data;
  

  document.getElementById('resumenSesion').innerHTML = `
    <h3>Sesión: ${nameS}</h3>
    <h3>Asunto ${roman}: ${nameA}</h3>
    <p>A favor: ${d.a_favor||0}</p>
    <p>En contra: ${d.en_contra||0}</p>
    <p>Abstenciones: ${d.abstenciones||0}</p>
    <p>Ausente: ${d.ausente||0}</p>`;

  const cnv = document.getElementById('chartResumen');
  if (cnv.chart) cnv.chart.destroy();
  cnv.classList.remove('hidden');
  cnv.chart = new Chart(cnv, {
    type: 'bar',
    data: {
      labels: ['A favor', 'En contra', 'Abstenciones', 'Ausente'],
      datasets: [{
        label: 'Votos',
        data: [d.a_favor, d.en_contra, d.abstenciones, d.ausente],
        backgroundColor: 'rgba(128,0,0,0.7)'
      }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });

// 👉 Mostrar botón "Siguiente Asunto" solo si hay más
const btn = document.getElementById('botonSiguienteAsunto');
btn.classList.add('hidden'); // Ocultamos primero por si acaso

const btnFin = document.getElementById('botonTerminarSesion'); // 🔥 NUEVO
btnFin.classList.add('hidden'); // Ocultamos siempre primero

const total = JSON.parse(sessionStorage.getItem('asuntos_array') || '[]').length;
if (index + 1 < total) {
  btn.classList.remove('hidden');
} else {
  btnFin.classList.remove('hidden'); // 👈 Mostrar botón para terminar si ya no hay más asuntos
}
}


// —————————————————————————
// Exportar Asunto TXT/PDF/XLS
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

    // Fetch votos de este asunto
    const resVotos = await fetch(`${backend}/api/votosDetalle?sesion_id=${sid}&asunto_id=${asunto.id}`);
    const votos = await resVotos.json();

    // Contadores
    const conteo = {
      'A favor': 0,
      'En contra': 0,
      'Abstención': 0,
      'Ausente': 0
    };

    votos.forEach(v => {
      const tipo = normalizarVoto(v.voto);
      if (conteo[tipo] !== undefined) conteo[tipo]++;
    });

    texto += `A favor: ${conteo['A favor']}\n`;
    texto += `En contra: ${conteo['En contra']}\n`;
    texto += `Abstenciones: ${conteo['Abstención']}\n`;
    texto += `Ausente: ${conteo['Ausente']}\n\n`;

    texto += `--- Detalle de Votos por Diputado ---\n`;
    votos.forEach(v => {
      texto += `${v.nombre}: ${v.voto}\n`;
    });

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
  voto = voto.toLowerCase();
  if (voto.includes('favor')) return 'A favor';
  if (voto.includes('contra')) return 'En contra';
  if (voto.includes('absten')) return 'Abstención';
  if (voto.includes('ausent')) return 'Ausente';
  return 'Otros';
}

async function exportSesionPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const nombreArchivo = document.getElementById('previewSesion')?.innerText?.replace('Sesión: ', '') || 'Sesión';
  const sid = sessionStorage.getItem(K_SID);

  // Texto seguro para jsPDF: compone acentos (NFC) y colapsa espacios
function pdfSafe(s) {
  return (s || '')
    .normalize('NFC')           // <- clave: convierte "o"+"◌́" en "ó"
    .replace(/\u200B/g, '')     // quita zero‑width si viniera
    .replace(/\s+/g, ' ')       // colapsa espacios
    .trim();
}

  // --- Encabezado ---
  doc.setFont('helvetica', 'bold').setFontSize(18)
     .text('Informe Completo de Sesión', pw / 2, 40, { align: 'center' });

  doc.setFont('helvetica', 'bold').setFontSize(12);
  doc.text('Sesión:', 40, 70);

  // 👉 Limpia mayúsculas y aplica Title Case en español
  const humanizar = (s) => {
    const stop = new Set(['de','del','la','las','el','los','y','o','u','a','en','por','para','con','sin','al']);
    return s
      .toLowerCase()
      .replace(/\s+/g,' ')
      .trim()
      .split(' ')
      .map((w,i) => stop.has(w) && i!==0 ? w : w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

 const sesionBruta = document.getElementById('previewSesion')
                  ?.innerText?.replace(/^Sesión:\s*/i,'') || nombreArchivo;
  let sesionBonita = humanizar(pdfSafe(sesionBruta));


  // 👉 Envuelve y reduce tamaño si ocupa más de 2 líneas
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

  // 1) Trae asuntos una vez
  const asuntos = await fetch(`${backend}/api/asuntos?sesion_id=${sid}`).then(r => r.json());

  // 2) Contar votos en cliente
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

  // 3) Procesar asuntos en lotes
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

      // 👉 Ajuste de texto largo en Asunto
      doc.setFont('helvetica', 'bold').setFontSize(12).text(`Asunto ${rom}:`, 40, y);
      let asuntoFont = 11;
      doc.setFont('helvetica', 'normal').setFontSize(asuntoFont);
      y += 18;

      let asuntoLines = doc.splitTextToSize(a.asunto, pw - 80);
      while (asuntoLines.length > 4 && asuntoFont > 8) {
        asuntoFont--;
        doc.setFontSize(asuntoFont);
        asuntoLines = doc.splitTextToSize(a.asunto, pw - 80);
      }
      asuntoLines.forEach(line => { doc.text(line, 40, y); y += 15; });

      // Resumen local
      const c = contar(votos);
      totales.favor   += c.favor;
      totales.contra  += c.contra;
      totales.abst    += c.abst;
      totales.ausente += c.ausente;

      doc.setFont('helvetica', 'bold').setFontSize(11)
         .text(`A favor: ${c.favor}   En contra: ${c.contra}   Abstenciones: ${c.abst}   Ausente: ${c.ausente}`, 40, y + 6);

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

    await new Promise(r => requestAnimationFrame(r));
  }

  // 4) Resumen global
  if (y > ph - 80) { doc.addPage(); y = 60; }
  doc.setFont('helvetica', 'bold').setFontSize(13).text('Resumen global de la sesión', 40, y);
  y += 18;
  doc.setFont('helvetica', 'normal').setFontSize(12)
     .text(`A favor: ${totales.favor}   En contra: ${totales.contra}   Abstenciones: ${totales.abst}   Ausente: ${totales.ausente}`, 40, y);

  doc.save('resumen_sesion_formal.pdf');
}


function exportSesionXLS() {
  if (!window._sesionRows || window._sesionRows.length <= 1) {
    return alert("No hay datos para exportar. Presiona primero 'Mostrar Resumen'.");
  }
  const ws = XLSX.utils.aoa_to_sheet(window._sesionRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sesión');
  XLSX.writeFile(wb, 'resumen_sesion.xlsx');
}

// —————————————————————————
// Terminar sesión
// —————————————————————————
function terminarSesion() {
  sessionStorage.clear();
  location.reload();
}
function exportAsuntoTXT() {
  const lines = [document.getElementById('resumenSesion').innerText, '\n-- Detalle de votos --'];
  const sid = sessionStorage.getItem(K_SID);
  const aid = sessionStorage.getItem(K_AID);
  fetch(`${backend}/api/votosDetalle?sesion_id=${sid}&asunto_id=${aid}`)
    .then(r => r.json())
    .then(detalles => {
      detalles.forEach(v => lines.push(`${v.nombre}: ${v.voto}`));
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'resumen_asunto.txt';
      a.click();
    });
}
// Texto seguro para jsPDF: compone acentos (NFC) y colapsa espacios
function pdfSafe(s) {
  return (s || '')
    .normalize('NFC')           // <- clave: convierte "o"+"◌́" en "ó"
    .replace(/\u200B/g, '')     // quita zero‑width si viniera
    .replace(/\s+/g, ' ')       // colapsa espacios
    .trim();
}


async function exportAsuntoPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  doc.setFont('helvetica','bold').setFontSize(18)
     .text('Informe Detallado de Votación por Asunto', pw / 2, 40, { align: 'center' });

  doc.setFontSize(12);

  // 🟡 SESIÓN
  doc.setFont('helvetica', 'bold');
  doc.text('Sesión: ', 40, 70);
  doc.setFont('helvetica', 'normal');
  const sesionText = document.getElementById('resumenSesion').querySelector('h3')?.innerText || '';
  const sesionValue = pdfSafe(sesionText.replace(/^Sesión:\s*/i, '').trim());

  // 👉 Ajustar a máximo 2 líneas y reducir tamaño si es necesario
  let fontSize = 12;
  let sesionLines = doc.splitTextToSize(sesionValue, pw - 120);
  while (sesionLines.length > 2 && fontSize > 8) {
    fontSize--;
    doc.setFontSize(fontSize);
    sesionLines = doc.splitTextToSize(sesionValue, pw - 120);
  }
  doc.text(sesionLines, 100, 70);

  // 🟡 ASUNTO
  doc.setFont('helvetica', 'bold');
  let y = 90 + sesionLines.length * 18;
  doc.text('Asunto: ', 40, y);
  doc.setFont('helvetica', 'normal');
  const asuntoText = document.getElementById('resumenSesion').querySelectorAll('h3')[1]?.innerText || '';
  const asuntoValue = pdfSafe(asuntoText.replace(/^Asunto\s+[IVXLCDM]+:\s*/i, '').trim());

  // 👉 Ajustar a máximo 4 líneas y reducir tamaño si es necesario
  fontSize = 12;
  let asuntoLines = doc.splitTextToSize(asuntoValue, pw - 120);
  while (asuntoLines.length > 4 && fontSize > 8) {
    fontSize--;
    doc.setFontSize(fontSize);
    asuntoLines = doc.splitTextToSize(asuntoValue, pw - 120);
  }
  doc.text(asuntoLines, 100, y);
  y += asuntoLines.length * 18;

  // 🗳️ Tabla de votos
  const sid = sessionStorage.getItem(K_SID);
  const aid = sessionStorage.getItem(K_AID);
  const res = await fetch(`${backend}/api/votosDetalle?sesion_id=${sid}&asunto_id=${aid}`);
  const detalles = await res.json();
  const resumen = [
    ['Diputado', 'Voto'],
    ...detalles.map(v => [v.nombre, v.voto])
  ];

  doc.autoTable({
    startY: y + 10,
    head: [resumen[0]],
    body: resumen.slice(1),
    margin: { left: 40, right: 40 },
    headStyles: {
      fillColor: [128, 0, 0],     // Fondo guinda
      textColor: [255, 255, 255]  // Texto blanco
    },
    styles: {
      fontSize: 10,
      overflow: 'linebreak',
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 300, halign: 'left' },
      1: { cellWidth: 150, halign: 'center' }
    }
  });

  // 📊 Gráfica
  let finalY = doc.lastAutoTable.finalY + 20;
  const canvas = document.getElementById('chartResumen');
  const scale = 2;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width * scale;
  tempCanvas.height = canvas.height * scale;
  const ctx = tempCanvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.drawImage(canvas, 0, 0);

  // 🟨 Números encima de cada barra
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = 'black';

  const data = [
    parseInt(canvas.chart.data.datasets[0].data[0] || 0), // A favor
    parseInt(canvas.chart.data.datasets[0].data[1] || 0), // En contra
    parseInt(canvas.chart.data.datasets[0].data[2] || 0), // Abstenciones
    parseInt(canvas.chart.data.datasets[0].data[3] || 0)  // Ausente
  ];

  const xAxis = canvas.chart.scales.x;
  const yAxis = canvas.chart.scales.y;

  data.forEach((value, index) => {
    const barX = xAxis.getPixelForValue(index);
    const barY = yAxis.getPixelForValue(value);
    ctx.fillText(`${value}`, barX - 10, barY - 10);
  });

  const img = tempCanvas.toDataURL('image/png');
  const w = pw - 80;
  const h = (canvas.height / canvas.width) * w;

  if (finalY + h + 40 > ph) {
    doc.addPage();
    finalY = 40;
  }

  doc.setFont('helvetica','bold').setFontSize(12)
     .text('Gráfica de Resultados:', 40, finalY - 5);

  doc.addImage(img, 'PNG', 40, finalY, w, h);

  doc.save('resumen_asunto_formal.pdf');
}



async function exportAsuntoXLS() {
  const sid = sessionStorage.getItem(K_SID);
  const aid = sessionStorage.getItem(K_AID);
  const res = await fetch(`${backend}/api/votosDetalle?sesion_id=${sid}&asunto_id=${aid}`);
  const detalles = await res.json();
  const rows = [['Diputado','Voto'], ...detalles.map(v => [v.nombre, v.voto])];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asunto');
  XLSX.writeFile(wb, 'resumen_asunto.xlsx');
}

async function marcarAusentes() {
  const sid = sessionStorage.getItem(K_SID);
  const aid = sessionStorage.getItem(K_AID);
  if (!sid || !aid) {
    console.warn("⚠️ No hay sesión o asunto para marcar ausentes.");
    return;
  }

  // 🔹 Una sola petición al backend (bulk)
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
function filtrarDiputados() {
  const q = norm(document.getElementById("buscadorDiputado").value);
  const cards = document.querySelectorAll(".diputado-card");

  cards.forEach(card => {
    // usa data-nombre si existe; si no, cae a textContent
    const base = card.dataset?.nombre || card.textContent;
    const match = norm(base).includes(q);

    if (match) {
      // ¡no forces "block"! deja que el CSS decida (grid/flex)
      card.style.removeProperty('display');
    } else {
      card.style.display = 'none';
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const usuario = sessionStorage.getItem("usuario");

    if (usuario) {
      mostrarApp();
    } else {
      document.getElementById("login").classList.remove("hidden");
      document.querySelector(".sidebar").classList.add("hidden");
      document.querySelector(".main").classList.add("hidden");
    }

    // ✅ listener del login (sin anidar otro DOMContentLoaded)
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        login();
      });
    }

    // ✅ engancha atajos del buscador (si ya existe)
    hookSearchShortcuts();
  }, 50);
});


async function mostrarSesionesPasadas() {
  const contenedor = document.getElementById('vistaEdicion');
  contenedor.innerHTML = '<h2>Sesiones pasadas</h2>';

  const res = await fetch(`${backend}/api/sesiones`);
  const sesiones = await res.json();

  sesiones.forEach(s => {
    const div = document.createElement('div');
    div.className = 'sesion-card';
    div.innerHTML = `
      <h3>${s.nombre}</h3>
      <button onclick="verDetallesSesion(${s.id}, '${s.nombre}')">Ver detalles</button>
    `;
    contenedor.appendChild(div);
  });

  showSection('vistaEdicion');
}
// 1️⃣ Ajusta showSection
function showSection(id) {
  ['uploadOrden','sesion','asunto','diputados','resultados','historial','sesionesPasadas','vistaEdicion']
    .forEach(s => {
      const el = document.getElementById(s);
      if (el) el.classList.toggle('hidden', s !== id);
    });
  document.querySelector('.sidebar').style.display = 'block';

  if (id === 'resultados') marcarAusentes().then(cargarResultados);
  if (id === 'sesionesPasadas') cargarSesionesPasadas();
  if (id === 'historial') document.getElementById('votosPrevios').innerHTML = '';
  if (id === 'diputados') setTimeout(hookSearchShortcuts, 0);
}


// 2️⃣ Carga lista de sesiones en "Sesiones Pasadas"
async function cargarSesionesPasadas() {
  const ul = document.getElementById('listaSesionesPasadas');
  ul.innerHTML = '<li>Cargando sesiones…</li>';
  try {
    const res = await fetch(`${backend}/api/sesiones`);
    const sesiones = await res.json();
    if (!sesiones.length) ul.innerHTML = '<li>No hay sesiones aún</li>';
    else ul.innerHTML = sesiones.map(s =>
      `<li>
         <strong>${s.nombre}</strong>
         <button onclick="verDetallesSesion(${s.id}, ${JSON.stringify(s.nombre)})">
           Ver y editar
         </button>
       </li>`
    ).join('');
  } catch (err) {
    ul.innerHTML = '<li>Error al cargar.</li>';
    console.error(err);
  }
}

// 3️⃣ Cuando el user hace click en “Ver y editar”
async function verDetallesSesion(idSesion, nombreSesion) {
  // setea el título
  const cont = document.getElementById('votosPrevios');
  cont.innerHTML = `<h3>${nombreSesion}</h3>`;
  try {
    // traemos sus asuntos
    const rAs = await fetch(`${backend}/api/asuntos?sesion_id=${idSesion}`);
    const asuntos = await rAs.json();
    for (let a of asuntos) {
      const divA = document.createElement('div');
      divA.innerHTML = `<h4>${a.asunto}</h4>`;
      // traemos votos de este asunto
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
function hookSearchShortcuts() {
  const buscador = document.getElementById('buscadorDiputado');
  if (!buscador) return;

  buscador.oninput  = filtrarDiputadosDebounced; // usa el debounce que ya creaste
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

// 4️⃣ Función PUT para actualizar voto
async function editarVoto(votoId, nuevoVoto) {
  const res = await fetch(`${backend}/api/voto/${votoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voto: nuevoVoto })
  });
  if (res.ok) console.log('Voto actualizado');
  else alert('Error al actualizar voto');
}
function debounce(fn, ms = 80) {
  let t; 
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const filtrarDiputadosDebounced = debounce(filtrarDiputados, 80);


window.uploadOrden        = uploadOrden;
window.confirmarOrden     = confirmarOrden;
window.eliminarAsunto = eliminarAsunto;
window.guardarSesion      = guardarSesion;
window.guardarAsunto      = guardarAsunto;
window.votar              = votar;
window.cargarDiputados    = cargarDiputados;
window.cargarResultados   = cargarResultados;
window.terminarSesion     = terminarSesion;
window.mostrarResumenSesion = mostrarResumenSesion;
window.exportAsuntoTXT    = exportAsuntoTXT;
window.exportAsuntoPDF    = exportAsuntoPDF;
window.exportAsuntoXLS    = exportAsuntoXLS;
window.exportSesionTXT    = exportSesionTXT;
window.exportSesionPDF    = exportSesionPDF;
window.exportSesionXLS    = exportSesionXLS;
window.cargarSesionesPasadas = cargarSesionesPasadas;
window.verDetallesSesion    = verDetallesSesion;
window.editarVoto           = editarVoto;

