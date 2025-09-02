/* Importing the express module and creating an instance of it. */
const express = require('express')
const app = express.Router()
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const auth = require('../middlewares/authorization')
const db = require('../config/db')


//////////////////////////////////////////
//                fecha                 //
//////////////////////////////////////////

app.get('/obtener/:id', async (req, res) => {
    try {
        let fechaId = req.params.id;
        let query = `SELECT * FROM fecha WHERE id=${fechaId}`;
        let venta = await db.pool.query(query);

        res.status(200).json(venta[0]);

    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})

app.get('/obtenerbytour/:id', async (req, res) => {
    try {
        let tourId = req.params.id;
        let query = `SELECT * FROM fecha WHERE tour_id=${tourId}`;
        let venta = await db.pool.query(query);

        res.status(200).json(venta[0]);

    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})


app.post('/crear', async (req, res) => {
    try {
        const { dia, hora_salida, hora_regreso, tour_id } = req.body

        let errors = Array();

        if (!dia) {
            errors.push({ msg: "El campo dia debe de contener un valor" });
        }
        if (!hora_salida) {
            errors.push({ msg: "El campo hora_salida debe de contener un valor" });
        }
        if (!hora_regreso) {
            errors.push({ msg: "El campo hora_regreso debe de contener un valor" });
        }
        if (!tour_id) {
            errors.push({ msg: "El campo tour_id debe de contener un valor" });
        }

        if (errors.length >= 1) {

            return res.status(400)
                .json({
                    msg: 'Errores en los parametros',
                    error: true,
                    details: errors
                });

        }

        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        let fecha = date + ' ' + time;

        let query = `INSERT INTO fecha 
                        (dia, hora_salida, hora_regreso, created_at, updated_at, tour_id) 
                        VALUES 
                        ('${dia}', '${hora_salida}', '${hora_regreso}', '${fecha}', '${fecha}', '${tour_id}')`;

        let result = await db.pool.query(query);
        result = result[0];

        const payload = {
            venta: {
                id: result.insertId,
            }
        }

        jwt.sign(payload, process.env.SECRET, { expiresIn: 36000 }, (error, token) => {
            if (error) throw error
            res.status(200).json({error:false, token:token})
            //res.json(respuestaDB)
        })

    } catch (error) {
        res.status(400).json({ error: true, details: error })
    }
})

app.put('/set', async (req, res) => {
    try {
        const { id, dia, hora_salida, hora_regreso } = req.body

        let errors = Array();

        if (!dia) {
            errors.push({ msg: "El campo dia debe de contener un valor" });
        }
        if (!hora_salida) {
            errors.push({ msg: "El campo hora_salida debe de contener un valor" });
        }
        if (!hora_regreso) {
            errors.push({ msg: "El campo hora_regreso debe de contener un valor" });
        }
        
        if (errors.length >= 1) {

            return res.status(400)
                .json({
                    msg: 'Errores en los parametros',
                    error: true,
                    details: errors
                });

        }

        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        let fecha = date + ' ' + time;

        let query = `UPDATE fecha SET
                        dia          = '${dia}',
                        hora_salida  = '${hora_salida}',
                        hora_regreso = '${hora_regreso}', 
                        updated_at   = '${fecha}' 
                        WHERE id     = ${id}`;

        let result = await db.pool.query(query);
        result = result[0];

        const payload = {
            venta: {
                id: result.insertId,
            }
        }

        res.status(200).json({ error:false, msg: "Registro actualizado con exito" })

    } catch (error) {
        res.status(400).json({ error: true, details: error })
    }
})

app.put('/delete/:id', async (req, res) => {
    try {
        let salidaId = req.params.id;

        let query = `DELETE FROM fecha WHERE id = ${salidaId}`;

        let result = await db.pool.query(query);
        result = result[0];

        res.status(200).json({ error:false, msg: "Se ha borrado la fecha de salida con exito" })

    } catch (error) {
        res.status(400).json({ error: true, details: error })
    }
})

app.put('/active', async (req, res) => {
    try {
        let fechaId = req.body.id;

        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        let fecha = date + ' ' + time;

        let query = `UPDATE fecha SET
                        status     = 1,
                        updated_at = '${fecha}' 
                        WHERE id   = ${fechaId}`;

        let result = await db.pool.query(query);
        result = result[0];

        res.status(200).json({ error:false, msg: "Se ha reactivado la venta con exito" })

    } catch (error) {
        res.status(400).json({ error: true, details: error })
    }
})

module.exports = app
