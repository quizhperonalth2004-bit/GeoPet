const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dlhh5olhn',
    api_key: process.env.CLOUDINARY_API_KEY || '948228499648134',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'jzBN3CWUVz2lMBYVFWFKLi7Rjio'
});

module.exports = cloudinary;
