const mongoose = require('mongoose');

const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bd_geopet';

    try {
        const conn = await mongoose.connect(mongoURI, {
            autoIndex: true
        });
        console.log(`[Database] MongoDB conectado exitosamente en: ${conn.connection.host}/${conn.connection.name}`);
    } catch (error) {
        console.error('[Database] Error al conectar a MongoDB:', error.message);
        // En producción o inicio crítico, registrar error
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
};

module.exports = connectDB;
