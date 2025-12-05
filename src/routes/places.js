const express = require("express");
const router = express.Router();
require("dotenv").config();
const fetch = require("node-fetch");

// ⚙️ Tu API key
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// ============================================================================
// 1) /places/lugares → búsqueda manual (restaurants, bars, keyword, etc.)
// ============================================================================
router.get("/lugares", async (req, res) => {
    try {
        const lat = req.query.lat || "22.879472";     // Puerto Cabo San Lucas
        const lng = req.query.lng || "-109.911278";
        const radius = req.query.radius || "800";     // 800m around the marina
        const type = req.query.type || null;
        const keyword = req.query.keyword || null;

        let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${API_KEY}`;

        if (type) url += `&type=${type}`;
        if (keyword) url += `&keyword=${keyword}`;

        const response = await fetch(url);
        const data = await response.json();

        return res.json({
            ok: true,
            lugares: data.results,
            next_page_token: data.next_page_token || null
        });

    } catch (error) {
        console.error("Error en /lugares:", error);
        res.status(500).json({ ok: false, error: "Error obteniendo lugares" });
    }
});

// ============================================================================
// 2) Helper → obtener una categoría completa con paginación
// ============================================================================
async function buscarCategoria(type, lat, lng, radius) {
    let resultados = [];
    let nextPageToken = null;

    for (let i = 0; i < 3; i++) {  // Google permite 3 páginas
        let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${API_KEY}`;

        if (nextPageToken) url += `&pagetoken=${nextPageToken}`;

        const resp = await fetch(url);
        const data = await resp.json();

        if (data.results) resultados = resultados.concat(data.results);

        if (!data.next_page_token) break;

        nextPageToken = data.next_page_token;

        // Google exige esperar 2 segundos entre páginas
        await new Promise(r => setTimeout(r, 2000));
    }

    return resultados;
}

// ============================================================================
// 3) /places/todo → genera TODAS las categorías para conocetupuerto
// ============================================================================
router.get("/todo", async (req, res) => {
    try {
        const lat = "22.879472";
        const lng = "-109.911278";
        const radius = 800;

        // Categorías base del portal
        const categorias = {
            restaurantes: "restaurant",
            bares: "bar",
            cafes: "cafe",
            hoteles: "lodging",
            atracciones: "tourist_attraction",
            tiendas: "store",
            vida_nocturna: "night_club",
        };

        let resultadosFinales = [];

        for (const [nombre, type] of Object.entries(categorias)) {
            console.log("Buscando categoría:", nombre);

            const datos = await buscarCategoria(type, lat, lng, radius);

            const mapeados = datos.map(x => ({
                place_id: x.place_id,
                nombre: x.name,
                categoria: nombre,
                direccion: x.vicinity,
                ubicacion: x.geometry?.location,
                rating: x.rating,
                foto: x.photos ? x.photos[0]?.photo_reference : null
            }));

            resultadosFinales = resultadosFinales.concat(mapeados);
        }

        // Eliminar duplicados por place_id
        const unicos = Object.values(
            resultadosFinales.reduce((acc, obj) => {
                acc[obj.place_id] = obj;
                return acc;
            }, {})
        );

        res.json({
            ok: true,
            total: unicos.length,
            lugares: unicos
        });

    } catch (error) {
        console.error("Error en /todo:", error);
        res.status(500).json({ ok: false, error: "Error generando todo" });
    }
});

// ============================================================================
// 4) /places/empresa/:place_id → información detallada
// ============================================================================
router.get("/empresa/:place_id", async (req, res) => {
    try {
        const { place_id } = req.params;

        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&key=${API_KEY}`;

        const resp = await fetch(url);
        const data = await resp.json();

        res.json({
            ok: true,
            empresa: data.result
        });

    } catch (error) {
        console.error("Error en /empresa:", error);
        res.status(500).json({ ok: false, error: "Error obteniendo detalles" });
    }
});

// ============================================================================
// 5) /places/foto/:ref → entrega fotos sin exponer API key
// ============================================================================
router.get("/foto/:ref", async (req, res) => {
    try {
        const ref = req.params.ref;

        const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${API_KEY}`;

        const response = await fetch(url);

        // 🟢 PASO 1: Agregar el encabezado CORS
        // Esto le dice al navegador que el contenido es seguro para ser cargado
        // desde cualquier origen (*), resolviendo el bloqueo.
        res.setHeader('Access-Control-Allow-Origin', '*'); 

        // 🟡 PASO 2: Copiar headers
        // Copiar los demás headers tal cual los manda Google, excepto el que
        // podría estar causando conflicto o ya está establecido.
        response.headers.forEach((value, key) => {
            // Excluimos Content-Type para asegurarnos de que el navegador no lo bloquee por MIME type.
            // Aunque es mejor dejarlo, a veces el orden de los headers ayuda.
            // Para ser más seguro, solo aseguramos que el Content-Type se copie, si no existe el de Google.
            if (key !== 'access-control-allow-origin') {
                 res.setHeader(key, value);
            }
        });
        
        // Y enviar la imagen
        response.body.pipe(res);

    } catch (error) {
        console.error("Error en /foto:", error);
        res.status(500).send("Error descargando foto");
    }
});

module.exports = router;
