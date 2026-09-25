const adminService = require('./admin.service');

const adminController = {
    getMetrics: async (req, res, next) => {
        try {
            const metrics = await adminService.getGlobalMetrics();
            res.status(200).json(metrics);
        } catch (error) {
            console.error('[AdminController] Error al obtener métricas:', error);
            next(error);
        }
    }
};

module.exports = adminController;
