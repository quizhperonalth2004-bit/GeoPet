const multer = require('multer');
const path = require('path');
const fs = require('fs');

const mediaDir = path.join(__dirname, '../../media');
if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
}

// Configuración de almacenamiento temporal en disco para Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, mediaDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB máximo
    }
});

// Middleware que acepta campos de archivos usados en todos los módulos
const uploadFields = upload.fields([
    { name: 'photo_profile', maxCount: 1 },
    { name: 'photo_cover', maxCount: 1 },
    { name: 'photo_post_url', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
]);

module.exports = uploadFields;
