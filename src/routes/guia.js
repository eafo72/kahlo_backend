/* Importing the express module and creating an instance of it. */
const express = require('express')
const app = express.Router()
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const auth = require('../middlewares/authorization')
const db = require('../config/db')
const imageController = require('../controller/imageGuiaController')
const fs = require('fs');
let FormData = require('form-data');
const fetch = require("node-fetch");


//////////////////////////////////////////
//                 Guia                 //
//////////////////////////////////////////

//Trae todos los guias de la DB
app.get('/guias', async (req, res) => {
    try {
        let query = `SELECT u.id, nombres, apellidos, u.telefono, u.correo, isGuia, foto, identificacion, u.status, u.updated_at, empresa_id, e.nombre AS empresa
                        FROM usuario 
                        AS u
                        INNER JOIN  empresa 
                        AS e
                        ON e.id = u.empresa_id
                        WHERE isGuia=1`;
        let guias = await db.pool.query(query);

        res.status(200).json(guias[0]);

    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})

app.get('/obtenerByEmpresa/:id', async (req, res) => {
    try {
        let empresaId = req.params.id;

        let query = `SELECT u.id, nombres, apellidos, u.telefono, u.correo, isGuia, foto, identificacion, u.status, u.updated_at, empresa_id, e.nombre AS empresa
                        FROM usuario 
                        AS u
                        INNER JOIN  empresa 
                        AS e
                        ON e.id = u.empresa_id
                        WHERE isGuia=1
                        AND u.empresa_id=${empresaId}`;
        let guias = await db.pool.query(query);

        res.status(200).json(guias[0]);

    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})


app.get('/obtener/:id', async (req, res) => {
    try {
        let guiaId = req.params.id;

        let query = `SELECT u.id, nombres, apellidos, u.telefono, u.correo, isGuia, foto, identificacion, u.status, u.updated_at, empresa_id, e.nombre AS empresa
                        FROM usuario 
                        AS u
                        INNER JOIN  empresa 
                        AS e
                        ON e.id = u.empresa_id
                        WHERE isGuia=1 
                        AND u.id=${guiaId}`;
        let guia = await db.pool.query(query);

        res.status(200).json(guia[0]);

    } catch (error) {
        res.status(500).json({ msg: 'Hubo un error obteniendo los datos', error: true, details: error })
    }
})


app.post('/crear', imageController.upload, async (req, res) => {
    try {
        let { nombres, apellidos, telefono, correo, empresa_id } = req.body

        let errors = Array();

        if (!nombres) {
            errors.push({ msg: "El campo nombres debe de contener un valor" });
        }
        if (!apellidos) {
            errors.push({ msg: "El campo apellidos debe de contener un valor" });
        }
        if (!correo) {
            errors.push({ msg: "El campo correo debe de contener un valor" });
        }
        if (!empresa_id) {
            errors.push({ msg: "El campo empresa_id debe de contener un valor" });
        }
        if (!telefono) {
            telefono = null;
        }

        if (errors.length >= 1) {

            return res.status(400)
                .json({
                    msg: 'Errores en los parametros',
                    error: true,
                    details: errors
                });

        }

        //Verificamos no exista el correo en la DB
        let query = `SELECT *
                        FROM usuario 
                        WHERE correo='${correo}'`;

        let existCorreo = await db.pool.query(query);

        if (existCorreo[0].length >= 1) {
            return res.status(400)
                .json({
                    msg: 'El correo ya esta registrado',
                    error: true,
                });
        }

        //se implementara cuando haya validadores
        //const salt = await bcryptjs.genSalt(10);
        //const hashedPassword = await bcryptjs.hash(password, salt);

        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        let fecha = date + ' ' + time;

        let tituloFoto = `${date}-${req.files['foto'][0].originalname}`;
        let foto1 = `${process.env.URLFRONT}/images/guias/${tituloFoto}`;

        let tituloIdentificacion = `${date}-${req.files['identificacion'][0].originalname}`;
        let identificacion1 = `${process.env.URLFRONT}/images/guias/${tituloIdentificacion}`;

        let file = fs.readFileSync(req.files['foto'][0].path, { encoding: "base64" });
        let file2 = fs.readFileSync(req.files['identificacion'][0].path, { encoding: "base64" });

        let formdata = new FormData();
        formdata.append('foto', file);
        formdata.append('nombre_foto', tituloFoto);
        formdata.append('identificacion', file2);
        formdata.append('nombre_identificacion', tituloIdentificacion);

        let response = await fetch(`${process.env.URLFRONT}/images/guias/api_guias_base64.php`, {
            method: 'POST',
            body: formdata
        });

        let result = await response.json();
        
        result.forEach(element => {
            if (element.error) {
                return res.status(400).json({ error: true, msg: "No se agregaron las fotos, intenterlo nuevamente", details: element.msg })
            }
        });

        query = `INSERT INTO usuario 
                        (nombres, apellidos, 
                        telefono, correo, 
                        isGuia, foto, 
                        identificacion, empresa_id,
                        created_at, updated_at) 
                        VALUES 
                        ('${nombres}', '${apellidos}', 
                        '${telefono}','${correo}', 
                        1, '${foto1}', 
                        '${identificacion1}', '${empresa_id}',
                        '${fecha}', '${fecha}')`;

        result = await db.pool.query(query);
        result = result[0];

        const payload = {
            guia: {
                id: result.insertId,
            }
        }

        jwt.sign(payload, process.env.SECRET, { expiresIn: 36000 }, (error, token) => {
            if (error) throw error
            res.status(200).json({ error: false, token: token })
            //res.json(respuestaDB)
        })

    } catch (error) {
        res.status(400).json({ error: true, details: error })
    }
})

app.put('/set', imageController.upload, async (req, res) => {
    try {
        let { id, nombres, apellidos, telefono, empresa_id } = req.body

        let errors = Array();

        if (!id) {
            errors.push({ msg: "El campo id debe de contener un valor valido" });
        }
        if (!nombres) {
            errors.push({ msg: "El campo nombres debe de contener un valor" });
        }
        if (!apellidos) {
            errors.push({ msg: "El campo apellidos debe de contener un valor" });
        }
        if (!empresa_id) {
            errors.push({ msg: "El campo empresa_id debe de contener un valor" });
        }
        if (!telefono) {
            telefono = null;
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

        let query = `UPDATE usuario SET
                        nombres          = '${nombres}', 
                        apellidos        = '${apellidos}',
                        telefono         = '${telefono}',`;

        let formdata = new FormData();
        let noFotos = 0;

        if (req.files['foto']) {
            noFotos++;

            let tituloFoto = `${date}-${req.files['foto'][0].originalname}`;
            let foto1 = `${process.env.URLFRONT}/images/guias/${tituloFoto}`;

            let file = fs.readFileSync(req.files['foto'][0].path, { encoding: "base64" });

            formdata.append('foto', file);
            formdata.append('nombre_foto', tituloFoto);

            query =  query + `foto = '${foto1}',`;

        } 

        if(req.files['identificacion']){
            
            noFotos++;
            let tituloIdentificacion = `${date}-${req.files['identificacion'][0].originalname}`;
            let identificacion1 = `${process.env.URLFRONT}/images/guias/${tituloIdentificacion}`;

            let file2 = fs.readFileSync(req.files['identificacion'][0].path, { encoding: "base64" });

            formdata.append('identificacion', file2);
            formdata.append('nombre_identificacion', tituloIdentificacion);

            query =  query + `identificacion  = '${identificacion1}',`;
        
        }
        
        if(req.files['foto'] || req.files['identificacion']) {

            let response = await fetch(`${process.env.URLFRONT}/images/guias/api_guias_base64.php`, {
                method: 'POST',
                body: formdata
            });

            let result = await response.json();
            
            let noErrors = 0;

            result.forEach(element => {
                if (element.error) {
                    noErrors++;
                    //return res.status(400).json({ error: true, msg: "No se agregaron las fotos, intenterlo nuevamente", details: element.msg })
                }
            });

            if(noErrors >= 4 || (noFotos >= 2 && noErrors >= 2) || noErrors == 1){
                return res.status(400).json({ error: true, msg: "No se agregaron las fotos, intenterlo nuevamente"})
            }
            query =  query + 
                        `empresa_id      = '${empresa_id}', 
                        updated_at       = '${fecha}'
                        WHERE id         = ${id}`;

        }
        else {

            query = query + 
                        `empresa_id      = '${empresa_id}', 
                        updated_at       = '${fecha}'
                        WHERE id         = ${id}`;

        }

        let result = await db.pool.query(query);
        result = result[0];

        res.status(200).json({ error: false, msg: `Registro actualizado con exito, fotos actualizadas: ${noFotos}` })

    } catch (error) {
        res.status(400).json({ error: true, details: error })
    }
})

app.put('/setBasicData', async (req, res) => {
	try {
		let { id, nombres, apellidos, password, telefono } = req.body

		let errors = Array();

		if (!id) {
			errors.push({ msg: "El campo id debe de contener un valor valido" });
		}
		if (!nombres) {
			errors.push({ msg: "El campo nombres debe de contener un valor" });
		}
		if (!apellidos) {
			errors.push({ msg: "El campo apellidos debe de contener un valor" });
		}
		if (!telefono) {
			telefono = null;
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
		let query = ``;

		if (password) {
			const salt = await bcryptjs.genSalt(10);
			const hashedPassword = await bcryptjs.hash(password, salt);

			query = `UPDATE usuario  SET
                        nombres              = '${nombres}', 
                        apellidos            = '${apellidos}',
                        telefono             = '${telefono}', 
						password             = '${hashedPassword}',
                        updated_at           = '${fecha}'
                        WHERE id             = ${id}`;
		} else {
			query = `UPDATE usuario  SET
                        nombres              = '${nombres}', 
                        apellidos            = '${apellidos}',
                        telefono             = '${telefono}', 
                        updated_at           = '${fecha}'
                        WHERE id             = ${id}`;
		}

		let result = await db.pool.query(query);
		result = result[0];


		res.status(200).json({ error: false, msg: "Registro actualizado con exito" })

	} catch (error) {
		res.status(400).json({ error: true, details: error })
	}
})


app.put('/delete', async (req, res) => {
    try {
        let guiaId = req.body.id;

        if (!guiaId) {
            return res.status(400)
                .json({
                    msg: 'El id debe ser un numero entero',
                    error: true
                });
        }

        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        let fecha = date + ' ' + time;

        let query = `UPDATE usuario SET
                        status      = 0,
                        updated_at  = '${fecha}'
                        WHERE id    = ${guiaId}`;

        let result = await db.pool.query(query);
        result = result[0];

        res.status(200).json({ error: false, msg: "Se ha dado de baja al guia con exito" })

    } catch (error) {
        res.status(400).json({ error: true, details: error })
    }
})

app.put('/active', async (req, res) => {
    try {
        let guiaId = req.body.id;

        if (!guiaId) {
            return res.status(400)
                .json({
                    msg: 'El id debe ser un numero entero',
                    error: true
                });
        }

        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
        let fecha = date + ' ' + time;

        let query = `UPDATE usuario SET
                        status      = 1,
                        updated_at  = '${fecha}'
                        WHERE id    = ${guiaId}`;

        let result = await db.pool.query(query);
        result = result[0];

        res.status(200).json({ error: false, msg: "Se ha reactivado al guia con exito" })

    } catch (error) {
        res.status(400).json({ error: true, details: error })
    }
})

module.exports = app