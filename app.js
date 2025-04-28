// Guardamos sesión y asunto en sessionStorage para persistencia mínima
let sesion_id = sessionStorage.getItem('sesion_id') || null;
let asunto_id = sessionStorage.getItem('asunto_id') || null;

// Cambia esta URL a la de tu backend
const backendURL = "https://prototipo-votacion.onrender.com";

// Orden de bancadas para el sort
const ordenBancadas = [
  "PRI",
  "PRD",
  "MC",
  "Representación Parlamentaria",
  "PAN",
  "Independientes",
  "PT",
  "PVEM",
  "Morena",
];

// Función para guardar la sesión
async function guardarSesion() {
  const nombreSesion = document.getElementById('nombreSesion')?.value;

  if (!nombreSesion) {
    alert('Por favor, ingrese el nombre de la sesión.');
    return;
  }

  try {
    const response = await fetch(`${backendURL}/api/sesion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombreSesion })
    });

    const result = await response.json();
    console.log('Sesión guardada:', result);
    alert(result.message);

    if (navigator.vibrate) {
        navigator.vibrate([100]);
      }
      

    // Guardamos en sessionStorage
    sesion_id = result.sesion_id;
    sessionStorage.setItem('sesion_id', sesion_id);

    // Mostramos el contenedor de asunto
    document.getElementById('asunto-container').style.display = 'block';

  } catch (error) {
    console.error('Error al registrar la sesión:', error);
  }
}

// Función para guardar un asunto
async function guardarAsunto() {
  const nombreAsunto = document.getElementById('nombreAsunto')?.value;

  if (!sesion_id) {
    alert('Debe iniciar una sesión antes de agregar un asunto.');
    return;
  }
  if (!nombreAsunto) {
    alert('Por favor, ingrese un asunto.');
    return;
  }

  try {
    const response = await fetch(`${backendURL}/api/asunto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombreAsunto, sesion_id: sesion_id })
    });

    const result = await response.json();
    console.log('Asunto guardado:', result);
    alert(result.message);

    asunto_id = result.asunto_id;
    sessionStorage.setItem('asunto_id', asunto_id);

  } catch (error) {
    console.error('Error al registrar el asunto:', error);
  }
}

// Función para cargar los diputados
async function cargarDiputados() {
  try {
    const response = await fetch(`${backendURL}/api/diputados`);
    if (!response.ok) throw new Error("No se pudo obtener la lista de diputados");

    let diputados = await response.json();
    console.log('Diputados cargados:', diputados);

    // Ordenar diputados por bancada según la lista
    diputados.sort((a, b) => {
      return ordenBancadas.indexOf(a.bancada) - ordenBancadas.indexOf(b.bancada);
    });

    const container = document.getElementById('diputados-container');
    if (!container) {
      console.error("No se encontró el contenedor de diputados.");
      return;
    }

    container.innerHTML = '';

    diputados.forEach(diputado => {
      const foto = diputado.foto
        ? `${backendURL}/fotos/${diputado.foto}`
        : 'imagenes_Diputados/placeholder.png';

      container.innerHTML += `
        <div class="diputado-card" id="diputado-${diputado.id}">
          <img src="${foto}" alt="${diputado.nombre}">
          <h3>${diputado.nombre}</h3>
          <p><strong>Distrito:</strong> ${diputado.distrito || ''}</p>
          <p><strong>Bancada:</strong> ${diputado.bancada || ''}</p>
          <div>
            <button onclick="registrarVoto(${diputado.id}, 'a favor')">A favor</button>
            <button onclick="registrarVoto(${diputado.id}, 'en contra')">En contra</button>
            <button onclick="registrarVoto(${diputado.id}, 'abstenciones')">Abstenciones</button>
            <button onclick="registrarVoto(${diputado.id}, 'ausente')">Ausente</button>
          </div>
        </div>
      `;
    });
  } catch (error) {
    console.error('Error al cargar diputados:', error);
  }
}

// Función para registrar un voto
async function registrarVoto(diputadoId, voto) {
  if (!sesion_id || !asunto_id) {
    alert('Debe iniciar una sesión y seleccionar un asunto antes de votar.');
    return;
  }

  try {
    const response = await fetch(`${backendURL}/api/voto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diputado_id: diputadoId,
        voto: voto,
        asunto_id: asunto_id,
        sesion_id: sesion_id
      })
    });

    const data = await response.json();
    console.log('Voto registrado:', data);
    alert(data.message || 'Voto registrado correctamente.');

    navigator.vibrate([100, 50, 100]); // vibra, pausa, vibra (ritmo de votación fuerte)


    // Ocultar el diputado votado
    const cardDiputado = document.getElementById(`diputado-${diputadoId}`);
    if (cardDiputado) cardDiputado.remove();

    // Cargar resultados actualizados después del voto
    cargarResultados();

  } catch (error) {
    console.error('Error al registrar voto:', error);
  }
}

// Función para descargar resultados en TXT
function descargarResultadosTxt() {
  let data = document.getElementById('resultados-content').innerText;
  let blob = new Blob([data], { type: "text/plain" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "resultados_votacion.txt";
  a.click();

  if (navigator.vibrate) {
    navigator.vibrate([80]);
  }
  
}

// Función para descargar resultados en PDF
function descargarResultadosPDF() {
  const { jsPDF } = window.jspdf;
  let doc = new jsPDF();
  let data = document.getElementById('resultados-content').innerText || "Sin datos";
  doc.text(data, 10, 10);
  doc.save("resultados_votacion.pdf");

  if (navigator.vibrate) {
    navigator.vibrate([80]);
  }
  
}

// Función para descargar resultados en Excel
function descargarResultadosExcel() {
  let data = document.getElementById('resultados-content').innerText || "Sin datos";
  // Convirtiendo cada línea en un array
  let rows = data.split("\n").map(line => [line]);
  let ws = XLSX.utils.aoa_to_sheet(rows);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Resultados");
  XLSX.writeFile(wb, "resultados_votacion.xlsx");

  if (navigator.vibrate) {
    navigator.vibrate([80]);
  }
  
}

// Función para cargar los resultados
async function cargarResultados() {
  try {
    const response = await fetch(`${backendURL}/api/resultados`);
    if (!response.ok) throw new Error("No se pudieron obtener los resultados");

    const resultados = await response.json();
    console.log('Resultados cargados:', resultados);

    const container = document.getElementById('resultados-content');
    if (!container) {
      console.error("No se encontró el contenedor de resultados.");
      return;
    }

    container.innerHTML = '';

    resultados.forEach(resultado => {
      container.innerHTML += `
        <div class="resultado-card">
          <h3>${resultado.nombre}</h3>
          <p><strong>A favor:</strong> ${resultado.a_favor}</p>
          <p><strong>En contra:</strong> ${resultado.en_contra}</p>
          <p><strong>Abstenciones:</strong> ${resultado.abstenciones}</p>
          <p><strong>Ausente:</strong> ${resultado.ausente}</p>
        </div>
      `;
    });
  } catch (error) {
    console.error('Error al cargar resultados:', error);
  }
}

function toggleModoOscuro() {
    const body = document.body;
    body.classList.toggle("modo-oscuro");
  
    // Cambiar texto del botón
    const btn = document.getElementById("modo-btn");
    const esOscuro = body.classList.contains("modo-oscuro");
    btn.textContent = esOscuro ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
  
    // Guardar preferencia
    localStorage.setItem("modoOscuro", esOscuro);
  }
  
  
// Al cargar la página, cargamos diputados y resultados
window.onload = () => {
  if (sesion_id) {
    document.getElementById('asunto-container').style.display = 'block';
  }
  cargarDiputados();
  cargarResultados();
};

function iniciarApp() {
    document.getElementById('bienvenida').style.display = 'none';
    document.getElementById('asunto-container').style.display = sesion_id ? 'block' : 'none';
    cargarDiputados();
    cargarResultados();
  }
  
  window.onload = () => {
    // 🌓 Restaurar modo oscuro si estaba activado
    const modoGuardado = localStorage.getItem("modoOscuro") === "true";
    if (modoGuardado) {
      document.body.classList.add("modo-oscuro");
      const btn = document.getElementById("modo-btn");
      if (btn) btn.textContent = "☀️ Modo Claro";
    }
  
    // ⬇️ Ocultar todo al inicio y mostrar bienvenida
    document.getElementById('diputados-container').style.display = 'none';
    document.getElementById('asunto-container').style.display = 'none';
    document.getElementById('resultados-content').style.display = 'none';
  };
  
  