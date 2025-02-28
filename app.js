// Modificado: Se elimina el asunto por diputado y se agrega un solo cuadro de asunto

let sesion_id = null;
let asunto_id = null; // Nuevo: Para manejar el asunto seleccionado

// Función para guardar la sesión
async function guardarSesion() {
    const nombreSesion = document.getElementById('nombreSesion').value;

    if (!nombreSesion) {
        alert('Por favor, ingrese el nombre de la sesión.');
        return;
    }

    try {
        const response = await fetch('https://prototipo-votacion.onrender.com/api/sesion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nombreSesion })
        });

        const result = await response.json();
        alert(result.message);
        sesion_id = result.sesion_id;
        sessionStorage.setItem('sesion_id', sesion_id);
    } catch (error) {
        console.error('Error al registrar la sesión:', error);
    }
}

// Función para guardar un asunto
async function guardarAsunto() {
    const nombreAsunto = document.getElementById('nombreAsunto').value;

    if (!sesion_id) {
        alert('Debe iniciar una sesión antes de agregar un asunto.');
        return;
    }
    if (!nombreAsunto) {
        alert('Por favor, ingrese un asunto.');
        return;
    }

    try {
        const response = await fetch('https://prototipo-votacion.onrender.com/api/asunto', {
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

// Función para cargar los diputados
async function cargarDiputados() {
    try {
        const response = await fetch('https://prototipo-votacion.onrender.com/api/diputados');
        const diputados = await response.json();
        const container = document.getElementById('diputados-container');
        container.innerHTML = '';

        diputados.forEach(diputado => {
            const foto = diputado.foto_url ? diputado.foto_url : 'placeholder.png';
            container.innerHTML += `
                <div class="diputado-card">
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
        const response = await fetch('https://prototipo-votacion.onrender.com/api/voto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ diputado_id: diputadoId, voto: voto, asunto_id: asunto_id, sesion_id: sesion_id })
        });

        const data = await response.json();
        alert(data.message || 'Voto registrado correctamente.');
        cargarResultados();
    } catch (error) {
        console.error('Error al registrar voto:', error);
    }
}

// Cargar diputados y resultados al iniciar la página
window.onload = () => {
    cargarDiputados();
    cargarResultados();
};
