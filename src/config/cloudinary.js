const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('[Cloudinary Config] Error crítico: Las variables de entorno CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET son requeridas y deben estar configuradas.');
    } else {
        console.warn('[Cloudinary Config] Variables de entorno de Cloudinary no configuradas en entorno de test.');
    }
}

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
});

module.exports = cloudinary;
