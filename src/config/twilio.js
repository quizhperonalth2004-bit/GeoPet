const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

let client = null;

try {
    if (accountSid && authToken && !accountSid.includes('tu_') && !authToken.includes('tu_')) {
        client = twilio(accountSid, authToken);
    }
} catch (error) {
    console.warn('[Twilio] No se pudo inicializar el cliente de Twilio:', error.message);
}

module.exports = {
    twilioClient: client,
    twilioFrom
};