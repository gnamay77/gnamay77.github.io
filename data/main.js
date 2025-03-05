// Función para cargar y procesar el archivo CSV
async function cargarPuntosEstudio() {
    try {
        const response = await fetch('puntos_estudio.csv'); // Ruta al archivo CSV
        if (!response.ok) {
            throw new Error('No se pudo cargar el archivo CSV');
        }
        const data = await response.text(); // Obtener el contenido del CSV
        const puntosEstudio = procesarCSV(data); // Convertir CSV a un array de objetos
        return puntosEstudio;
    } catch (error) {
        console.error('Error al cargar el archivo CSV:', error);
        return [];
    }
}

// Función para convertir el CSV en un array de objetos
function procesarCSV(csv) {
    const lineas = csv.split('\n'); // Dividir el CSV por líneas
    const puntosEstudio = [];

    // Ignorar la primera línea (encabezados)
    for (let i = 1; i < lineas.length; i++) {
        const [departamento, quebrada, distrito, longitud, latitud] = lineas[i].split(','); // Usar ';' como separador

        if (departamento && quebrada && distrito && longitud && latitud) {
            puntosEstudio.push({
                departamento: departamento.trim(),
                quebrada: quebrada.trim(),
                distrito: distrito.trim(),
                longitud: parseFloat(longitud.trim()),
                latitud: parseFloat(latitud.trim())
            });
        }
    }

    return puntosEstudio;
}

// Función para calcular el centro de un departamento
function calcularCentroDepartamento(puntosEstudio, departamento) {
    const puntosDepartamento = puntosEstudio.filter(punto => punto.departamento === departamento);
    const sumLong = puntosDepartamento.reduce((sum, punto) => sum + punto.longitud, 0);
    const sumLat = puntosDepartamento.reduce((sum, punto) => sum + punto.latitud, 0);
    return [sumLat / puntosDepartamento.length, sumLong / puntosDepartamento.length];
}

// Función principal para inicializar el mapa y cargar los datos
async function inicializarMapa() {
    const puntosEstudio = await cargarPuntosEstudio(); // Cargar los puntos desde el CSV

    // Configuración del mapa
    const map = L.map('map').setView([-10, -75], 6);

    // Capa de Google Satellite
    L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: 'Google Satellite'
    }).addTo(map);

    // Capa WMS de INEI
    const wmsLayer = L.tileLayer.wms("https://maps.inei.gob.pe/geoserver/T10Limites/ig_departamento/wms", {
        layers: 'T10Limites:ig_departamento',
        format: 'image/png',
        transparent: true,
        version: '1.1.0',
        attribution: "INEI"
    }).addTo(map);

    // Control de escala
    L.control.scale().addTo(map);

    // Definición de capas base
    const baseMaps = {
        "Google Satellite": L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { attribution: 'Google Satellite' }),
        "Google Maps": L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', { attribution: 'Google Maps' }),
        "Google Hybrid": L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { attribution: 'Google Hybrid' }),
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }),
        "Esri World Imagery": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri World Imagery' })
    };

    // Definición de capas superpuestas
    const overlayMaps = {
        "Departamentos INEI": wmsLayer
    };

    // Control de capas
    L.control.layers(baseMaps, overlayMaps).addTo(map);

    // GeoJSON con popups
    L.geoJson(modelamiento, {
        style: function (feature) {
            return {
                fillColor: '#8B4513', // Color de relleno marrón tierra
                fillOpacity: 0.75,    // Opacidad del relleno
                color: '#543210',     // Color del borde
                weight: 1,            // Grosor del borde
                smoothFactor: 0.5     // Suavizado de bordes
            };
        },
        onEachFeature: function (feature, layer) {
            if (feature.properties) {
                const imageUrl = feature.properties.imagenUrl;
                // Configuración del popup con información
                layer.bindPopup(`
                    <b>Nombre:</b> ${feature.properties.nombre}<br>
                    <b>Descripción:</b> ${feature.properties.desc}<br>
                    <b>Video:</b> <a href="${feature.properties.video}" target="_blank">Ver Video</a><br>
                    <a href="${imageUrl}" target="_blank"><img src="${imageUrl}" style="width:330px;"></a>
                `);
            }
        }
    }).addTo(map);

    // Evento para el menú de departamentos
    document.getElementById('departamentos').addEventListener('change', function() {
        const departamentoSeleccionado = this.value;
        const quebradasFiltradas = puntosEstudio.filter(punto => punto.departamento === departamentoSeleccionado);

        const quebradasSelect = document.getElementById('quebradas');
        quebradasSelect.innerHTML = '<option value="">Selecciona una quebrada</option>';

        quebradasFiltradas.forEach(punto => {
            const option = document.createElement('option');
            option.value = `${punto.longitud},${punto.latitud}`;
            option.textContent = punto.quebrada;
            quebradasSelect.appendChild(option);
        });

        if (departamentoSeleccionado) {
            const centroDepartamento = calcularCentroDepartamento(puntosEstudio, departamentoSeleccionado);
            map.setView(centroDepartamento, 8);
        }
    });

    // Evento para el menú de quebradas
    document.getElementById('quebradas').addEventListener('change', function() {
        const coordenadas = this.value.split(',');
        if (coordenadas.length === 2) {
            map.setView([parseFloat(coordenadas[1]), parseFloat(coordenadas[0])], 14);
        }
    });

    // Evento para el botón de restablecer vista
    document.getElementById('resetView').addEventListener('click', () => {
        map.setView([-10, -75], 6); // Vuelve a la vista inicial
    });

    // Ocultar el mensaje de carga cuando el mapa esté listo
    map.whenReady(() => {
        document.getElementById('loading').style.display = 'none';
    });
}

// Inicializar el mapa cuando la página esté lista
document.addEventListener('DOMContentLoaded', inicializarMapa);