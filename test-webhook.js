// Script para probar el webhook manualmente
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testWebhook() {
  try {
    // Crear un evento de prueba
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: {
            no_boletos: '2',
            tipos_boletos: 'adulto',
            nombre_cliente: 'Test User',
            cliente_id: '1', // Asegúrate de que este usuario exista
            correo: 'test@example.com',
            tourId: '1', // Asegúrate de que este tour exista
            fecha_ida: '2024-12-25',
            horaCompleta: '10:00',
            total: '500'
          }
        }
      }
    };

    console.log('Simulando evento de webhook:', event);
    
    // Aquí puedes probar la lógica del webhook directamente
    console.log('Metadata del evento:', event.data.object.metadata);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testWebhook();
