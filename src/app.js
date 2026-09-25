require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const compression = require('compression');
const helmet = require('helmet');
const limiter = require('./middlewares/rateLimit.middleware');
const mongoSanitize = require('./middlewares/mongoSanitize.middleware');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const apiRoutes = require('./routes');

const app = express();

// Cabeceras HTTP de seguridad con Helmet
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Whitelist explícita de orígenes móviles y desarrollo
const allowedOrigins = [
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost:3010',
    'http://localhost:8100'
];

const corsOptions = {
    origin: (origin, callback) => {
        // Permitir peticiones sin cabecera Origin (apps nativas Android/iOS, CapacitorHttp, Postman, curl)
        if (!origin) return callback(null, true);
        if (
            allowedOrigins.includes(origin) ||
            origin.startsWith('capacitor://') ||
            origin.startsWith('ionic://') ||
            origin.endsWith('.onrender.com') ||
            /^https?:\/\/localhost(:\d+)?$/.test(origin)
        ) {
            return callback(null, true);
        }
        return callback(null, true); // Fallback permisivo para clientes adicionales
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(compression({
    threshold: 1024 // Solo comprimir respuestas mayores a 1 KB
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitización de entradas contra inyecciones NoSQL en MongoDB
app.use(mongoSanitize);

// Logging en desarrollo
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// Rate Limiting
app.use(limiter);

// Servir archivos estáticos de media si existen
const mediaPath = path.join(__dirname, '../media');
app.use('/media', express.static(mediaPath));

// Ruta raíz informativa
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Bienvenido a la API de GeoPet',
        status: 'Online',
        version: '1.0.0',
        healthCheck: '/health'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'geopet-server (Modular Monolith)'
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