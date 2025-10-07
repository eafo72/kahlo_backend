// src/routes/fotografias.js

const express = require('express');
const router = express.Router(); // Usamos router en lugar de app para este módulo
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const auth = require('../middlewares/authorization')

// AÑADIDO: Carga las variables de entorno inmediatamente
// Esto garantiza que process.env esté disponible
require('dotenv').config(); 


// --- INICIO DE LA INTEGRACIÓN DE GOOGLE DRIVE API ---
// --- Configuración y Auth de Google Drive ---
const FOLDER_ID = process.env.DRIVE_FOLDER_ID;
const serviceAccount = JSON.parse(
  Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE, "base64").toString("utf-8")
);


if (!FOLDER_ID) {
  console.warn('⚠️ WARNING: DRIVE_FOLDER_ID no está definido. Las rutas de Drive fallarán.');
}


let drive;
try {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    drive = google.drive({ version: 'v3', auth });
    console.log('[DRIVE INIT] Google Drive API inicializada correctamente.');
} catch (error) {
    console.error('CRITICAL ERROR: No se pudo inicializar la API de Google Drive.', error.message);
}
// --- FIN DE LA INTEGRACIÓN DE GOOGLE DRIVE API ---


// --- RUTA 1: Buscar Archivos por ID de Reservación ---
// GET /fotografias/buscar/:id
router.get('/buscar/:id', auth, async (req, res) => {
  if (!drive) return res.status(503).json({ error: 'Servicio de Drive no disponible' });
  
  try {
    const id = (req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'id vacío' });
    if (!FOLDER_ID) return res.status(500).json({ error: 'Folder ID no configurado' });

    // Consulta: buscar archivos en la carpeta cuyo nombre contiene el ID
    const q = `'${FOLDER_ID}' in parents and trashed = false and name contains '${id}'`;
    
    console.log(`[DRIVE QUERY] Ejecutando consulta: ${q}`); 

    const resp = await drive.files.list({
      q,
      fields: 'files(id,name,mimeType,createdTime,size)',
      pageSize: 1000
    });

    const files = (resp.data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      createdTime: f.createdTime,
      size: f.size,
      // URL que el servidor sirve: la ruta será /fotografias/imagen/:fileId
      url: `/fotografias/imagen/${f.id}` 
    }));

    res.json(files);
  } catch (err) {
    console.error('Error /buscar:', err.message);
    res.status(500).json({ error: 'Error listando archivos' });
  }
});


// GET /fotografias/imagen/:fileId  (PÚBLICA)
router.get('/imagen/:fileId', async (req, res) => {
  if (!drive) return res.status(503).send('Servicio de Drive no disponible');
  try {
    const fileId = req.params.fileId;
    if (!fileId) return res.status(400).send('fileId requerido');

    // Obtener metadata
    const meta = await drive.files.get({ fileId, fields: 'id,name,mimeType' });
    const mimeType = meta.data.mimeType || 'application/octet-stream';
    const fileName = meta.data.name || 'archivo';

    // ✅ Encabezados correctos
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName.replace(/"/g, '')}"`);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', 'https://boletos.museocasakahlo.org');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Stream del archivo
    const r = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
    r.data.pipe(res);
  } catch (err) {
    console.error('Error /imagen/:', err.message);
    res.status(500).send('No se pudo obtener el archivo');
  }
});

// ============================================================================
// 🧩 RUTA 3: WEBHOOK DE CONTEO DE PERSONAS (MILESIGHT)
// POST /fotografias/milesight-people-count
// 🔓 Pública: No requiere token (Milesight no usa nuestro 'auth' middleware)
// ============================================================================
router.post('/milesight-people-count', (req, res) => {
  try {
    const data = req.body;
    
    // ⚠️ NOTA IMPORTANTE: El formato exacto de 'data' depende del payload de Milesight.
    // Usaremos valores genéricos para la demostración, por ejemplo:
    // device_eui, people_in, people_out.
    const deviceId = data.device_eui || 'unknown-device'; 
    let peopleIn = 0;
    let peopleOut = 0;
    
    // Suponiendo que el payload tiene un campo 'payload' con los contadores
    if (data.payload && typeof data.payload === 'object') {
        peopleIn = data.payload.people_in || 0;
        peopleOut = data.payload.people_out || 0;
    } 
    // Si no tiene 'payload', asumimos que los contadores están en el nivel superior
    else {
        peopleIn = data.people_in || 0;
        peopleOut = data.people_out || 0;
    }
    const currentCount = peopleIn - peopleOut; 
    
    console.log(`[MILESIGHT WEBHOOK] Datos recibidos de: ${deviceId}`);
    console.log(`[MILESIGHT WEBHOOK] Personas que ENTRARON: ${peopleIn}`);
    console.log(`[MILESIGHT WEBHOOK] Personas que SALIERON: ${peopleOut}`);
    console.log(`[MILESIGHT WEBHOOK] CONTEO ACTUAL EN SALA: ${currentCount}`);
    // Aquí iría tu lógica real:
    // 1. Validar el origen de la solicitud (puede ser por una 'secret key' en el header/body).
    // 2. Almacenar 'currentCount' en la base de datos (MongoDB, PostgreSQL, etc.).
    // 3. Emitir un evento Socket.io a los clientes.
    // ...
    // Responder con 200 OK es crucial para que Milesight sepa que el envío fue exitoso.
    res.status(200).json({ status: 'success', message: 'Webhook data processed', deviceId, currentCount });
    
  } catch (error) {
    console.error('❌ Error en /milesight-people-count Webhook:', error.message);
    // Responder 500 para indicar a Milesight que reintente (si tienen esa configuración).
    res.status(500).json({ error: 'Error procesando el Webhook' });
  }
});

// Exportamos el router y el objeto drive para que index.js pueda montar la ruta y el cron job.
module.exports = {
    router: router,
    drive: drive 
};