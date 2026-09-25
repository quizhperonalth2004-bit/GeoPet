const { z } = require('zod');

/**
 * Validador para parámetro :id de Notificación
 */
const notificationIdParamDto = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de notificación inválido')
});

/**
 * Validador para marcar como leída / actualizar notificación
 */
const updateNotificationDto = z.object({
    view: z.boolean().optional()
}).passthrough();

/**
 * Validador para creación por lote de notificaciones
 */
const createNotificationsDto = z.object({
    notifications: z.array(z.object({
        type: z.string().optional(),
        emiter_id: z.string().optional(),
        receiver_id: z.string().optional(),
        view: z.boolean().optional(),
        post_id: z.string().optional(),
        comment_id: z.string().optional(),
        sighting_id: z.string().optional()
    }).passthrough()).min(1, 'Las notificaciones deben ser un array con al menos un elemento')
});

module.exports = {
    notificationIdParamDto,
    updateNotificationDto,
    createNotificationsDto
};
