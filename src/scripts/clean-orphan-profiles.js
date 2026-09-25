require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../modules/users/models/user.model');
const Profile = require('../modules/users/models/profile.model');

async function cleanOrphanProfiles() {
    // Soporte para banderas CLI: --local o --atlas
    const isLocalFlag = process.argv.includes('--local');
    const isAtlasFlag = process.argv.includes('--atlas');

    let mongoURI;
    if (isLocalFlag) {
        mongoURI = 'mongodb://127.0.0.1:27017/bd_geopet';
    } else if (isAtlasFlag) {
        mongoURI = process.env.MONGO_URI;
    } else {
        mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bd_geopet';
    }

    if (!mongoURI) {
        console.error('[Error] No se especificó una URI de conexión válida para MongoDB.');
        process.exit(1);
    }

    const maskedURI = mongoURI.includes('@')
        ? mongoURI.replace(/:([^:@]+)@/, ':****@')
        : mongoURI;

    console.log('==================================================================');
    console.log('🧹 [GEOPET MAINTENANCE] Limpieza de Perfiles Huérfanos en MongoDB');
    console.log(`📡 Conectando a: ${maskedURI}`);
    console.log('==================================================================\n');

    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Conexión establecida con éxito.\n');

        // 1. Obtener todos los IDs válidos en la colección 'users'
        const validUsers = await User.find({}, '_id username email').lean();
        const validUserIds = validUsers.map(u => u._id);
        const totalValidUsers = validUserIds.length;

        console.log(`👥 Total de usuarios válidos en 'users': ${totalValidUsers}`);
        validUsers.forEach((u, idx) => {
            console.log(`   ${idx + 1}. ID: ${u._id} | Usuario: ${u.username || 'N/A'} | Email: ${u.email || 'N/A'}`);
        });
        console.log('');

        // 2. Conteo inicial en 'profiles'
        const initialProfilesCount = await Profile.countDocuments();
        console.log(`📋 Total de documentos en 'profiles' antes de la depuración: ${initialProfilesCount}`);

        // 3. Eliminar perfiles cuyo campo 'user' NO esté en validUserIds
        const deleteResult = await Profile.deleteMany({ user: { $nin: validUserIds } });
        const deletedCount = deleteResult.deletedCount || 0;

        // 4. Conteo final en 'profiles'
        const remainingProfilesCount = await Profile.countDocuments();

        console.log('\n------------------------------------------------------------------');
        console.log('📊 RESULTADOS DEL MANTENIMIENTO:');
        console.log('------------------------------------------------------------------');
        console.log(`✔️ Total de usuarios válidos encontrados:    ${totalValidUsers}`);
        console.log(`🗑️ Total de perfiles huérfanos eliminados:   ${deletedCount}`);
        console.log(`🔒 Total de perfiles legítimos conservados:  ${remainingProfilesCount}`);
        console.log('------------------------------------------------------------------\n');

        if (deletedCount > 0) {
            console.log(`✨ Se depuraron exitosamente ${deletedCount} perfiles huérfanos.`);
        } else {
            console.log('✅ La colección de perfiles ya se encontraba íntegra y sin huérfanos.');
        }

    } catch (error) {
        console.error('❌ Error durante la ejecución del script de mantenimiento:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Conexión a MongoDB cerrada de forma segura.');
    }
}

// Ejecutar si se invoca directamente desde CLI
if (require.main === module) {
    cleanOrphanProfiles();
}

module.exports = cleanOrphanProfiles;
