require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3010;

// Conexión a la base de datos e inicio del servidor
const startServer = async () => {
    try {
        // Conectar a MongoDB
        await connectDB();

        // Iniciar el servidor HTTP en el puerto único
        const server = app.listen(PORT, () => {
            console.log(`=================================================`);
            console.log(`  GeoPet Monolito Modular corriendo exitosamente`);
            console.log(`  Puerto: http://localhost:${PORT}`);
            console.log(`  Health: http://localhost:${PORT}/health`);
            console.log(`  API v1: http://localhost:${PORT}/api/v1`);
            console.log(`=================================================`);
        });

        // Manejo de señales de cierre seguro (Graceful Shutdown)
        const shutdown = () => {
            console.log('\n[Server] Cerrando servidor de forma segura...');
            server.close(() => {
                console.log('[Server] Servidor cerrado correctamente.');
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('[Server] Error crítico al iniciar la aplicación:', error);
        process.exit(1);
    }
};

startServer();
