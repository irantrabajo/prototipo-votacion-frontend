let sesion_id = null;

// Función para guardar la sesión
async function guardarSesion() {
    const nombreSesion = document.getElementById('nombreSesion').value;

    if (!nombreSesion) {
        alert('Por favor, ingrese el nombre de la sesión.');
        return;
    }

    try {
        const response = await fetch('/api/sesion', {
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

// Función para cargar los diputados
async function cargarDiputados() {
    try {
        const response = await fetch('/api/diputados');
        const diputados = await response.json();
        const container = document.getElementById('diputados-container');
        container.innerHTML = '';

        diputados.forEach(diputado => {
            const foto = diputado.foto ? diputado.foto : 'placeholder.png';
            container.innerHTML += `
                <div class="diputado-card">
                    <img src="${foto}" alt="${diputado.nombre}">
                    <h3>${diputado.nombre}</h3>
                    <p><strong>Distrito:</strong> ${diputado.distrito || ''}</p>
                    <p><strong>Bancada:</strong> ${diputado.bancada || ''}</p>
                    <label>Asunto:</label>
                    <input type="text" id="asunto-${diputado.id}" placeholder="Escribe el asunto">
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
    const asunto = document.getElementById(`asunto-${diputadoId}`).value;
    const sesion_id = sessionStorage.getItem('sesion_id');

    if (!sesion_id) {
        alert('Por favor, inicie una sesión antes de votar.');
        return;
    }

    try {
        await fetch('/api/voto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ diputado_id: diputadoId, voto: voto, asunto: asunto, sesion_id: sesion_id })
        });

        alert('Voto registrado');
        cargarResultados();
    } catch (error) {
        console.error('Error al registrar voto:', error);
    }
}

window.onload = () => {
    cargarDiputados();
    cargarResultados();
};
