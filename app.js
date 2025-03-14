// Modificado: Se elimina el asunto por diputado y se agrega un solo cuadro de asunto

let sesion_id = sessionStorage.getItem('sesion_id') || null;
let asunto_id = sessionStorage.getItem('asunto_id') || null; // Nuevo: Para manejar el asunto seleccionado

const backendURL = "https://prototipo-votacion.onrender.com";

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
        sesion_id = result.sesion_id;
        sessionStorage.setItem('sesion_id', sesion_id);
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
        alert(result.message);
        asunto_id = result.asunto_id;
        sessionStorage.setItem('asunto_id', asunto_id);
    } catch (error) {
        console.error('Error al registrar el asunto:', error);
    }
}

// Orden de bancadas
const ordenBancadas = ["PRI", "PRD", "MC", "Representación Parlamentaria", "PAN", "Independientes", "PT", "PVEM", "Morena"];

// Función para cargar los diputados
async function cargarDiputados() {
    try {
        const response = await fetch(`${backendURL}/api/diputados`);
        if (!response.ok) throw new Error("No se pudo obtener la lista de diputados");

        let diputados = await response.json();
        console.log('Diputados cargados:', diputados);

        // Ordenar diputados por bancada según la lista
        diputados.sort((a, b) => ordenBancadas.indexOf(a.bancada) - ordenBancadas.indexOf(b.bancada));

        const container = document.getElementById('diputados-container');
        if (!container) {
            console.error("No se encontró el contenedor de diputados.");
            return;
        }

        container.innerHTML = '';

        diputados.forEach(diputado => {
            const foto = diputado.foto_url ? diputado.foto_url : 'placeholder.png';
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

// Función para registrar un voto y ocultar diputado votado
async function registrarVoto(diputadoId, voto) {
    if (!sesion_id || !asunto_id) {
        alert('Debe iniciar una sesión y seleccionar un asunto antes de votar.');
        return;
    }

    try {
        const response = await fetch(`${backendURL}/api/voto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ diputado_id: diputadoId, voto: voto, asunto_id: asunto_id, sesion_id: sesion_id })
        });

        const data = await response.json();
        console.log('Voto registrado:', data);
        alert(data.message || 'Voto registrado correctamente.');

        // Ocultar el diputado votado
        document.getElementById(`diputado-${diputadoId}`)?.remove();

        cargarResultados(); // Cargar resultados actualizados después del voto
    } catch (error) {
        console.error('Error al registrar voto:', error);
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

// Cargar diputados y resultados al iniciar la página
window.onload = () => {
    cargarDiputados();
    cargarResultados();
};
