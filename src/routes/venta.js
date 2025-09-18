/* Importing the express module and creating an instance of it. */
const express = require('express')
const app = express.Router()
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const auth = require('../middlewares/authorization')
const db = require('../config/db')
const mailer = require('../controller/mailController')
const helperName = require('../helpers/name')
const QRCode = require('qrcode')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

function addHoursToDate(objDate, intHours) {
    var numberOfMlSeconds = objDate.getTime();
    var addMlSeconds = (intHours * 60) * 60000;
    var newDateObj = new Date(numberOfMlSeconds + addMlSeconds);
    return newDateObj;
}

function weekDay(fecha) {
    let dayselected;

    if (typeof fecha === 'string') {
        const [year, month, day] = fecha.split('-').map(Number);
        dayselected = new Date(year, month - 1, day); // <-- sin UTC
    } else {
        dayselected = fecha;
    }

    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    return diasSemana[dayselected.getDay()];
}

// Función para generar el código QR
async function generateQRCode(text) {
    try {
        const qrCodeDataURL = await QRCode.toDataURL(text);
        return qrCodeDataURL;
    } catch (err) {
        console.error('Error generating QR Code:', err);
        throw err;
    }
}

//////////////////////////////////////////
//                Venta                 //
//////////////////////////////////////////
app.get('/ventas', async (req, res) => {
    try {
        let query = "SELECT * FROM venta";
        let ventas = await db.pool.query(query);

        res.status(200).json(ventas[0]);

    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})

//ventas por mes
app.get('/ventaspormes', async (req, res) => {
    try {
        let query = "SELECT MONTHNAME(v.fecha_compra) AS Mes, SUM(v.total) AS Total FROM venta v WHERE YEAR(v.fecha_compra) = '2024' GROUP BY Mes ORDER BY Mes ASC";
        let ventas = await db.pool.query(query);
        res.status(200).json(ventas[0]);
    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})

//tours vendidos por mes
app.get('/tourspormes', async (req, res) => {
    try {
        //let query = "SELECT MONTHNAME(v.fecha_compra) AS Mes, SUM(v.no_boletos) AS Total FROM venta v WHERE YEAR(v.fecha_compra) = '2024' GROUP BY Mes ORDER BY Mes ASC;";
        let query = `SELECT t.nombre, SUM(v.no_boletos) AS Total FROM venta v 
        INNER JOIN viajeTour AS vt
        ON v.viajeTour_id = vt.id 
        INNER JOIN tour AS t
        ON vt.tour_id = t.id
        WHERE YEAR(v.fecha_compra) = '2024' GROUP BY t.nombre ORDER BY t.nombre ASC;`;

        let ventas = await db.pool.query(query);
        res.status(200).json(ventas[0]);
    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})

//ventas por mes por empresa
app.get('/ventaspormesbyempresa/:id', async (req, res) => {
    let empresaId = req.params.id;
    try {
        let query = `SELECT MONTHNAME(v.fecha_compra) AS Mes, SUM(v.total) AS Total FROM venta v 
        INNER JOIN viajeTour AS vt ON v.viajeTour_id = vt.id INNER JOIN tour AS t ON vt.tour_id = t.id
        WHERE YEAR(v.fecha_compra) = '2024' AND t.empresa_id = ${empresaId} GROUP BY Mes ORDER BY Mes ASC`;
        let ventas = await db.pool.query(query);
        res.status(200).json(ventas[0]);
    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})

//tours vendidos por mes por empresa
app.get('/tourspormesbyempresa/:id', async (req, res) => {
    let empresaId = req.params.id;
    try {
        //let query = `SELECT MONTHNAME(v.fecha_compra) AS Mes, SUM(v.no_boletos) AS Total FROM venta v INNER JOIN viajeTour AS vt ON v.viajeTour_id = vt.id INNER JOIN tour AS t ON vt.tour_id = t.id WHERE YEAR(v.fecha_compra) = '2024' AND t.empresa_id = ${empresaId} GROUP BY Mes ORDER BY Mes ASC`;

        let query = `SELECT t.nombre, SUM(v.no_boletos) AS Total FROM venta v 
        INNER JOIN viajeTour AS vt
        ON v.viajeTour_id = vt.id 
        INNER JOIN tour AS t
        ON vt.tour_id = t.id
        WHERE YEAR(v.fecha_compra) = '2024' AND t.empresa_id = ${empresaId} GROUP BY t.nombre ORDER BY t.nombre ASC;`;

        let ventas = await db.pool.query(query);
        res.status(200).json(ventas[0]);
    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})

//obtener venta por id
app.get('/obtener/:id', async (req, res) => {
    try {
        let ventaId = req.params.id;
        let query = `SELECT u.nombres AS nombreUsuario, u.apellidos AS apellidoUsuario, u.correo AS correoUsuario, v.id, v.no_boletos, 
                        pagado, fecha_compra, comision, status_traspaso, v.created_at, v.updated_at, v.cliente_id, v.viajeTour_id, v.total,
                        vt.fecha_ida, vt.fecha_regreso, vt.status, vt.tour_id, vt.guia_id, vt.geo_llegada, vt.geo_salida, vt.status_viaje,
                        t.nombre AS nombreTour
                        FROM venta 
                        AS v
                        INNER JOIN usuario
                        AS u
                        ON v.cliente_id = u.id 
                        INNER JOIN viajeTour
                        AS vt
                        ON v.viajeTour_id = vt.id
                        INNER JOIN tour
                        AS t
                        ON vt.tour_id = t.id
                        WHERE v.id=${ventaId}`;
        let venta = await db.pool.query(query);

        res.status(200).json(venta[0]);

    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})

//obtener ventas por viajeTour_id
app.get('/obtenerByViajeTourId/:id', async (req, res) => {
    try {
        let ventaId = req.params.id;
        let query = `SELECT * FROM venta WHERE viajeTour_id=${ventaId}`;
        let venta = await db.pool.query(query);

        res.status(200).json(venta[0]);

    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})

//la feha esta definida por AAAA-MM-DD y la hora desde 00 hasta 23
app.get('/disponibilidad/:tourid/fecha/:fecha/:hora', async (req, res) => {
    try {
        let fecha = req.params.fecha;
        let tourId = req.params.tourid;
        let hora = req.params.hora;
        let query = `SELECT 
                        * 
                        FROM viajeTour 
                        WHERE CAST(fecha_ida AS DATE) = '${fecha}'
                        AND HOUR(CAST(fecha_ida AS TIME)) = '${hora}'
                        AND tour_id = ${tourId};`;
        let disponibilidad = await db.pool.query(query);
        disponibilidad = disponibilidad[0];

        if (disponibilidad.length == 0) {
            return res.status(200).json({ msg: "No hay ninguna reserva todavia, todos los lugares disponibles", error: false, disponible: true, sinReserva: true });
        }

        disponibilidad = disponibilidad[0];

        if (disponibilidad.lugares_disp >= 1) {
            return res.status(200).json({ msg: "Lugares disponibles", error: false, disponible: true, sinReserva: false, lugares_disp: disponibilidad.lugares_disp });
        }

        res.status(200).json({ msg: "Lugares no disponibles", error: false, disponible: false, sinReserva: false, lugares_disp: disponibilidad.lugares_disp });

    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})

//la feha esta definida por AAAA-MM-DD
app.get('/horarios/:tourid/fecha/:fecha/boletos/:boletos', async (req, res) => {
    try {
        let fecha = req.params.fecha;
        let tourId = req.params.tourid;
        let boletos = parseInt(req.params.boletos);

        // Debug logs para depuración
        console.log('[HORARIOS] fecha:', fecha, 'tourId:', tourId, 'boletos:', boletos);

        //vemos que dia selecciono 
        let diaSeleccionado = weekDay(fecha);
        console.log('[HORARIOS] diaSeleccionado:', diaSeleccionado);

        //buscamos los horarios del tour
        let query = `SELECT * FROM fecha WHERE tour_id=${tourId} AND dia = '${diaSeleccionado}'`;
        console.log('[HORARIOS] query horarios:', query);
        let horariosResult = await db.pool.query(query);
        let horarios = horariosResult[0];
        console.log('[HORARIOS] horarios encontrados:', horarios);

        // Para cada horario, verificar disponibilidad
        let horariosDisponibles = await Promise.all(horarios.map(async (horario) => {
            // Soportar ambos nombres de campo: hora y hora_salida
            let horaCampo = horario.hora || horario.hora_salida;
            if (!horaCampo || typeof horaCampo !== 'string') {
                // Si no hay hora válida, ignorar este horario
                return {
                    ...horario,
                    disponible: false,
                    lugares_disp: 'sin_hora'
                };
            }
            let hora = horaCampo.split(":")[0];
            let queryViaje = `SELECT * FROM viajeTour WHERE CAST(fecha_ida AS DATE) = '${fecha}' AND HOUR(CAST(fecha_ida AS TIME)) = '${hora}' AND tour_id = ${tourId}`;
            console.log('[HORARIOS] query viajeTour:', queryViaje);
            let viajeResult = await db.pool.query(queryViaje);
            console.log('[HORARIOS] viajeResult:', viajeResult[0]);
            let disponible = true;
            let lugares_disp = null;
            if (viajeResult[0].length > 0) {
                let viaje = viajeResult[0][0];
                lugares_disp = viaje.lugares_disp;
                disponible = viaje.lugares_disp >= boletos;
            } else {
                // No hay viajeTour, consultar el tour para max_pasajeros
                let queryTour = `SELECT max_pasajeros FROM tour WHERE id = ${tourId}`;
                let tourResult = await db.pool.query(queryTour);
                let max_pasajeros = tourResult[0][0]?.max_pasajeros;
                if (typeof max_pasajeros === 'number') {
                    lugares_disp = max_pasajeros;
                    disponible = max_pasajeros >= boletos;
                } else {
                    lugares_disp = 'sin_info_tour';
                    disponible = false;
                }
            }
            return {
                ...horario,
                disponible,
                lugares_disp
            };
        }));

        res.status(200).json({ error: false, horarios: horariosDisponibles });

    } catch (error) {
        console.error('[HORARIOS] Error:', error);
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})

///API DE PRUEBAS DE TULIO/////
app.get('/horarios-disponibles/:tourId/:fecha_ida/:visitantes', async (req, res) => {
  try {
    const { tourId, fecha_ida, visitantes } = req.params;

    // Info del tour
    let query = `SELECT * FROM tour WHERE id = ${tourId}`;
    let tour = await db.pool.query(query);
    if (tour[0].length === 0) {
      return res.status(404).json({ msg: "Tour no encontrado" });
    }
    tour = tour[0][0];
    const max_pasajeros = tour.max_pasajeros;

    // Horarios posibles desde la tabla fecha (catálogo de horarios del tour)
    query = `SELECT * FROM fecha WHERE tour_id=${tourId}`;
    let salidas = await db.pool.query(query);
    salidas = salidas[0];

    const disponibles = [];

    for (let salida of salidas) {
      const hora = salida.hora_salida;
      const horaSplit = hora.split(':')[0]; // solo hora para el WHERE HOUR()

      // Revisar si ya hay viajeTour en esa fecha + hora
      query = `SELECT * FROM viajeTour 
               WHERE CAST(fecha_ida AS DATE) = '${fecha_ida}'
               AND HOUR(CAST(fecha_ida AS TIME)) = '${horaSplit}'
               AND tour_id = ${tourId}`;
      let viaje = await db.pool.query(query);
      viaje = viaje[0];

      let lugares_disp = max_pasajeros;
      if (viaje.length > 0) {
        lugares_disp = viaje[0].lugares_disp;
      }

      if (lugares_disp >= visitantes) {
        disponibles.push({
          hora: hora,
          lugares: lugares_disp
        });
      }
    }

    if (disponibles.length === 0) {
      return res.status(200).json({ horarios: [], msg: "No hay horarios con disponibilidad suficiente" });
    }

    res.status(200).json({ horarios: disponibles });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, msg: "Error obteniendo horarios disponibles", details: error });
  }
});

app.post('/crear', async (req, res) => {
    try {
        let { no_boletos, tipos_boletos, pagado, nombre_cliente, cliente_id, correo, viajeTourId, tourId, fecha_ida, horaCompleta, total } = req.body

        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        let fecha = date + ' ' + time;
        let seCreoRegistro = false;
        let viajeTour = '';
        let query = ``;

        //info tour para calcular fecha de regreso
        query = `SELECT * FROM tour WHERE id = ${tourId} `;
        let tour = await db.pool.query(query);
        tour = tour[0][0];
        let duracion = tour.duracion;
        let max_pasajeros = tour.max_pasajeros;
        //console.log(`Duracion: ${duracion}`);

        if (!viajeTourId) {

            try {
                let hora = horaCompleta.split(':');

                query = `SELECT 
                        * 
                        FROM viajeTour 
                        WHERE CAST(fecha_ida AS DATE) = '${fecha_ida}'
                        AND HOUR(CAST(fecha_ida AS TIME)) = '${hora[0]}'
                        AND tour_id = ${tourId};`;
                let disponibilidad = await db.pool.query(query);
                disponibilidad = disponibilidad[0];

                if (hora.length < 3) {
                    horaCompleta += ':00'
                }
                //formateo de fechaida
                fecha_ida += ' ' + horaCompleta;
                console.log(fecha_ida);

                //formateo de fecha regreso
                const newfecha = addHoursToDate(new Date(fecha_ida), parseInt(duracion));
                const fecha_regreso = newfecha.getFullYear() + "-" + ("0" + (newfecha.getMonth() + 1)).slice(-2) + "-" + ("0" + newfecha.getDate()).slice(-2) + " " + ("0" + (newfecha.getHours())).slice(-2) + ":" + ("0" + (newfecha.getMinutes())).slice(-2);
                console.log(fecha_regreso);

                if (disponibilidad.length == 0) {
                    query = `SELECT 
                        * 
                        FROM tour
                        WHERE id = ${tourId}`;
                    let result = await db.pool.query(query);

                    if (result[0].length == 0) {
                        return res.status(400).json({ msg: "Error en la busquda del tour por id", error: true, details: 'nungun registro encontrado' });
                    }

                    result = result[0][0];

                    let guia = result.guias;
                    guia = JSON.parse(guia);

                    query = `INSERT INTO viajeTour 
                        (fecha_ida, fecha_regreso, lugares_disp, created_at, updated_at, tour_id, guia_id, geo_llegada, geo_salida) 
                        VALUES 
                        ('${fecha_ida}', '${fecha_regreso}', '${max_pasajeros}', '${fecha}', '${fecha}', '${tourId}', '${guia[0].value}', '${null}', '${null}')`;

                    result = await db.pool.query(query);
                    result = result[0];

                    viajeTourId = result.insertId;
                    seCreoRegistro = true;

                } else {
                    viajeTour = disponibilidad[0];
                    viajeTourId = disponibilidad[0].id;
                }

            } catch (error) {
                console.log(error);
                return res.status(400).json({ msg: "Error en la creacion del registro viaje tour", error: true, details: error });
            }

        } else {
            query = `SELECT 
                        * 
                        FROM viajeTour
                        WHERE id = ${viajeTourId}`;
            let result = await db.pool.query(query);
            result = result[0];

            if (result.length == 0) {
                return res.status(400).json({ msg: "Error en la busquda del viaje tour por id", error: true, details: 'nungun registro encontrado' });
            }
            viajeTour = result[0];

        }

        let lugares_disp = 0;

        if (seCreoRegistro) {
            lugares_disp = max_pasajeros - no_boletos;
        } else {
            lugares_disp = viajeTour.lugares_disp - no_boletos;
        }
        if (lugares_disp < 0) {
            return res.status(400).json({ msg: "El numero de boletos excede los lugares disponibles", error: true, details: `Lugares disponibles: ${viajeTour.lugares_disp}` });
        }

        query = `INSERT INTO venta 
                        (id_reservacion, no_boletos, tipos_boletos, total, pagado, fecha_compra, comision, status_traspaso, created_at, updated_at, nombre_cliente, cliente_id, correo, viajeTour_id) 
                        VALUES 
                        ('V', '${no_boletos}', '${tipos_boletos}', '${total}', '${pagado}', '${fecha}', '0.0', '0', '${fecha}', '${fecha}', '${nombre_cliente}', '${cliente_id}', '${correo}', '${viajeTourId}')`;

        let result = await db.pool.query(query);
        result = result[0];

        query = `SELECT 
                        * 
                        FROM usuario
                        WHERE id = ${cliente_id}`;
        let client = await db.pool.query(query);

        client = client[0];

        if (client.length == 0) {
            return res.status(400).json({ msg: "Error en la busquda de los datos del cliente", error: true, details: 'nungun registro encontrado' });
        }
        client = client[0];

        let id_reservacion = result.insertId + 'V' + helperName(client.nombres.split(' ')) + helperName(client.apellidos.split(' '));

        //creamos el QR
        const qrCodeImg = await generateQRCode(id_reservacion);


        query = `UPDATE viajeTour SET
                    lugares_disp = '${lugares_disp}'
                    WHERE id     = ${viajeTourId}`;

        await db.pool.query(query);

        query = `UPDATE venta SET
                    id_reservacion = '${id_reservacion}'
                    WHERE id       = ${result.insertId}`;

        await db.pool.query(query);

        let html = `<div style="background-color: #eeeeee;padding: 20px; width: 400px;">
        <div align="center" style="padding-top:20px;padding-bottom:40px"><img src="https://museodesarrollo.info/assets/img/ELEMENTOS/logodos.png" style="height:100px"/></div>
        <p>Su compra ha sido exitosa.</p>

        <p style="display: inline-flex">Numero de boletos: ${no_boletos}</p>
        <br>
        <p style="display: inline-flex">Fecha: ${fecha_ida}</p>
        <br>
        <p style="display: inline-flex">Id de reservación: ${id_reservacion}</p>
        <br>
        <img src="${qrCodeImg}" alt="Código QR"/>
        
        <div style="padding-top:20px;padding-bottom:20px"><hr></div>
        <p style="font-size:10px">Recibiste éste correo porque las preferencias de correo electrónico se configuraron para recibir notificaciones del Museo Casa Kahlo.</p>
        <p style="font-size:10px">Te pedimos que no respondas a este correo electrónico. Si tienes alguna pregunta sobre tu cuenta, contáctanos a través de la aplicación.</p>
        
        <p style="font-size:10px;padding-top:20px">Copyright©2025 Museo Casa Kahlo.Todos los derechos reservados.</p></div>`;

        let message = {
            from: process.env.MAIL, // sender address
            to: process.env.MAIL, // list of receivers
            subject: "Compra exitosa", // Subject line
            text: "", // plain text body
            html: `${html}`, // html body
        }

        const info = await mailer.sendMail(message);
        console.log(info);

        message = {
            from: process.env.MAIL, // sender address
            to: correo, // list of receivers
            subject: "Compra exitosa", // Subject line
            text: "", // plain text body
            html: `${html}`, // html body
        }

        const info2 = await mailer.sendMail(message);
        console.log(info2);

        res.status(200).json({ msg: "Compra exitosa", id_reservacion: id_reservacion, viajeTourId: viajeTourId, error: false });

    } catch (error) {
        console.log(error);
        res.status(400).json({ error: true, details: error })
    }
})

app.post('/stripe/create-checkout-session', async (req, res) => {
  try {
    const { lineItems, customerEmail, successUrl, cancelUrl, metadata } = req.body;

    //payment_method_type overrides lo que seleccione en el dashboard de stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata: metadata,
      billing_address_collection: 'auto',
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  console.log('🔄 Webhook recibido!');
  console.log('Headers:', req.headers);
  console.log('Body length:', req.body ? req.body.length : 'No body');
  
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log('Signature:', sig ? 'Presente' : 'Ausente');
  console.log('Endpoint Secret:', endpointSecret ? 'Configurado' : 'No configurado');

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Webhook verificado exitosamente');
    console.log('Tipo de evento:', event.type);
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('💰 Payment succeeded:', session.id);
      
      // Ejecutar la misma lógica que el endpoint /crear
      if (session.metadata) {
        try {
          const { no_boletos, tipos_boletos, nombre_cliente, cliente_id, correo, tourId, fecha_ida, horaCompleta, total } = session.metadata;
          
          let today = new Date();
          let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
          let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
          let fecha = date + ' ' + time;
          let seCreoRegistro = false;
          let viajeTour = '';
          let query = ``;
          let viajeTourId = null;

          //info tour para calcular fecha de regreso
          query = `SELECT * FROM tour WHERE id = ${tourId} `;
          let tour = await db.pool.query(query);
          tour = tour[0][0];
          let duracion = tour.duracion;
          let max_pasajeros = tour.max_pasajeros;

          try {
            let hora = horaCompleta.split(':');

            query = `SELECT 
                    * 
                    FROM viajeTour 
                    WHERE CAST(fecha_ida AS DATE) = '${fecha_ida}'
                    AND HOUR(CAST(fecha_ida AS TIME)) = '${hora[0]}'
                    AND tour_id = ${tourId};`;
            let disponibilidad = await db.pool.query(query);
            disponibilidad = disponibilidad[0];

            if (hora.length < 3) {
                horaCompleta += ':00'
            }
            //formateo de fechaida
            fecha_ida += ' ' + horaCompleta;

            //formateo de fecha regreso
            const newfecha = addHoursToDate(new Date(fecha_ida), parseInt(duracion));
            const fecha_regreso = newfecha.getFullYear() + "-" + ("0" + (newfecha.getMonth() + 1)).slice(-2) + "-" + ("0" + newfecha.getDate()).slice(-2) + " " + ("0" + (newfecha.getHours())).slice(-2) + ":" + ("0" + (newfecha.getMinutes())).slice(-2);

            if (disponibilidad.length == 0) {
                query = `SELECT 
                    * 
                    FROM tour
                    WHERE id = ${tourId}`;
                let result = await db.pool.query(query);

                if (result[0].length == 0) {
                    console.error("Error en la busqueda del tour por id");
                    return;
                }

                result = result[0][0];

                let guia = result.guias;
                guia = JSON.parse(guia);

                query = `INSERT INTO viajeTour 
                    (fecha_ida, fecha_regreso, lugares_disp, created_at, updated_at, tour_id, guia_id, geo_llegada, geo_salida) 
                    VALUES 
                    ('${fecha_ida}', '${fecha_regreso}', '${max_pasajeros}', '${fecha}', '${fecha}', '${tourId}', '${guia[0].value}', '${null}', '${null}')`;

                result = await db.pool.query(query);
                result = result[0];

                viajeTourId = result.insertId;
                seCreoRegistro = true;

            } else {
                viajeTour = disponibilidad[0];
                viajeTourId = disponibilidad[0].id;
            }

          } catch (error) {
              console.log('Error en creacion viajeTour:', error);
              return;
          }

          let lugares_disp = 0;

          if (seCreoRegistro) {
              lugares_disp = max_pasajeros - parseInt(no_boletos);
          } else {
              lugares_disp = viajeTour.lugares_disp - parseInt(no_boletos);
          }
          /*
          if (lugares_disp < 0) {
              console.error("El numero de boletos excede los lugares disponibles");
              return;
          }
          */

          query = `INSERT INTO venta 
                          (id_reservacion, no_boletos, tipos_boletos, total, pagado, fecha_compra, comision, status_traspaso, created_at, updated_at, nombre_cliente, cliente_id, correo, viajeTour_id) 
                          VALUES 
                          ('V', '${no_boletos}', '${tipos_boletos}', '${total}', '1', '${fecha}', '0.0', '0', '${fecha}', '${fecha}', '${nombre_cliente}', '${cliente_id}', '${correo}', '${viajeTourId}')`;

          let result = await db.pool.query(query);
          result = result[0];

          query = `SELECT 
                          * 
                          FROM usuario
                          WHERE id = ${cliente_id}`;
          let client = await db.pool.query(query);

          client = client[0];

          if (client.length == 0) {
              console.error("Error en la busqueda de los datos del cliente");
              return;
          }
          client = client[0];

          let id_reservacion = result.insertId + 'V' + helperName(client.nombres.split(' ')) + helperName(client.apellidos.split(' '));

          //creamos el QR
          const qrCodeImg = await generateQRCode(id_reservacion);

          query = `UPDATE viajeTour SET
                      lugares_disp = '${lugares_disp}'
                      WHERE id     = ${viajeTourId}`;

          await db.pool.query(query);

          query = `UPDATE venta SET
                      id_reservacion = '${id_reservacion}'
                      WHERE id       = ${result.insertId}`;

          await db.pool.query(query);

          let html = `<div style="background-color: #eeeeee;padding: 20px; width: 400px;">
          <div align="center" style="padding-top:20px;padding-bottom:40px"><img src="https://museodesarrollo.info/assets/img/ELEMENTOS/logodos.png" style="height:100px"/></div>
          <p>Su compra ha sido exitosa.</p>

          <p style="display: inline-flex">Numero de boletos: ${no_boletos}</p>
          <br>
          <p style="display: inline-flex">Fecha: ${fecha_ida}</p>
          <br>
          <p style="display: inline-flex">Id de reservación: ${id_reservacion}</p>
          <br>
          <img src="${qrCodeImg}" alt="Código QR"/>
          
          <div style="padding-top:20px;padding-bottom:20px"><hr></div>
          <p style="font-size:10px">Recibiste éste correo porque las preferencias de correo electrónico se configuraron para recibir notificaciones del Museo Casa Kahlo.</p>
          <p style="font-size:10px">Te pedimos que no respondas a este correo electrónico. Si tienes alguna pregunta sobre tu cuenta, contáctanos a través de la aplicación.</p>
          
          <p style="font-size:10px;padding-top:20px">Copyright©2025 Museo Casa Kahlo.Todos los derechos reservados.</p></div>`;

          let message = {
              from: process.env.MAIL,
              to: process.env.MAIL,
              subject: "Compra exitosa",
              text: "",
              html: `${html}`,
          }

          const info = await mailer.sendMail(message);
          console.log('Email enviado al admin:', info);

          message = {
              from: process.env.MAIL,
              to: correo,
              subject: "Compra exitosa",
              text: "",
              html: `${html}`,
          }

          const info2 = await mailer.sendMail(message);
          console.log('Email enviado al cliente:', info2);

          console.log(`✅ Venta creada exitosamente: ${id_reservacion}, viajeTourId: ${viajeTourId}`);
          
        } catch (error) {
          console.error('Error procesando pago en webhook:', error);
        }
      }
      break;
    
    case 'payment_intent.payment_failed':
      const paymentIntent = event.data.object;
      console.log('❌ Payment failed:', paymentIntent.id);
      break;
    
    default:
      console.log(`🤷‍♀️ Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({received: true});
});

//la feha esta definida por AAAA-MM-DD y la hora desde 00 hasta 23
app.get('/reservacion/:id', async (req, res) => {
    try {
        let reservacion = req.params.id;

        let query = `SELECT 
                        * 
                        FROM venta
                        WHERE id_reservacion = '${reservacion}';`;

        let reserva = await db.pool.query(query);

        res.status(200).json(reserva[0]);

    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})

app.get('/landingInfo/:id', async (req, res) => {
    try {
        let reservacion = req.params.id;

        let query = `SELECT 
                        venta.id_reservacion, venta.viajeTour_id, viajeTour.id, viajeTour.tour_id, viajeTour.fecha_ida, viajeTour.fecha_regreso, viajeTour.status_viaje, tour.id, tour.nombre 
                        FROM venta
                        INNER JOIN viajeTour ON venta.viajeTour_id = viajeTour.id
                        INNER JOIN tour on viajeTour.tour_id = tour.id
                        WHERE venta.id_reservacion = '${reservacion}';`;

        let reserva = await db.pool.query(query);

        res.status(200).json(reserva[0]);

    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})

app.put('/set', async (req, res) => {
    try {
        const { id, no_boletos, pagado, comision, status_traspaso, cliente_id, viajeTourId } = req.body

        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        let fecha = date + ' ' + time;

        let query = `UPDATE venta SET
                        no_boletos      = '${no_boletos}',
                        pagado          = '${pagado}', 
                        comision        = '${comision}', 
                        status_traspaso = '${status_traspaso}', 
                        updated_at      = '${fecha}', 
                        cliente_id      = '${cliente_id}', 
                        viajeTour_id   = '${viajeTourId}'
                        WHERE id        = ${id}`;

        let result = await db.pool.query(query);
        result = result[0];

        const payload = {
            venta: {
                id: result.insertId,
            }
        }

        res.status(200).json({ error: false, msg: "Registro actualizado con exito" })

    } catch (error) {
        res.status(400).json({ error: true, details: error })
    }
})

app.put('/setFecha', async (req, res) => {
    try {
        let { id, oldViajeTourId, newViajeTourId, fecha_ida, horaCompleta, tourId, max_pasajeros } = req.body

        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        let fecha = date + ' ' + time;
        let newViajeTour = "";
        let oldViajeTour = "";
        let venta = "";
        let lugares_disp = 0;
        let seCreoRegistro = false;

        if (!newViajeTourId) {

            try {
                let hora = horaCompleta.split(':');

                query = `SELECT 
                        * 
                        FROM viajeTour 
                        WHERE CAST(fecha_ida AS DATE) = '${fecha_ida}'
                        AND HOUR(CAST(fecha_ida AS TIME)) = '${hora[0]}'
                        AND tour_id = ${tourId};`;
                let disponibilidad = await db.pool.query(query);
                disponibilidad = disponibilidad[0];

                if (disponibilidad.length == 0) {

                    if (hora.length > 3) {
                        horaCompleta += ':00'
                    }
                    fecha_ida += ' ' + horaCompleta;

                    query = `SELECT 
                        * 
                        FROM tour
                        WHERE id = ${tourId}`;
                    let result = await db.pool.query(query);
                    result = result[0][0];

                    let guia = result.guias;
                    guia = JSON.parse(guia);

                    query = `INSERT INTO viajeTour 
                        (fecha_ida, fecha_regreso, lugares_disp, created_at, updated_at, tour_id, guia_id, geo_llegada, geo_salida) 
                        VALUES 
                        ('${fecha_ida}', '${fecha_ida}', '${max_pasajeros}', '${fecha}', '${fecha}', '${tourId}', '${guia[0].value}', '${null}', '${null}')`;

                    result = await db.pool.query(query);
                    result = result[0];

                    newViajeTourId = result.insertId;
                    seCreoRegistro = true;

                } else {
                    newViajeTour = disponibilidad[0];
                    newViajeTourId = disponibilidad[0].id;
                }

            } catch (error) {
                console.log(error);
                return res.status(400).json({ msg: "Error en la creacion del registro viaje tour", error: true, details: error });
            }

        } else {
            query = `SELECT 
                        * 
                        FROM viajeTour
                        WHERE id = ${newViajeTourId}`;
            let result = await db.pool.query(query);
            result = result[0];

            if (result.length == 0) {
                return res.status(400).json({ msg: "Error en la busquda del viaje tour por id", error: true, details: 'nungun registro encontrado' });
            }
            newViajeTour = result[0];

        }

        query = `SELECT 
                        * 
                        FROM viajeTour
                        WHERE id = ${oldViajeTourId}`;
        let result = await db.pool.query(query);
        result = result[0];

        if (result.length == 0) {
            return res.status(400).json({ msg: "Error en la busquda del viejo viaje tour por id", error: true, details: 'nungun registro encontrado' });
        }
        oldViajeTour = result[0];

        query = `SELECT 
                        * 
                        FROM venta
                        WHERE id = ${id}`;
        result = await db.pool.query(query);
        result = result[0];

        if (result.length == 0) {
            return res.status(400).json({ msg: "Error en la busquda de la venta por id", error: true, details: 'nungun registro encontrado' });
        }
        venta = result[0];

        query = `SELECT 
                        * 
                        FROM usuario
                        WHERE id = ${venta.cliente_id}`;
        let client = await db.pool.query(query);

        client = client[0];

        if (client.length == 0) {
            return res.status(400).json({ msg: "Error en la busquda de los datos del cliente", error: true, details: 'nungun registro encontrado' });
        }
        client = client[0];

        //Lugares disponibles
        if (seCreoRegistro) {
            lugares_disp = max_pasajeros - venta.no_boletos;
        } else {
            lugares_disp = newViajeTour.lugares_disp - venta.no_boletos;
        }
        if (lugares_disp < 0) {
            return res.status(400).json({ msg: "El numero de boletos excede los lugares disponibles", error: true, details: `Lugares disponibles: ${viajeTour.lugares_disp}` });
        }

        oldViajeTour.lugares_disp += venta.no_boletos;

        query = `UPDATE viajeTour SET
                    lugares_disp = '${lugares_disp}',
                    updated_at = '${fecha}' 
                    WHERE id     = ${newViajeTourId}`;

        await db.pool.query(query);

        query = `UPDATE viajeTour SET
                    lugares_disp = '${oldViajeTour.lugares_disp}',
                    updated_at = '${fecha}'
                    WHERE id     = ${oldViajeTourId}`;

        await db.pool.query(query);

        query = `UPDATE venta SET
                    viajeTour_id = '${newViajeTourId}',
                    updated_at = '${fecha}' 
                    WHERE id       = ${id}`;

        await db.pool.query(query);


        let html = venta.no_boletos + newViajeTour.fecha_ida + venta.id_reservacion;

        let message = {
            from: process.env.MAIL, // sender address
            to: 'ferdanymr@gmail.com', // list of receivers
            subject: "Cambio de fecha exitoso", // Subject line
            text: "", // plain text body
            html: `${html}`, // html body
        }

        const info = await mailer.sendMail(message);
        console.log(info);

        message = {
            from: process.env.MAIL, // sender address
            to: client.correo, // list of receivers
            subject: "Cambio de fecha exitoso", // Subject line
            text: "", // plain text body
            html: `${html}`, // html body
        }

        //const info2 = await mailer.sendMail(message);
        //console.log(info2);


        res.status(200).json({ error: false, msg: "Registros actualizados con exito" })

    } catch (error) {
        console.log(error);
        res.status(400).json({ error: true, details: error })
    }
})

app.put('/checkin', async (req, res) => {
    try {
        const { idReservacion, viajeTour_id } = req.body

        //revisamos si existe el numero de reservacion
        let query = `SELECT * FROM venta WHERE id_reservacion = '${idReservacion}'`;
        let existReservacion = await db.pool.query(query);
        if (existReservacion[0].length < 1) {
            return res.status(200).json({ error: true, msg: "El id de reservacion no existe" });
        }


        //revisamos si corresponde el id de reservacion con el id viaje tour
        query = `SELECT * FROM venta WHERE id_reservacion = '${idReservacion}' AND viajeTour_id = ${viajeTour_id}`;
        let correspondeIdVT = await db.pool.query(query);
        if (correspondeIdVT[0].length < 1) {
            return res.status(200).json({ error: true, msg: "La reservación no corresponde al tour seleccionado" });
        }


        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        let fecha = date + ' ' + time;

        query = `UPDATE venta SET
                        checkin = 1,    
                        updated_at      = '${fecha}' 
                        WHERE id_reservacion = '${idReservacion}'`;

        let result = await db.pool.query(query);
        result = result[0];

        res.status(200).json({ error: false, msg: "Checkin realizado con éxito" })

    } catch (error) {
        res.status(400).json({ error: true, details: error })
    }
})

app.put('/delete', async (req, res) => {
    try {
        let ventaId = req.body.id;

        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        let fecha = date + ' ' + time;

        let query = `UPDATE venta SET
                        status     = 0,
                        updated_at = '${fecha}' 
                        WHERE id   = ${ventaId}`;

        let result = await db.pool.query(query);
        result = result[0];

        const payload = {
            venta: {
                id: result.insertId,
            }
        }

        res.status(200).json({ error: false, msg: "Se ha dado de baja la venta con exito" })

    } catch (error) {
        res.status(400).json({ error: true, details: error })
    }
})

app.put('/active', async (req, res) => {
    try {
        let ventaId = req.body.id;

        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        let fecha = date + ' ' + time;

        let query = `UPDATE venta SET
                        status     = 1,
                        updated_at = '${fecha}' 
                        WHERE id   = ${ventaId}`;

        let result = await db.pool.query(query);
        result = result[0];

        const payload = {
            tour: {
                id: result.insertId,
            }
        }

        res.status(200).json({ error: false, msg: "Se ha reactivado la venta con exito" })

    } catch (error) {
        res.status(400).json({ error: true, details: error })
    }
})

module.exports = app