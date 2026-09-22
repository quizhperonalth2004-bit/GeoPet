require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const compression = require('compression');
const helmet = require('helmet');
const limiter = require('./middlewares/rateLimit.middleware');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const apiRoutes = require('./routes');

const app = express();

// Cabeceras HTTP de seguridad con Helmet
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Configuración de CORS segura para clientes móviles (Capacitor) y desarrollo web
const allowedOrigins = [
    'http://localhost:4200',    // Angular CLI Dev
    'http://localhost:8100',    // Ionic CLI Dev
    'http://localhost:3010',    // Backend local
    'capacitor://localhost',    // Capacitor iOS / Android
    'http://localhost'          // Capacitor Android WebView fallback
];

if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach(origin => {
        const trimmed = origin.trim();
        if (trimmed && !allowedOrigins.includes(trimmed)) {
            allowedOrigins.push(trimmed);
        }
    });
}

const corsOptions = {
    origin: (origin, callback) => {
        // Permitir solicitudes sin header Origin (apps móviles nativas, Supertest, Postman, curl)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Bloqueado por política de CORS: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(compression({
    threshold: 1024 // Solo comprimir respuestas mayores a 1 KB
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging en desarrollo
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// Rate Limiting
app.use(limiter);

// Servir archivos estáticos de media si existen
const mediaPath = path.join(__dirname, '../media');
app.use('/media', express.static(mediaPath));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'pet-book-server (Modular Monolith)'
    });
});

// Montar todas las rutas API bajo /api
app.use('/api', apiRoutes);

// Montar también bajo /auth directamente para compatibilidad absoluta con clientes externos
app.use('/auth', require('./modules/auth/auth.routes'));

// Manejo de rutas no encontradas (404)
app.use(notFoundHandler);

// Manejo centralizado de errores (500)
app.use(errorHandler);

module.exports = app;
