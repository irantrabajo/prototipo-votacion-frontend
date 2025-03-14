// Mejoras en la estructura visual y asegurando la carga correcta de diputados y asuntos
let sesion_id = sessionStorage.getItem('sesion_id') || null;
let asunto_id = sessionStorage.getItem('asunto_id') || null;

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
        mostrarCuadroAsunto(nombreAsunto);
    } catch (error) {
        console.error('Error al registrar el asunto:', error);
    }
}

// Función para mostrar el cuadro de asunto
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

// Función para cargar los diputados
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

        diputados.forEach(diputado => {
            container.innerHTML += `
                <div class="diputado-card">
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

// Función para cargar el asunto guardado en sessionStorage
async function cargarAsuntoGuardado() {
    if (!asunto_id) return;

    try {
        const response = await fetch(`${backendURL}/api/asunto/${asunto_id}`);
        if (!response.ok) throw new Error("No se pudo obtener el asunto");

        const result = await response.json();
        console.log('Asunto cargado:', result);
        mostrarCuadroAsunto(result.nombre);
    } catch (error) {
        console.error('Error al cargar el asunto:', error);
    }
}

// Cargar diputados y asuntos al iniciar la página
window.onload = async () => {
    await cargarDiputados();
    await cargarAsuntoGuardado();
};
