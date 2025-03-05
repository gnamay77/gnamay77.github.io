// Configuración inicial del mapa
const map = L.map('map').setView([-10, -75], 6);

// Capa de Google Satellite (capa base por defecto)
const googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
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
    "Google Satellite": googleSatellite,
    "Google Maps": L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', { attribution: 'Google Maps' }),
    "Google Hybrid": L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { attribution: 'Google Hybrid' }),
    "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }),
    "Esri World Imagery": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri World Imagery' })
};

// Definición de capas superpuestas
const overlayMaps = {
    "Departamentos INEI": wmsLayer
};

// Control de capas (permite cambiar entre capas base y superpuestas)
L.control.layers(baseMaps, overlayMaps).addTo(map);

// Carga de datos GeoJSON y configuración de estilos y popups
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
                <a href="${imageUrl}" target="_blank"><img src="${imageUrl}" style="width:300px;"></a>
            `);
        }
    }
}).addTo(map);

// Datos de los puntos de estudio
const puntosEstudio = [
    { departamento: "PIURA", quebrada: "Qda. Vichayito/Carrillo", distrito: "LOS ORGANOS", longitud: -81.1112, latitud: -4.1526 },
    { departamento: "PIURA", quebrada: "Qda. Cabo Blanco", distrito: "MANCORA", longitud: -81.028, latitud: -4.1038 },
    { departamento: "ANCASH", quebrada: "Qda. Rio Seco", distrito: "COISHCO", longitud: -78.6156, latitud: -9.0212 },
    { departamento: "LIMA", quebrada: "Qda. Quirio", distrito: "CHOSICA", longitud: -76.7035, latitud: -11.9333 },
    { departamento: "LIMA", quebrada: "Qda. Pedregal", distrito: "CHOSICA", longitud: -76.7148, latitud: -11.9372 },
    { departamento: "LIMA", quebrada: "Qda. Cashahuacra", distrito: "CHOSICA", longitud: -76.6709, latitud: -11.9085 },
    { departamento: "LIMA", quebrada: "Qda. California", distrito: "CHOSICA", longitud: -76.7235, latitud: -11.9575 },
    { departamento: "LIMA", quebrada: "Qda. Huascaran", distrito: "CHACLACAYO", longitud: -76.7798, latitud: -11.9812 },
    { departamento: "LIMA", quebrada: "Qda. Huaycoloro", distrito: "CHOSICA", longitud: -76.9324, latitud: -12.0074 },
    { departamento: "MOQUEGUA", quebrada: "Qda. Zaparo", distrito: "ILO", longitud: -71.3387, latitud: -17.6 },
    { departamento: "PIURA", quebrada: "Qda. El Ingenio", distrito: "BUENOS AIRES", longitud: -79.9439, latitud: -5.2095 },
    { departamento: "PIURA", quebrada: "Qda. Limon", distrito: "CANCHAQUE", longitud: -79.6066, latitud: -5.3753 },
    { departamento: "TACNA", quebrada: "Qda. El Diablo", distrito: "ALTO DE LA ALIANZA", longitud: -70.2647, latitud: -17.9976 }
];

// Función para cargar las quebradas filtradas
function cargarQuebradas(departamentoSeleccionado) {
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
        const centroDepartamento = calcularCentroDepartamento(departamentoSeleccionado);
        map.setView(centroDepartamento, 8);
    }
}

// Función para calcular el centro de un departamento
function calcularCentroDepartamento(departamento) {
    const puntosDepartamento = puntosEstudio.filter(punto => punto.departamento === departamento);
    const sumLong = puntosDepartamento.reduce((sum, punto) => sum + punto.longitud, 0);
    const sumLat = puntosDepartamento.reduce((sum, punto) => sum + punto.latitud, 0);
    return [sumLat / puntosDepartamento.length, sumLong / puntosDepartamento.length];
}

// Evento para el menú de departamentos
document.getElementById('departamentos').addEventListener('change', function() {
    cargarQuebradas(this.value);
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