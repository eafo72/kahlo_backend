const express = require("express");
const router = express.Router();
require("dotenv").config();
const fetch = require("node-fetch");

// ⚙️ Tu API key de Google Maps
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// 📍 CONSTANTES GEOGRÁFICAS: DISTRITO MEDANO (Centro aprox: Mango Deck / The Office)
const MEDANO_LAT = "22.886800";
const MEDANO_LNG = "-109.906500";
const MEDANO_RADIUS = "1200"; // 1.2km para cubrir toda la franja de playa y hoteles traseros

// ============================================================================
// 1) /places-medano/lugares → Búsqueda manual (útil para filtros específicos)
// ============================================================================
router.get("/lugares", async (req, res) => {
    try {
        // Si no envían coords, usamos las del Medano por defecto
        const lat = req.query.lat || MEDANO_LAT;
        const lng = req.query.lng || MEDANO_LNG;
        const radius = req.query.radius || MEDANO_RADIUS;
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
        console.error("Error en /places-medano/lugares:", error);
        res.status(500).json({ ok: false, error: "Error obteniendo lugares del Medano" });
    }
});

// ============================================================================
// 2) Helper → Función interna para paginación (Reutilizable)
// ============================================================================
async function buscarCategoria(type, lat, lng, radius) {
    let resultados = [];
    let nextPageToken = null;

    // Google limita a 60 resultados (3 páginas de 20)
    for (let i = 0; i < 3; i++) {
        let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${API_KEY}`;

        if (nextPageToken) url += `&pagetoken=${nextPageToken}`;

        const resp = await fetch(url);
        const data = await resp.json();

        if (data.results) resultados = resultados.concat(data.results);

        if (!data.next_page_token) break;

        nextPageToken = data.next_page_token;
        // Espera obligatoria de Google entre páginas
        await new Promise(r => setTimeout(r, 2000));
    }

    return resultados;
}

// ============================================================================
// 3) /places-medano/todo → Genera la "Base de Datos" local para el buscador
// ============================================================================
router.get("/todo", async (req, res) => {
    try {
        // Categorías curadas para el "Vibe" del Medano
        // NOTA: 'beach_club' no existe en Google, caen bajo bar/restaurant/tourist_attraction
        const categorias = {
            restaurantes: "restaurant", // Comida
            bares: "bar",               // Beach Clubs entran aquí a menudo
            hoteles: "lodging",         // Vital en Medano (Resorts)
            actividades: "tourist_attraction", // Motos de agua, paracaídas
            spas: "spa",                // Muy buscado en zona hotelera
            vida_nocturna: "night_club",
            cafes: "cafe"
        };

        let resultadosFinales = [];

        console.log("⚡ Iniciando escaneo de Distrito Medano...");

        for (const [nombre, type] of Object.entries(categorias)) {
            console.log(`   Scraping categoría: ${nombre}...`);
            const datos = await buscarCategoria(type, MEDANO_LAT, MEDANO_LNG, MEDANO_RADIUS);

            const mapeados = datos.map(x => ({
                place_id: x.place_id,
                nombre: x.name,
                categoria: nombre, // Etiqueta personalizada para tu buscador
                direccion: x.vicinity,
                ubicacion: x.geometry?.location,
                rating: x.rating,
                user_ratings_total: x.user_ratings_total,
                types: x.types, // Guardamos los tipos originales para filtrado fino
                foto: x.photos ? x.photos[0]?.photo_reference : null
            }));

            resultadosFinales = resultadosFinales.concat(mapeados);
        }

        // Eliminar duplicados (Un hotel puede ser bar y restaurante a la vez)
        const unicos = Object.values(
            resultadosFinales.reduce((acc, obj) => {
                // Si ya existe, conservamos el que tenga más data o simplemente el primero
                if (!acc[obj.place_id]) {
                    acc[obj.place_id] = obj;
                }
                return acc;
            }, {})
        );

        console.log(`✅ Total lugares únicos encontrados: ${unicos.length}`);

        res.json({
            ok: true,
            zona: "Distrito Medano",
            total: unicos.length,
            lugares: unicos
        });

    } catch (error) {
        console.error("Error en /places-medano/todo:", error);
        res.status(500).json({ ok: false, error: "Error generando todo Medano" });
    }
});

// ============================================================================
// 4) /places-medano/empresa/:place_id → Detalles individuales
// ============================================================================
router.get("/empresa/:place_id", async (req, res) => {
    try {
        const { place_id } = req.params;
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&key=${API_KEY}&language=es`; // Forzamos español

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
// 5) /places-medano/foto/:ref → Proxy de imágenes (CORS Friendly)
// ============================================================================
router.get("/foto/:ref", async (req, res) => {
    try {
        const ref = req.params.ref;
        // Maxwidth 800 es buen balance calidad/peso
        const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${API_KEY}`;

        const response = await fetch(url);

        res.setHeader('Access-Control-Allow-Origin', '*'); 

        response.headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            if (lowerKey !== 'x-content-type-options' && 
                lowerKey !== 'content-security-policy' && 
                lowerKey !== 'access-control-allow-origin') {
                res.setHeader(key, value);
            }
        });
        
        response.body.pipe(res);

    } catch (error) {
        console.error("Error en /foto:", error);
        res.status(500).send("Error descargando foto");
    }
});

module.exports = router;