let sesion_id = null;

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
        console.log('Sesión guardada:', result);
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
        const response = await fetch('https://prototipo-votacion.onrender.com/api/diputados');
        const diputados = await response.json();
        console.log('Diputados cargados:', diputados);

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
        const response = await fetch('https://prototipo-votacion.onrender.com/api/voto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ diputado_id: diputadoId, voto: voto, asunto: asunto, sesion_id: sesion_id })
        });

        const data = await response.json();
        console.log('Voto registrado:', data);
        alert(data.message || 'Voto registrado correctamente.');
        cargarResultados(); // Cargar resultados actualizados después del voto
    } catch (error) {
        console.error('Error al registrar voto:', error);
    }
}

// 📌 Función para cargar los resultados de la votación
async function cargarResultados() {
    try {
        const response = await fetch('https://prototipo-votacion.onrender.com/api/resultados');
        const resultados = await response.json();
        console.log('Resultados cargados:', resultados);

        const container = document.getElementById('resultados-container');
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

window.onload = () => {
    cargarDiputados();
    cargarResultados();
};
