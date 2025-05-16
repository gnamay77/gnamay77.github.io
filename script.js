// Configuración inicial del mapa
var map = L.map('map').setView([-9.19, -75.01], 6);

// Capa base
L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
    attribution: 'Google Terrain'
}).addTo(map);

// Variables globales
let layers = {};
let legends = {};
let datos = {};
let subbasinLayer = null;
let topoLayer = null;
let cuencasLayer = null;
let puntosLayer = null;

// Función para cargar puntos desde data.json
function cargarPuntos() {
    if (puntosLayer) {
        map.removeLayer(puntosLayer);
    }

    puntosLayer = L.layerGroup().addTo(map);

    for (const cuenca in datos) {
        for (const localidad in datos[cuenca]) {
            const info = datos[cuenca][localidad];
            if (info.lat && info.lng) {
                const marker = L.marker([info.lat, info.lng], {
                    icon: L.divIcon({
                        html: `<div style="background: #1D2DFF; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold;">${localidad.charAt(0)}</div>`,
                        className: 'punto-localidad'
                    })
                }).bindPopup(`
                    <b>${localidad}</b><br>
                    Cuenca: ${cuenca}<br>
                    Lat: ${info.lat.toFixed(4)}, Lng: ${info.lng.toFixed(4)}<br>
                    Escenarios: ${info.escenarios.join(', ')}
                `);
                
                marker.addTo(puntosLayer);
            }
        }
    }
}

// Función para acercar a la cuenca seleccionada
function zoomACuenca(cuencaNombre) {
    let boundsEspecificos = null;
    cuencasLayer.eachLayer(layer => {
        if (layer.feature.properties.NOMBRE === cuencaNombre) {
            boundsEspecificos = layer.getBounds();
        }
    });

    if (!boundsEspecificos) {
        mostrarNotificacion("Cuenca no encontrada");
        return;
    }

    const padding = map.getZoom() > 10 ? 0.1 : 0.5; // Padding adaptable
    map.fitBounds(boundsEspecificos.pad(padding));
    // En la función zoomACuenca():
    cuencasLayer.eachLayer(layer => {
    console.log("Nombre en cuencas.js:", layer.feature.properties.NOMBRE);
});
console.log("Nombre seleccionado:", cuencaNombre);
}

// Modificar la función cargarLocalidades para incluir el zoom
function cargarLocalidades() {
    const cuencaSelect = document.getElementById("cuenca");
    const cuencaSeleccionada = cuencaSelect.value;
    
    // Hacer zoom a la cuenca seleccionada
    if (cuencaSeleccionada) {
        zoomACuenca(cuencaSeleccionada);
    }

    const localidadSelect = document.getElementById("localidad");
    const escenarioSelect = document.getElementById("escenario");
    
    localidadSelect.innerHTML = '<option value="">Seleccione una localidad</option>';
    escenarioSelect.innerHTML = '<option value="">Seleccione un escenario</option>';
    escenarioSelect.disabled = true;
    localidadSelect.disabled = !cuencaSeleccionada;

    if (cuencaSeleccionada) {
        for (const localidad in datos[cuencaSeleccionada]) {
            localidadSelect.innerHTML += `<option value="${localidad}">${localidad}</option>`;
        }
    }
}

// Modificar el event listener de localidad para incluir el zoom
document.getElementById("localidad").addEventListener("change", async function() {
    const cuenca = document.getElementById("cuenca").value;
    const localidad = this.value;
    
    if (cuenca && localidad) {
        // Hacer zoom a la localidad seleccionada
        const coords = datos[cuenca][localidad];
        if (coords.lat && coords.lng) {
            map.setView([coords.lat, coords.lng], 14); // Nivel de zoom 14 para localidad
        }
        
        await cargarSubbasin(cuenca, localidad);
        await cargarTopografia(cuenca, localidad);
        
        const escenarioSelect = document.getElementById("escenario");
        escenarioSelect.innerHTML = '<option value="">Seleccione un escenario</option>';
        escenarioSelect.disabled = false;
        
        datos[cuenca][localidad].escenarios.forEach(esc => {
            escenarioSelect.innerHTML += `<option value="${esc}">${esc}</option>`;
        });
    }
});

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'error') {
    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    notification.textContent = mensaje;
    document.body.appendChild(notification);
    
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
        document.body.removeChild(notification);
    }, 3000);
}

// Función para mostrar loader
function mostrarLoader(mostrar) {
    const loader = document.getElementById('loader') || document.createElement('div');
    if (!document.getElementById('loader')) {
        loader.id = 'loader';
        loader.className = 'loader';
        document.body.appendChild(loader);
    }
    loader.style.display = mostrar ? 'block' : 'none';
}

// Función para cargar datos
async function cargarDatos() {
    mostrarLoader(true);
    try {
        // --- Funcionalidad original --- 
        const response = await fetch("data.json");
        if (!response.ok) throw new Error("Error al cargar los datos"); 
        datos = await response.json();
        generarMenuCuencas();
        cargarPuntos();

        // Añadir capa de cuencas (original)
        if (cuencasLayer) map.removeLayer(cuencasLayer);
        cuencasLayer = L.geoJSON(cuencas, {
    style: function(feature) {
        return {
            color: '#1D2DFF',   // Color del borde
            weight: 1,          // Grosor de la línea
            opacity: 1,         // Opacidad del borde
            fillOpacity: 0.25  // Opacidad del relleno
        };
    },
    onEachFeature: function(feature, layer) {
        if (feature.properties.NOMBRE) {
            layer.bindPopup(feature.properties.NOMBRE); // Popup con el nombre
        }
    }
});

        actualizarVisibilidadCapas(); 

        // --- Mejoras añadidas ---
        // 1. Validación de estructura de datos
        if (!datos || Object.keys(datos).length === 0) {
            throw new Error("Archivo data.json vacío o corrupto");
        }

        // 2. Validación de cuencas.js
        if (typeof cuencas === 'undefined' || !cuencas.features) {
            throw new Error("Capas geoespaciales no cargadas (¿cuencas.js?)");
        }

    } catch (error) {
        // --- Mejora en manejo de errores ---
        console.error("Error crítico:", error);
        mostrarNotificacion(`Error: ${error.message}`); // Mensaje específico
    } finally {
        mostrarLoader(false);
    }
}

// Función para actualizar visibilidad según zoom
function actualizarVisibilidadCapas() {
    const currentZoom = map.getZoom();
    
    // Controlar capa de cuencas
    if (currentZoom >= 6 && currentZoom <= 12) {
        if (!map.hasLayer(cuencasLayer)) {
            map.addLayer(cuencasLayer);
        }
        actualizarEtiquetas();
    } else {
        if (map.hasLayer(cuencasLayer)) {
            map.removeLayer(cuencasLayer);
        }
    }
    
    // Controlar grosor de subcuenca según zoom
    if (subbasinLayer) {
        const weight = currentZoom >= 9 ? 3 : 1;
        subbasinLayer.setStyle({ weight });
    }
}

// Función para actualizar etiquetas según zoom
function actualizarEtiquetas() {
    const currentZoom = map.getZoom();
    
    if (cuencasLayer) {
        cuencasLayer.eachLayer(function(layer) {
            if (currentZoom >= 9 && currentZoom <= 12) {
                if (layer.feature.properties && layer.feature.properties.NOMBRE) {
                    layer.bindTooltip(layer.feature.properties.NOMBRE, {
                        permanent: true,
                        direction: 'center',
                        className: 'label-style'
                    }).openTooltip();
                }
            } else {
                layer.unbindTooltip();
            }
        });
    }
}

// Generar menú de cuencas
function generarMenuCuencas() {
    const cuencaSelect = document.getElementById("cuenca");
    cuencaSelect.innerHTML = '<option value="">Seleccione una cuenca</option>';
    for (const cuenca in datos) {
        cuencaSelect.innerHTML += `<option value="${cuenca}">${cuenca}</option>`;
    }
}

// Cargar localidades
function cargarLocalidades() {
    const cuencaSelect = document.getElementById("cuenca");
    const localidadSelect = document.getElementById("localidad");
    const escenarioSelect = document.getElementById("escenario");
    
    localidadSelect.innerHTML = '<option value="">Seleccione una localidad</option>';
    escenarioSelect.innerHTML = '<option value="">Seleccione un escenario</option>';
    escenarioSelect.disabled = true;
    localidadSelect.disabled = !cuencaSelect.value;

    if (cuencaSelect.value) {
        for (const localidad in datos[cuencaSelect.value]) {
            localidadSelect.innerHTML += `<option value="${localidad}">${localidad}</option>`;
        }
    }
}

// Cargar subcuenca
async function cargarSubbasin(cuenca, localidad) {
    mostrarLoader(true);
    try {
        const response = await fetch(`data/${cuenca}/${localidad}/subbasin.json`);
        if (!response.ok) throw new Error("Archivo de subcuenca no encontrado");
        const subbasinData = await response.json();
        
        if (subbasinLayer) map.removeLayer(subbasinLayer);
        
        subbasinLayer = L.geoJSON(subbasinData, {
            style: {
                color: '#1D2DFF',
                weight: map.getZoom() >= 9 ? 3 : 1,
                opacity: 1,
                fillColor: 'transparent',
                dashArray: '5, 5'
            },
            className: 'subcuenca-style'
        }).addTo(map);
        
        // Ajustar vista al bounds de la subcuenca con un pequeño padding
        map.fitBounds(subbasinLayer.getBounds().pad(0.1));
        
    } catch (error) {
        console.error("Error cargando subcuenca:", error);
        mostrarNotificacion("No se pudo cargar la subcuenca");
    } finally {
        mostrarLoader(false);
    }
}

// Cargar topografía
async function cargarTopografia(cuenca, localidad) {
    mostrarLoader(true);
    try {
        const response = await fetch(`data/${cuenca}/${localidad}/topo.tif`);
        if (!response.ok) throw new Error("Archivo de topografía no encontrado");
        const arrayBuffer = await response.arrayBuffer();
        const georaster = await parseGeoraster(arrayBuffer);
        
        if (topoLayer) map.removeLayer(topoLayer);
        
        topoLayer = new GeoRasterLayer({
            georaster: georaster,
            opacity: 0.7,
            resolution: 128,
        pixelValuesToColorFn: value => {
            if (value === null || value < 0 || isNaN(value)) return null;
            
            const minValue = georaster.mins[0]; // Obtiene el valor MÍNIMO del raster
            const maxValue = georaster.maxs[0];
            const normalized = (value - minValue) / (maxValue - minValue); // Escala 0-1
            
           // return chroma.scale(['#DAF7A6', '#FFC300', '#FF5733', '#C70039', '#900C3F', '#581845'])(normalized).hex();
            return chroma.scale(['#DAF7A6', '#FFC300', '#FF5733', '#C70039', '#900C3F', '#581845'])(normalized).hex();
        }
        });
        
        // Mostrar por defecto si el checkbox está activado
        if (document.getElementById('toggle-topo').checked) {
            map.addLayer(topoLayer);
        }
        
    } catch (error) {
        console.error("Error cargando topografía:", error);
        mostrarNotificacion("No se pudo cargar la topografía");
    } finally {
        mostrarLoader(false);
    }
}

// Cargar escenario
async function cargarEscenario() {
    const cuenca = document.getElementById("cuenca").value;
    const localidad = document.getElementById("localidad").value;
    const escenario = document.getElementById("escenario").value;

    if (!cuenca || !localidad || !escenario) return;

    mostrarLoader(true);
    
    // Limpiar capas anteriores
    Object.values(layers).forEach(layer => map.removeLayer(layer));

    try {
        // Cargar nuevas capas
        const depthFile = `data/${cuenca}/${localidad}/${escenario}/MAXIMUM_DEPTH.tif`;
        const velocityFile = `data/${cuenca}/${localidad}/${escenario}/MAXIMUM_VELOCITY.tif`;

        await loadGeoTIFF(depthFile, "depth", "Altura de Inundación (m)");
        await loadGeoTIFF(velocityFile, "velocity", "Velocidad del Flujo (m/s)");

        // Mostrar primera capa por defecto si está activado el checkbox
        if (document.getElementById('alturas').checked) {
            toggleCapa("depth");
        }
        
    } catch (error) {
        console.error("Error cargando escenario:", error);
        mostrarNotificacion("Error al cargar el escenario seleccionado");
    } finally {
        mostrarLoader(false);
    }
}

// Función para cargar GeoTIFF
async function loadGeoTIFF(url, layerName, legendTitle) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Archivo no encontrado");
        const arrayBuffer = await response.arrayBuffer();
        const georaster = await parseGeoraster(arrayBuffer);

        const min = georaster.mins[0];
        const max = georaster.maxs[0];
        const scale = chroma.scale(["blue", "cyan", "green", "yellow", "red"]).domain([min, max]);

        layers[layerName] = new GeoRasterLayer({
            georaster: georaster,
            opacity: 0.7,
            resolution: 256,
            pixelValuesToColorFn: value => (value === null || value <= 0) ? null : scale(value).hex()
        });

        // Crear leyenda
        const leyenda = document.createElement("div");
        leyenda.innerHTML = `<h4>${legendTitle}</h4>`;
        let steps = 5;
        let range = (max - min) / steps;
        for (let i = 0; i < steps; i++) {
            let value = (min + i * range).toFixed(2);
            leyenda.innerHTML += `
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="width: 20px; height: 20px; background: ${scale(min + i * range).hex()}; margin-right: 10px;"></div>
                    ${value} - ${(min + (i + 1) * range).toFixed(2)}
                </div>`;
        }
        legends[layerName] = leyenda;
    } catch (error) {
        console.error("Error cargando GeoTIFF:", error);
        throw error;
    }
}

// Alternar capas
function toggleCapa(layerName) {
    if (layers[layerName]) {
        if (map.hasLayer(layers[layerName])) {
            map.removeLayer(layers[layerName]);
        } else {
            // Ocultar otras capas de escenario primero
            Object.keys(layers).forEach(key => {
                if (key !== layerName && map.hasLayer(layers[key])) {
                    map.removeLayer(layers[key]);
                }
            });
            map.addLayer(layers[layerName]);
        }
        // Actualizar la leyenda
        document.getElementById("leyenda").innerHTML = legends[layerName].innerHTML;
    }
}

// Event Listeners
document.getElementById("cuenca").addEventListener("change", function() {
    cargarLocalidades();
    if (subbasinLayer) map.removeLayer(subbasinLayer);
    if (topoLayer) map.removeLayer(topoLayer);
    Object.values(layers).forEach(layer => map.removeLayer(layer));
    document.getElementById("leyenda").innerHTML = '';
});

document.getElementById("localidad").addEventListener("change", async function() {
    const cuenca = document.getElementById("cuenca").value;
    const localidad = this.value;
    
    if (cuenca && localidad) {
        await cargarSubbasin(cuenca, localidad);
        await cargarTopografia(cuenca, localidad);
        
        const escenarioSelect = document.getElementById("escenario");
        escenarioSelect.innerHTML = '<option value="">Seleccione un escenario</option>';
        escenarioSelect.disabled = false;
        
        datos[cuenca][localidad].escenarios.forEach(esc => {
            escenarioSelect.innerHTML += `<option value="${esc}">${esc}</option>`;
        });
    }
});

document.getElementById("escenario").addEventListener("change", cargarEscenario);

// Controles de transparencia
document.getElementById("transparencia-subbasin").addEventListener("input", (e) => {
    if (subbasinLayer) {
        subbasinLayer.setStyle({ opacity: parseFloat(e.target.value) });
    }
});

document.getElementById("transparencia-topo").addEventListener("input", (e) => {
    if (topoLayer) {
        topoLayer.setOpacity(parseFloat(e.target.value));
    }
});

document.getElementById("transparencia-alturas").addEventListener("input", (e) => {
    cambiarTransparencia('depth', e.target.value);
});

document.getElementById("transparencia-velocidades").addEventListener("input", (e) => {
    cambiarTransparencia('velocity', e.target.value);
});

// Toggle para capas base
document.getElementById("toggle-subbasin").addEventListener("change", (e) => {
    if (subbasinLayer) {
        e.target.checked ? map.addLayer(subbasinLayer) : map.removeLayer(subbasinLayer);
    }
});

document.getElementById("toggle-topo").addEventListener("change", (e) => {
    if (topoLayer) {
        e.target.checked ? map.addLayer(topoLayer) : map.removeLayer(topoLayer);
    }
});

function cambiarTransparencia(layerName, opacity) {
    if (layers[layerName]) {
        layers[layerName].setOpacity(parseFloat(opacity));
    }
}

// Escuchar cambios de zoom
map.on('zoomend', actualizarVisibilidadCapas);


// Inicializar
cargarDatos();