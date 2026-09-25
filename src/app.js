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

// Configuración permisiva de CORS para desarrollo y móvil
const corsOptions = {
    origin: true, // Refleja dinámicamente cualquier origen entrante (capacitor://localhost, https://localhost, etc.)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Responder a todos los preflight OPTIONS con 200/204

// Cabeceras HTTP de seguridad con Helmet
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

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

// Middleware global de captura de logs de peticiones entrantes
app.use((req, res, next) => {
    console.log(`[REQ ENTRANTE] ${req.method} ${req.originalUrl}`);
    next();
});

// Montaje de rutas con redundancia total para garantizar compatibilidad absoluta con cualquier cliente
app.use('/api/v1/auth', require('./modules/auth/auth.routes'));
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/auth', require('./modules/auth/auth.routes'));
app.post('/google', (req, res, next) => require('./modules/auth/auth.controller').googleLogin(req, res, next));
app.post('/google-login', (req, res, next) => require('./modules/auth/auth.controller').googleLogin(req, res, next));

// Montar todas las rutas API bajo /api
app.use('/api', apiRoutes);

// Manejo de rutas no encontradas (404)
app.use(notFoundHandler);

// Manejo centralizado de errores (500)
app.use(errorHandler);

module.exports = app;