const User = require('../users/models/user.model');
const Pet = require('../pets/models/pet.model');
const Post = require('../posts/post.model');

class AdminService {
    async getGlobalMetrics() {
        const [
            totalUsers,
            adminUsers,
            foundationUsers,
            standardUsers,
            totalPets,
            totalPosts,
            lostPosts,
            sightingPosts,
            foundPosts,
            adoptionPosts
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ rol: 'admin' }),
            User.countDocuments({ rol: 'fundacion' }),
            User.countDocuments({ rol: 'usuario' }),
            Pet.countDocuments(),
            Post.countDocuments(),
            Post.countDocuments({ type: 'Perdida' }),
            Post.countDocuments({ type: 'Avistamiento' }),
            Post.countDocuments({ type: 'Encontrado' }),
            Post.countDocuments({ type: 'Adopcion' })
        ]);

        let totalSightings = 0;
        try {
            const sightingsAggregation = await Post.aggregate([
                { $unwind: { path: '$sightings', preserveNullAndEmptyArrays: false } },
                { $count: 'totalSightings' }
            ]);
            totalSightings = sightingsAggregation[0]?.totalSightings || 0;
        } catch (e) {
            totalSightings = 0;
        }

        return {
            timestamp: new Date().toISOString(),
            metrics: {
                users: {
                    total: totalUsers,
                    admins: adminUsers,
                    foundations: foundationUsers,
                    standard: standardUsers
                },
                pets: {
                    total: totalPets
                },
                posts: {
                    total: totalPosts,
                    activeLost: lostPosts,
                    activeSightings: sightingPosts,
                    resolvedFound: foundPosts,
                    adoptions: adoptionPosts
                },
                sightings: {
                    total: totalSightings
                }
            }
        };
    }
}

module.exports = new AdminService();
