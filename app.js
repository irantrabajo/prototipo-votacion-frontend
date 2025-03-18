/****************************************************
 * app.js
 * Manejo de Sesión, Asuntos, Diputados y Resultados
 ****************************************************/

// Si ya había sesión o asunto guardados en sessionStorage, los cargamos:
let sesion_id = sessionStorage.getItem('sesion_id') || null;
let asunto_id = sessionStorage.getItem('asunto_id') || null;

// Ajusta la URL de tu backend
const backendURL = "https://prototipo-votacion.onrender.com";

/**
 * 1. GUARDAR SESIÓN
 */
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
    sesion_id = result.sesion_id;
    sessionStorage.setItem('sesion_id', sesion_id);

    // Mostrar el formulario de asunto
    document.getElementById('form-asunto').style.display = 'block';
  } catch (error) {
    console.error('Error al registrar la sesión:', error);
  }
}

/**
 * 2. GUARDAR ASUNTO
 */
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

    mostrarCuadroAsunto(nombreAsunto);
  } catch (error) {
    console.error('Error al registrar el asunto:', error);
  }
}

/**
 * 3. MOSTRAR CUADRO DE ASUNTO
 */
function mostrarCuadroAsunto(nombre) {
  const cuadroAsunto = document.getElementById('asunto-container');
  if (!cuadroAsunto) {
    console.error("No se encontró el contenedor de asuntos.");
    return;
  }
  cuadroAsunto.innerHTML = `
    <div class="asunto-card">
      <h3>Asunto en discusión</h3>
      <p><strong>${nombre}</strong></p>
    </div>
  `;
}

/**
 * 4. CARGAR DIPUTADOS
 */
async function cargarDiputados() {
  try {
    const response = await fetch(`${backendURL}/api/diputados`);
    if (!response.ok) throw new Error("No se pudo obtener la lista de diputados");

    let diputados = await response.json();
    console.log('Diputados cargados:', diputados);

    const container = document.getElementById('diputados-container');
    if (!container) {
      console.error("No se encontró el contenedor de diputados.");
      return;
    }
    container.innerHTML = '';

    // EJEMPLO: Si quieres ordenarlos por bancadas, crea un ordenBancadas y haz un sort
    // const ordenBancadas = ["PRI", "PRD", "MC", "RP", "PAN", "Independientes", "PT", "PVEM", "Morena"];
    // diputados.sort((a, b) => ordenBancadas.indexOf(a.bancada) - ordenBancadas.indexOf(b.bancada));

    diputados.forEach(diputado => {
      container.innerHTML += `
        <div class="diputado-card" id="diputado-${diputado.id}">
          <img src="${diputado.foto_url ? diputado.foto_url : 'placeholder.png'}" alt="${diputado.nombre}">
          <h3>${diputado.nombre}</h3>
          <p><strong>Distrito:</strong> ${diputado.distrito || ''}</p>
          <p><strong>Bancada:</strong> ${diputado.bancada || ''}</p>
          <button onclick="registrarVoto(${diputado.id}, 'a favor')">A favor</button>
          <button onclick="registrarVoto(${diputado.id}, 'en contra')">En contra</button>
          <button onclick="registrarVoto(${diputado.id}, 'abstenciones')">Abstenciones</button>
          <button onclick="registrarVoto(${diputado.id}, 'ausente')">Ausente</button>
        </div>
      `;
    });
  } catch (error) {
    console.error('Error al cargar diputados:', error);
  }
}

/**
 * 5. REGISTRAR VOTO
 */
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

    // Ocultar el diputado votado
    const dipCard = document.getElementById(`diputado-${diputadoId}`);
    if (dipCard) dipCard.remove();

    // Volver a cargar resultados
    cargarResultados();
  } catch (error) {
    console.error('Error al registrar voto:', error);
  }
}

/**
 * 6. CARGAR RESULTADOS
 */
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

    resultados.forEach(r => {
      container.innerHTML += `
        <div class="resultado-card">
          <h3>${r.nombre}</h3>
          <p><strong>A favor:</strong> ${r.a_favor}</p>
          <p><strong>En contra:</strong> ${r.en_contra}</p>
          <p><strong>Abstenciones:</strong> ${r.abstenciones}</p>
          <p><strong>Ausente:</strong> ${r.ausente}</p>
        </div>
      `;
    });
  } catch (error) {
    console.error('Error al cargar resultados:', error);
  }
}

/**
 * 7. DESCARGAR RESULTADOS (TXT, PDF, EXCEL)
 */
function descargarResultadosTxt() {
  const data = document.getElementById('resultados-content')?.innerText || "Sin resultados";
  const blob = new Blob([data], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "resultados_votacion.txt";
  a.click();
}

function descargarResultadosPDF() {
  const { jsPDF } = window.jspdf;
  let doc = new jsPDF();
  let data = document.getElementById('resultados-content')?.innerText || "Sin resultados";
  doc.text(data, 10, 10);
  doc.save("resultados_votacion.pdf");
}

function descargarResultadosExcel() {
  let data = document.getElementById('resultados-content')?.innerText.split("\n") || ["Sin resultados"];
  let table = data.map(row => [row]);
  let ws = XLSX.utils.aoa_to_sheet(table);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Resultados");
  XLSX.writeFile(wb, "resultados_votacion.xlsx");
}

/**
 * 8. CARGAR ASUNTO GUARDADO (SI EXISTE)
 */
async function cargarAsuntoGuardado() {
  if (!asunto_id) return; // Si no hay asunto guardado, salimos
  try {
    // EJEMPLO: Si tienes un endpoint /api/asunto/:id para obtener un asunto
    // const response = await fetch(`${backendURL}/api/asunto/${asunto_id}`);
    // if (!response.ok) throw new Error("No se pudo obtener el asunto");
    // const asunto = await response.json();
    // mostrarCuadroAsunto(asunto.nombre);

    // Si no tienes ese endpoint, simplemente puedes mostrar el "nombreAsunto"
    // que guardaste en sessionStorage si lo hubieras guardado.
    // Por ahora lo dejamos sin hacer nada o con un console.log.
    console.log("Asunto ya guardado en sessionStorage. ID:", asunto_id);
  } catch (error) {
    console.error("Error al cargar asunto guardado:", error);
  }
}

/**
 * 9. Al cargar la página
 */
window.onload = async () => {
  // Cargar diputados y resultados
  await cargarDiputados();
  await cargarResultados();

  // Si ya hay sesion, mostramos el form de asunto
  if (sesion_id) {
    document.getElementById('form-asunto').style.display = 'block';
  }

  // Cargar asunto guardado (si existe)
  await cargarAsuntoGuardado();
};
