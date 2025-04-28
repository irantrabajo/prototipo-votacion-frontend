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
        ? `imagenes_Diputados/${diputado.foto}`  // 📸 ahora sí bien
        : 'imagenes_Diputados/placeholder.png';

      container.innerHTML += `
        <div class="diputado-card" id="diputado-${diputado.id}">
          <img src="${foto}" alt="${diputado.nombre}" width="150">
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
// Hacer funciones globales para que el HTML pueda usarlas
window.iniciarApp = iniciarApp;
window.guardarSesion = guardarSesion;
window.guardarAsunto = guardarAsunto;
window.descargarResultadosTxt = descargarResultadosTxt;
window.descargarResultadosPDF = descargarResultadosPDF;
window.descargarResultadosExcel = descargarResultadosExcel;
