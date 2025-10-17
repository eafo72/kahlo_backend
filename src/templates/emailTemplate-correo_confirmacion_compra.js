// generarEmail.js (Versión FINAL con Fecha/Hora agrupada y ID de Reservación)

module.exports = function generarEmail(data) {
  // Datos de marca
  const COLOR_ROJO = '#a01e24';   // Museo Red oficial
  const COLOR_NEUTRO = '#1D1A14'; // Museo Neutral (Texto) oficial
  const COLOR_FONDO = '#FFFFFF';  // Fondo blanco
  const URL_RESERVACIONES = 'https://boleto.museocasakahlo.org/'; // URL para ver reservaciones

  /*
  <p style="margin: 5px 0 0 23px; font-size: 14px;">
    <a href="#" style="color: #1976d2; text-decoration: underline;">Agregar al Calendario de Google</a>
  </p>
  */

  // Función de utilidad para aplicar estilo de texto
  const styleText = (color = COLOR_NEUTRO, weight = 'normal', size = '16px') =>
    `font-family: Arial, sans-serif; color: ${color}; font-weight: ${weight}; font-size: ${size}; line-height: 1.5;`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Confirmación de compra - Museo Casa Kahlo</title>
      </head>
      <body style="margin:0; padding:0; background-color:${COLOR_FONDO};">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin:auto; background-color: ${COLOR_FONDO};">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLOR_FONDO}; border-collapse: collapse;">
                
                <tr>
                  <td align="center" style="padding: 20px 40px 0 40px;">
                    <h1 style="${styleText(COLOR_ROJO, 'bolder', '40px')} text-transform: uppercase; margin: 0 0 5px 0; letter-spacing: 2px;">
                      MUSEO CASA KAHLO
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 5px 40px 20px 40px;">
                    <h2 style="${styleText(COLOR_ROJO, 'bold', '24px')} text-transform: uppercase; margin: 0;">¡YA TIENES TUS BOLETOS PARA</h2>
                    <h2 style="${styleText(COLOR_ROJO, 'bold', '24px')} text-transform: uppercase; margin: 0;">MUSEO CASA KAHLO!</h2>
                  </td>
                </tr>
                
                <tr>
                  <td align="center" style="padding:0 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: ${COLOR_ROJO}; color: ${COLOR_FONDO}; font-weight: bold; font-size: 18px; padding: 10px; text-align: center; font-family: Arial, sans-serif;">
                          Resumen de tu compra
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 20px 40px 10px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="${styleText()}">
                      <tr>
                        <td width="50%" style="padding-bottom: 5px;">
                          Adquiriste <b style="color:${COLOR_ROJO};">${data.boletos}</b> boletos para:
                        </td>
                        <td width="50%" style="padding-bottom: 5px; text-align: right; font-weight: bold; line-height: 1.3;">
                          ${data.fecha}
                          <br>${data.horario} (Recorrido guiado)
                        </td>
                      </tr>
                    </table>
                    
                    <div style="margin:10px 0;">
                      ${data.tablaBoletos}
                    </div>

                    <p style="${styleText()} font-size: 14px; text-align: right; margin-top: 10px; margin-bottom: 0;">
                        <span style="font-weight: bold; color: ${COLOR_NEUTRO};">ID de Reservación:</span> ${data.idReservacion || 'N/A'}
                    </p>

                    ${data.password
                    ? `<p style="${styleText()} font-size: 14px; text-align: right; margin-top: 10px; margin-bottom: 0;">
                              <span style="font-weight: bold; color: ${COLOR_NEUTRO};">Tu contraseña provisional:</span> ${data.password}
                      </p>`
                    : ''
                    }


                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:10px 40px 0 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: ${COLOR_ROJO}; color: ${COLOR_FONDO}; font-weight: bold; font-size: 18px; padding: 10px; text-align: center; font-family: Arial, sans-serif;">
                          Tus entradas
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 20px 40px 10px 40px; text-align: center;">
                    <p style="${styleText(COLOR_NEUTRO, 'normal', '15px')} margin-bottom: 15px;">
                      Para acceder al museo presenta tu código QR en cualquier dispositivo móvil o impresión.
                    </p>
                    <div style="margin:20px 0;">
                      <img src="cid:qrImage" alt="Código QR" style="width:140px; height:140px; border: 1px solid #ccc;" />
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 40px 20px 40px;">
                    <hr style="border: 0; border-top: 1px solid #ccc; width: 100%; margin: 10px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="${styleText()}">
                      <tr>
                        <td width="50%" align="left" style="padding: 10px 0; vertical-align: top; border-right: 1px solid #ffffff00;">
                          <p style="margin: 0; ${styleText(COLOR_NEUTRO, 'normal', '15px')} line-height: 1.3;">
                            <img src="cid:locationIcon" alt="Ubicación" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 5px;">
                            <span style="font-weight: bold; color: ${COLOR_NEUTRO};">${data.direccion || 'Aguayo 54, Del Carmen, Coyoacán,'}</span>
                            <br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;04100, CDMX
                          </p>
                          <p style="margin: 5px 0 0 23px; font-size: 14px;">
                            <a href="${data.ubicacionUrl}" style="color: #1976d2; text-decoration: underline;">Ver en Google Maps</a>
                          </p>
                        </td>
                        
                        <td width="50%" align="left" style="padding: 10px 0; vertical-align: top; padding-left: 20px;">
                          <p style="margin: 0; ${styleText(COLOR_NEUTRO, 'normal', '15px')} line-height: 1.3;">
                            <img src="cid:calendarIcon" alt="Fecha" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 5px;">
                            <span style="font-weight: bold; color: ${COLOR_NEUTRO};">${data.fecha}</span>
                            <br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${data.horario}
                          </p>
                        </td>
                      </tr>
                    </table>
                    <hr style="border: 0; border-top: 1px solid #ccc; width: 100%; margin: 10px 0;">
                  </td>
                </tr>

                <tr>
                    <td align="center" style="padding: 0 40px 20px 40px;">
                        <p style="${styleText()} text-align: center; margin: 0;">
                            Para ver tus reservaciones puedes ingresar a <a href="${URL_RESERVACIONES}" style="color: ${COLOR_ROJO}; font-weight: bold; text-decoration: underline;">tu cuenta</a>.
                        </p>
                    </td>
                </tr>

                <tr>
                  <td align="center" style="padding:10px 40px 0 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: ${COLOR_ROJO}; color: ${COLOR_FONDO}; font-weight: bold; font-size: 18px; padding: 10px; text-align: center; font-family: Arial, sans-serif;">
                          Antes de su visita
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 20px 40px 20px 40px; text-align: left;">
                    <p style="${styleText()} margin-bottom: 15px;">
                      Te recomendamos llegar al museo <b style="color:${COLOR_NEUTRO};">30 minutos antes</b> de que inicie tu recorrido.
                    </p>
                    <p style="${styleText()} margin-bottom: 15px;">
                      Recuerda que NO hay tolerancia. En caso de retraso, podremos incorporarte en el punto del recorrido donde esté tu grupo o reprogramarte para el siguiente recorrido disponible (guiado o libre), sujeto a disponibilidad.
                    </p>
                    <p style="${styleText()} margin-bottom: 15px;">
                      Si compraste un boleto con descuento, presenta una identificación vigente que lo compruebe al entrar.
                    </p>
                    <p style="${styleText()} margin-bottom: 15px;">
                      Te recordamos que tu boleto digital es tu acceso al recorrido, queda estrictamente prohibido realizar copias del mismo. Consulta <a href="#" style="color: #1976d2; text-decoration: underline;">términos y condiciones del boleto digital</a>.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding: 10px 40px;">
                    <p style="${styleText(COLOR_ROJO, 'bold', '18px')} text-transform: uppercase; margin: 0 0 10px 0;">
                      MÁS AMOR, MÁS FAMILIA, MÁS MÉXICO
                    </p>
                    <hr style="border: 0; border-top: 1px solid #ccc; width: 80%; margin: 10px auto;">
                  </td>
                </tr>
                
                <tr>
                  <td align="center" style="padding: 10px 40px 20px 40px;">
                    <p style="${styleText('12px')} margin: 0 0 10px 0;">
                      No responda a este correo. Para cualquier consulta, escriba a <a href="mailto:contacto@museocasakahlo.org" style="color: #1976d2; text-decoration: underline;">contacto@museocasakahlo.org</a>
                    </p>
                    <p style="font-size: 12px; color: ${COLOR_NEUTRO}; margin: 0;">
                      <a href="#" style="color: #1976d2; text-decoration: underline; margin: 0 5px;">Contacto</a> | 
                      <a href="#" style="color: #1976d2; text-decoration: underline; margin: 0 5px;">Términos y Condiciones</a> | 
                      <a href="#" style="color: #1976d2; text-decoration: underline; margin: 0 5px;">Aviso de Privacidad</a>
                    </p>
                    <p style="font-size: 12px; color: #999; margin: 10px 0 0 0;">
                      ©Copyright 2025 Museo Casa Kahlo
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};