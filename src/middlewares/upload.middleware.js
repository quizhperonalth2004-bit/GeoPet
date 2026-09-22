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

// Tipos MIME y extensiones estrictamente permitidos para fotos
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Filtro estricto para prevenir Stored XSS y subida de archivos ejecutables/scripts
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    // Bloqueo explícito de tipos peligrosos (HTML, SVG, ejecutables, scripts)
    const dangerousExtensions = ['.html', '.htm', '.svg', '.php', '.js', '.exe', '.sh', '.bat', '.cmd'];
    if (dangerousExtensions.includes(ext) || mime.includes('html') || mime.includes('svg') || mime.includes('javascript')) {
        const error = new Error(`Archivo no permitido por seguridad: ${file.originalname}. Archivos ejecutables, scripts, HTML y SVG están prohibidos.`);
        error.statusCode = 400;
        return cb(error, false);
    }

    if (ALLOWED_MIME_TYPES.includes(mime) && ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true);
    } else {
        const error = new Error(`Formato no permitido: ${file.originalname}. Solo se aceptan imágenes en formato JPG, PNG o WEBP.`);
        error.statusCode = 400;
        cb(error, false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB máximo
    },
    fileFilter: fileFilter
});

// Middleware que acepta campos de archivos usados en todos los módulos
const uploadFields = upload.fields([
    { name: 'photo_profile', maxCount: 1 },
    { name: 'photo_cover', maxCount: 1 },
    { name: 'photo_post_url', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
]);

module.exports = uploadFields;
