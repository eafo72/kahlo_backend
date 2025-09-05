/* Importing the express module and creating an instance of it. */
const express = require('express')
const app = express.Router()
const auth = require('../middlewares/authorization')
const db = require('../config/db')




// CREAR UN USUARIO JWT
app.post('/start', async (req, res) => {
	try {
		let { id_usuario, nombre, correo, telefono } = req.body 

		let errors = Array();

		if (!id_usuario) {
			errors.push({ msg: "El campo id_usuario debe de contener un valor" });
		}
		if (!nombre) {
			errors.push({ msg: "El campo nombre debe de contener un valor" });
		}
		if (!correo) {
			errors.push({ msg: "El campo correo debe de contener un valor" });
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


		query = `INSERT INTO fotografias
					(id_usuario, nombre, correo, telefono, created_at, updated_at) 
					VALUES 
					('${id_usuario}', '${nombre}', '${correo}', '${telefono}', '${fecha}', '${fecha}')`;


		let result = await db.pool.query(query);
		result = result[0];
		
		res.status(200).json({ error: false, id: result.insertId })


	} catch (error) {
		console.log(error);
		return res.status(400).json({
			msg: error,
		})
	}
})











module.exports = app



