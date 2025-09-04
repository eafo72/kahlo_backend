const cron = require('node-cron')
const express = require('express')
const path = require('path');
const helmet = require('helmet');

const customRateLimit = require('./src/middlewares/customRateLimit');

const cors = require('cors')

const app = express()

// 1) Middleware de seguridad general
app.use(helmet());

// 1.1) Rate Limiting: protege de abusos (300 peticiones cada 15 minutos por IP)
app.set('trust proxy', '127.0.0.1'); // muy importante si usas proxy inverso sino devolvera la misma ip siempre desde nginx ojo la ip es la nginx

//ips bloquedas definitivamente
let blockedIps = [];
app.use((req, res, next) => {
  const ip = req.ip;
  if (blockedIps.includes(ip)) {
    return res.status(403).json({ error: 'Acceso bloqueado' });
  }
  next();
});

app.use(customRateLimit);

// 2) Parser de JSON / URL–encoded
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// 3) Denegar dotfiles en la carpeta pública
app.use(
  express.static(path.join(__dirname, 'public'), {
    dotfiles: 'deny'   // rechaza /.env, /.gitignore, etc.
  })
);

// 3.1 Bloqueo por User-Agent sospechoso
const blockedAgents = [
  'postmanruntime',
  'curl',
  'insomnia',
  'httpie',
  'python-requests',
  'axios',
  'Custom-AsyncHttpClient',
  'WanScannerBot/1.1',
  'Mozilla/5.0',
  'Go-http-client/1.1'
];

app.use((req, res, next) => {
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';
  if (blockedAgents.some(agent => userAgent.includes(agent))) {
    console.warn('[❌ USER-AGENT BLOQUEADO]', {
      metodo: req.method,
      url: req.originalUrl,
      userAgent,
    });
    return res.status(403).json({ error: 'User-Agent bloqueado' });
  }
  next();
});

// 4) Aquí iría tu middleware de CORS (el que registra origin, etc.)
//http://localhost:5173



const allowedOrigins = [
  'https://agencianuba.com',
  'http://localhost:4000'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const userAgent = req.headers['user-agent'];

//  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  /*} else {
        console.warn('[⚠️ ORIGIN NO PERMITIDO]', {
      metodo: req.method,
      url: req.originalUrl,
      origin,
      userAgent,
    });
    // Bloquea la solicitud con un error 403 (Forbidden)
    return res.status(403).json({ error: 'Origen no permitido' });
}*/


  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token'
  );
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    // Preflight
    return res.sendStatus(204);
  }
  next();
});

require('dotenv').config()
const db = require('./src/config/db')

async function cronTour(){    
    try {
        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        let fecha = date + ' ' + time;

        let query = `UPDATE viajeTour SET
                        updated_at    = '${fecha}', 
                        status_viaje  = 'realizado'
                        WHERE fecha_regreso < '${fecha}' AND status_viaje = 'en curso' OR  
                        fecha_regreso < '${fecha}' AND status_viaje = 'proximo'`;

        let result = await db.pool.query(query);
        result = result[0];

        console.log("Cron job realizado");
        

    } catch (error) {
        console.log(error);
        console.log("Cron job NO realizado");
    }
} 
//CRON para marcar como terminados los tours que no termino el guia
//At 01:00 on every day-of-week from Sunday through Saturday. www.crontab.guru
cron.schedule("0 1 * * 0-6", function () {
    console.log("---------------------");
    console.log("running a cron job every day");
    
    cronTour();

});

// Lista de rutas bloqueadas
const rutasBloqueadas = ['/device.rsp', '/admin.rsp', '/test.sh', '/shell.cgi', '/HNAP1/', '/setup.cgi', '/cgi-bin/luci/', '/cgi-bin/login.cgi', '/cgi-bin/config.exp', '/dvr/'];

// Middleware para bloquearlas con 403
app.use((req, res, next) => {
  if (rutasBloqueadas.includes(req.path)) {
    return res.status(403).json({ error: 'Ruta bloqueada' });
  }
  next();
});

//rutas
const userRoutes = require('./src/routes/users')
const adminRoutes = require('./src/routes/admin')
const categoriaRoutes = require('./src/routes/categoria')
const empresaRoutes = require('./src/routes/empresa')
const guiaRoutes = require('./src/routes/guia')
const tourRoutes = require('./src/routes/tour')
const fotosTourRoutes = require('./src/routes/foto')
const fechaTourRoutes = require('./src/routes/fecha-tour')
const rutasTourRoutes = require('./src/routes/rutas-tour')
const viajeTourRoutes = require('./src/routes/viaje-tour')
const comentarioRoutes = require('./src/routes/comentario')
const ventaRoutes = require('./src/routes/venta')

app.use('/usuario', userRoutes)
app.use('/admin/admin', adminRoutes)
app.use('/admin/categoria', categoriaRoutes)
app.use('/admin/empresa', empresaRoutes)
app.use('/admin/guia', guiaRoutes)
app.use('/admin/tour', tourRoutes)
app.use('/admin/fotos-tour', fotosTourRoutes)
app.use('/admin/fecha-tour', fechaTourRoutes)
app.use('/admin/rutas-tour', rutasTourRoutes)
app.use('/admin/viaje-tour', viajeTourRoutes)
app.use('/cliente/comentario', comentarioRoutes)
app.use('/venta', ventaRoutes)

app.get('/', (req, res) => res.send('KAHLO API'))

app.listen(4000)
console.log('Server running on port 4000');