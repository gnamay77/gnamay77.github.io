// Configuración inicial del mapa (centrado en Perú)
var map = L.map('map').setView([-9.19, -75.01], 6);

// Capa base de OpenStreetMap
L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', {
    attribution: 'Google Maps'
}).addTo(map);

        // Función para mostrar/ocultar etiquetas según el nivel de zoom
        function updateLabels() {
            var currentZoom = map.getZoom();
            if (currentZoom >= 9 && currentZoom <= 12) {
                // Mostrar etiquetas
                cuencasLayer.eachLayer(function(layer) {
                    if (layer.feature.properties && layer.feature.properties.NOMBRE) {
                        layer.bindTooltip(layer.feature.properties.NOMBRE, {
                            permanent: true,
                            direction: 'center',
                            className: 'label-style' // Aplicar el estilo personalizado
                        }).openTooltip();
                    }
                });
            } else {
                // Ocultar etiquetas
                cuencasLayer.eachLayer(function(layer) {
                    layer.unbindTooltip();
                });
            }
        }

        // Añadir la capa de cuencas desde el archivo cuencas.js
        var cuencasLayer = L.geoJSON(cuencas, {
            style: function(feature) {
                return {
                    color: '#1D2DFF',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.25
                };
            },
            onEachFeature: function(feature, layer) {
                if (feature.properties && feature.properties.NOMBRE) {
                    layer.bindPopup(feature.properties.NOMBRE);
                }
            }
        });

        // Controlar la visibilidad de la capa según el nivel de zoom
        map.on('zoomend', function() {
            var currentZoom = map.getZoom();
            if (currentZoom >= 6 && currentZoom <= 12) {
                if (!map.hasLayer(cuencasLayer)) {
                    map.addLayer(cuencasLayer);
                }
                updateLabels(); // Actualizar etiquetas al cambiar el zoom
            } else {
                if (map.hasLayer(cuencasLayer)) {
                    map.removeLayer(cuencasLayer);
                }
            }
        });

        // Añadir la capa inicialmente si el zoom está entre 6 y 12
        if (map.getZoom() >= 6 && map.getZoom() <= 12) {
            map.addLayer(cuencasLayer);
            updateLabels(); // Mostrar etiquetas si el zoom inicial está entre 9 y 12
        }

// Objetos para almacenar capas y leyendas
let layers = {};
let legends = {};

// Variable para almacenar los datos de cuencas y localidades
let datos = {};

// Función para cargar los datos desde el archivo JSON
async function cargarDatos() {
    try {
        const response = await fetch("data.json");
        if (!response.ok) throw new Error("Error al cargar los datos");
        datos = await response.json();
        generarMenuCuencas();
    } catch (error) {
        console.error("Error:", error);
        alert("No se pudieron cargar los datos. Inténtalo de nuevo más tarde.");
    }
}

// Función para generar el menú de cuencas
function generarMenuCuencas() {
    const cuencaSelect = document.getElementById("cuenca");
    cuencaSelect.innerHTML = '<option value="">Seleccione una cuenca</option>';
    for (const cuenca in datos) {
        cuencaSelect.innerHTML += `<option value="${cuenca}">${cuenca}</option>`;
    }
}

// Función para cargar las localidades de una cuenca
function cargarLocalidades() {
    const cuencaSelect = document.getElementById("cuenca");
    const localidadSelect = document.getElementById("localidad");
    const cuencaSeleccionada = cuencaSelect.value;

    localidadSelect.innerHTML = '<option value="">Seleccione una localidad</option>';
    localidadSelect.disabled = !cuencaSeleccionada;

    if (cuencaSeleccionada) {
        for (const localidad in datos[cuencaSeleccionada]) {
            const option = document.createElement("option");
            option.value = localidad;
            option.textContent = localidad;
            localidadSelect.appendChild(option);
        }
    }
}

// Función para cargar un archivo GeoTIFF y agregarlo como capa
async function loadGeoTIFF(url, layerName, legendTitle) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Error al cargar el archivo GeoTIFF");
        const arrayBuffer = await response.arrayBuffer();
        const georaster = await parseGeoraster(arrayBuffer);

        const min = georaster.mins[0];
        const max = georaster.maxs[0];
        const scale = chroma.scale(["blue", "cyan", "green", "yellow", "red"]).domain([min, max]);

        // Aplicar suavizado a los datos raster
        const smoothedRaster = suavizarRaster(georaster.values[0]);

        layers[layerName] = new GeoRasterLayer({
            georaster: {
                ...georaster,
                values: [smoothedRaster] // Usar los datos suavizados
            },
            opacity: 0.7,
            resolution: 256,
            pixelValuesToColorFn: value => (value === null || value <= 0) ? null : scale(value).hex()
        });

        // Crear leyenda y guardarla en el objeto legends
        const leyenda = document.createElement("div");
        leyenda.innerHTML = `<h4>${legendTitle}</h4>`;
        let steps = 5;
        let range = (max - min) / steps;
        let colors = ["blue", "cyan", "green", "yellow", "red"];
        for (let i = 0; i < steps; i++) {
            let value = (min + i * range).toFixed(2);
            leyenda.innerHTML += `
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="width: 20px; height: 20px; background: ${colors[i]}; margin-right: 10px;"></div>
                    ${value} - ${(min + (i + 1) * range).toFixed(2)}
                </div>`;
        }
        legends[layerName] = leyenda; // Guardar la leyenda en el objeto legends
    } catch (error) {
        console.error("Error:", error);
        alert("No se pudo cargar el archivo GeoTIFF. Inténtalo de nuevo más tarde.");
    }
}

// Función para suavizar los datos raster (interpolación básica)
function suavizarRaster(data) {
    const width = data.length;
    const height = data[0].length;
    const smoothedData = new Array(width).fill().map(() => new Array(height).fill(0));

    for (let x = 1; x < width - 1; x++) {
        for (let y = 1; y < height - 1; y++) {
            // Promedio de los valores circundantes
            smoothedData[x][y] = (
                data[x - 1][y - 1] + data[x - 1][y] + data[x - 1][y + 1] +
                data[x][y - 1] + data[x][y] + data[x][y + 1] +
                data[x + 1][y - 1] + data[x + 1][y] + data[x + 1][y + 1]
            ) / 9;
        }
    }

    return smoothedData;
}

// Función para cargar los archivos de una localidad
async function cargarLocalidad(cuenca, localidad) {
    // Limpiar capas anteriores
    Object.values(layers).forEach(layer => map.removeLayer(layer));

    // Cargar archivos de la localidad seleccionada
    const depthFile = `data/${cuenca}/${localidad}/MAXIMUM_DEPTH.tif`;
    const velocityFile = `data/${cuenca}/${localidad}/MAXIMUM_VELOCITY.tif`;

    await loadGeoTIFF(depthFile, "depth", "Altura de Inundación (m)");
    await loadGeoTIFF(velocityFile, "velocity", "Velocidad del Flujo (m/s)");

    // Ajustar la vista del mapa a las coordenadas de la localidad
    const coordenadas = datos[cuenca][localidad];
    if (coordenadas && coordenadas.lat && coordenadas.lng) {
        map.setView([coordenadas.lat, coordenadas.lng], 15); // Ajusta el zoom según sea necesario
    }

    // Mostrar la primera capa por defecto
    toggleCapa("depth");
}

// Función para alternar capas y actualizar la leyenda
function toggleCapa(layerName) {
    if (layers[layerName]) {
        if (map.hasLayer(layers[layerName])) {
            map.removeLayer(layers[layerName]);
        } else {
            // Ocultar todas las capas primero
            Object.values(layers).forEach(layer => map.removeLayer(layer));
            // Mostrar la capa seleccionada
            map.addLayer(layers[layerName]);
        }
        // Actualizar la leyenda
        const leyenda = document.getElementById("leyenda");
        leyenda.innerHTML = legends[layerName].innerHTML;
    }
}

// Evento para cambiar de localidad
document.getElementById("localidad").addEventListener("change", function () {
    const cuenca = document.getElementById("cuenca").value;
    const localidad = this.value;

    if (cuenca && localidad) {
        cargarLocalidad(cuenca, localidad);
    }
});

// Cargar los datos al iniciar la aplicación
cargarDatos();