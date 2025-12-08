// traduccionapi.js (Módulo de Backend para Node.js/Express)

const express = require("express");
const router = express.Router();
require("dotenv").config();
const fetch = require("node-fetch");

// ⚙️ Tu API key
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Verificación inicial de la clave (solo en desarrollo, no detiene la app si falta la clave en producción)
if (!API_KEY) {
    console.warn("ADVERTENCIA: GOOGLE_TRANSLATE_API_KEY no está definida en process.env. La traducción fallará.");
    // En entornos de producción, se debe asegurar que esto detenga la aplicación o lance un error.
}

// 2. Importar el cliente de Google y usar la clave en la inicialización
// Requiere: npm install @google-cloud/translate
const { Translate } = require('@google-cloud/translate').v2;

// Inicializamos el cliente pasándole la clave de forma segura
const translateClient = new Translate({ key: API_KEY });

/**
 * Endpoint POST: /utils/translate
 * Objetivo: Recibir texto del frontend y traducirlo de forma segura.
 * * Recibe: { text: string, targetLang: string, sourceLang: string }
 * Devuelve: { translatedText: string }
 */
router.post('/translate', async (req, res) => {

    // Si tu ruta es /utils/translate, este es el handler.
    const { text, targetLang, sourceLang = 'es' } = req.body;

    if (!text || !targetLang) {
        return res.status(400).send({
            error: 'Missing parameters: "text" or "targetLang".'
        });
    }

    // 3. Ejecutar la llamada a la API de Google
    try {
        console.log(`[Google Translate] Traduciendo de ${sourceLang} a ${targetLang}: "${text.substring(0, 30)}..."`);

        const [translations] = await translateClient.translate(text, {
            from: sourceLang,
            to: targetLang
        });

        const translatedText = Array.isArray(translations) ? translations[0] : translations;

        // 4. Devolver la respuesta al frontend
        res.status(200).send({
            translatedText: translatedText,
            targetLang: targetLang
        });

    } catch (e) {
        console.error('Error al llamar a Google Cloud Translation:', e.message);

        // Devolver un error 500 al frontend
        res.status(500).send({
            error: 'Failed to communicate with translation service.',
            details: e.message
        });
    }
});

module.exports = router;