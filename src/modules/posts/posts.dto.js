const { z } = require('zod');

const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validación de parámetros de ruta para publicaciones
 */
const postIdParamDto = z.object({
    id: z.string({
        message: 'ID de publicación no válido'
    }).regex(mongoIdRegex, 'ID de publicación no válido')
});

/**
 * Esquema de coordenadas geoespaciales estrictas
 */
const coordinateSchema = z.object({
    lat: z.coerce.number({
        message: 'La latitud es obligatoria y debe ser un número válido.'
    }).min(-90, 'Coordenada fuera de rango válido (-90 a 90 para latitud).')
      .max(90, 'Coordenada fuera de rango válido (-90 a 90 para latitud).'),
    lng: z.coerce.number({
        message: 'La longitud es obligatoria y debe ser un número válido.'
    }).min(-180, 'Coordenada fuera de rango válido (-180 a 180 para longitud).')
      .max(180, 'Coordenada fuera de rango válido (-180 a 180 para longitud).')
});

/**
 * Tipos de publicaciones soportados por el dominio GeoPet
 */
const validPostTypes = ['Perdida', 'Avistamiento', 'Encontrado', 'Adopcion', 'perdido', 'avistamiento', 'encontrado', 'adopcion'];

/**
 * DTO para la creación de publicaciones
 */
const createPostDto = z.object({
    type: z.string().optional(),
    status: z.string().optional(),
    body: z.string({
        message: 'La descripción del reporte es obligatoria.'
    }).trim().min(1, 'La descripción del reporte no puede estar vacía.'),
    owner: z.string().regex(mongoIdRegex, 'ID de propietario inválido.').optional(),
    pet: z.string().regex(mongoIdRegex, 'ID de mascota inválido.').optional(),
    reward: z.union([z.string(), z.number()]).optional(),
    address: z.string().optional(),
    coordinates: z.any().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    location: z.any().optional()
}).refine(data => data.type || data.status, {
    message: 'Debe especificar el tipo o estado de la publicación.',
    path: ['type']
});

/**
 * DTO para registro de avistamientos con validación geoespacial estricta
 * Acepta tanto estructura anidada { location: { lat, lng } } como plana { lat, lng }
 */
const addSightingDto = z.object({
    location: z.any().optional(),
    lat: z.any().optional(),
    latitude: z.any().optional(),
    lng: z.any().optional(),
    longitude: z.any().optional(),
    comment: z.string().trim().optional(),
    photo_url: z.string().trim().optional()
}).superRefine((data, ctx) => {
    let lat = undefined;
    let lng = undefined;

    let loc = data.location;
    if (typeof loc === 'string') {
        try {
            loc = JSON.parse(loc);
        } catch (e) {
            // Continúa con otros campos
        }
    }

    if (loc && typeof loc === 'object') {
        lat = loc.lat !== undefined ? loc.lat : loc.latitude;
        lng = loc.lng !== undefined ? loc.lng : loc.longitude;
    }

    if (lat === undefined && data.lat !== undefined) lat = data.lat;
    if (lat === undefined && data.latitude !== undefined) lat = data.latitude;
    if (lng === undefined && data.lng !== undefined) lng = data.lng;
    if (lng === undefined && data.longitude !== undefined) lng = data.longitude;

    if (lat === undefined || lng === undefined || lat === null || lng === null || lat === '' || lng === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Las coordenadas de ubicación (lat, lng) son obligatorias',
            path: ['location']
        });
        return;
    }

    const numLat = Number(lat);
    const numLng = Number(lng);

    if (isNaN(numLat) || isNaN(numLng)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Las coordenadas (lat, lng) deben ser números válidos',
            path: ['location']
        });
        return;
    }

    if (numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Las coordenadas están fuera del rango válido (lat: -90 a 90, lng: -180 a 180)',
            path: ['location']
        });
    }
});

/**
 * DTO para filtros de búsqueda en publicaciones
 */
const getPostQueryDto = z.object({
    type: z.string().optional(),
    status: z.string().optional(),
    limit: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().optional()
});

module.exports = {
    postIdParamDto,
    coordinateSchema,
    createPostDto,
    addSightingDto,
    getPostQueryDto
};
