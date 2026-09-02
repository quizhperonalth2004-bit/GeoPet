const adminService = require('./admin.service');

const adminController = {
    getMetrics: async (req, res) => {
        try {
            const metrics = await adminService.getGlobalMetrics();
            res.status(200).json(metrics);
        } catch (error) {
            console.error('[AdminController] Error al obtener métricas:', error);
            res.status(500).json({ message: 'Error al obtener métricas del sistema.', error: error.message });
        }
    }
};

module.exports = adminController;
