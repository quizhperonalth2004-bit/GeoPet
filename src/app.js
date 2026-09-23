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

// Configuración permisiva de CORS para clientes móviles (Capacitor), herramientas y navegadores
app.use(cors({
    origin: true, // Refleja dinámicamente el origen de la petición (permite capacitor://, http://localhost, https://localhost, etc.)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Responder preflight OPTIONS de forma inmediata
app.options('*', cors());

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