const { z } = require('zod');

/**
 * Esquema para validar identificadores de MongoDB
 */
const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
const mongoIdParamDto = z.object({
    id: z.string({
        message: 'ID de mascota inválido.'
    }).regex(mongoIdRegex, 'ID de mascota inválido.')
});

/**
 * DTO para la creación de una nueva mascota
 */
const createPetDto = z.object({
    name: z.string({
        message: 'El nombre de la mascota es requerido.'
    }).trim().min(1, 'El nombre de la mascota no puede estar vacío.'),
    
    breed: z.string().trim().optional(),
    type: z.string().trim().optional(),
    age: z.union([z.string(), z.number()]).optional(),
    gender: z.string().trim().optional(),
    description: z.string().trim().optional(),
    owner: z.string().trim().regex(mongoIdRegex, 'ID de propietario inválido.').optional(),
    status: z.union([z.boolean(), z.string()]).optional(),
    photo_url: z.string().trim().optional()
});

/**
 * DTO para actualizar los datos de una mascota
 */
const updatePetDto = z.object({
    name: z.string().trim().min(1).optional(),
    breed: z.string().trim().optional(),
    type: z.string().trim().optional(),
    age: z.union([z.string(), z.number()]).optional(),
    gender: z.string().trim().optional(),
    description: z.string().trim().optional(),
    owner: z.string().trim().regex(mongoIdRegex).optional(),
    status: z.union([z.boolean(), z.string()]).optional(),
    photo_url: z.string().trim().optional()
});

/**
 * DTO para cambio de estado de mascota
 */
const changeStatusPetDto = z.object({
    petId: z.string({
        message: 'El identificador petId es requerido.'
    }).trim().min(1, 'El identificador petId no puede estar vacío.'),
    status: z.union([z.boolean(), z.string(), z.number()], {
        message: 'El estado es requerido.'
    })
});

/**
 * DTO para consulta de mascotas por propietario
 */
const getPetsByUserDto = z.object({
    owner: z.string({
        message: 'El ID de propietario es requerido.'
    }).trim().min(1, 'El ID de propietario no puede estar vacío.')
});

module.exports = {
    mongoIdParamDto,
    createPetDto,
    updatePetDto,
    changeStatusPetDto,
    getPetsByUserDto
};
