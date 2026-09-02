const request = require('supertest');
const app = require('../src/app');
const Pet = require('../src/modules/pets/models/pet.model');

describe('Pets Module Tests', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET /api/v1/pets/list debe retornar lista de mascotas', async () => {
        const mockPets = [
            { _id: 'pet1', name: 'Firulais', breed: 'Labrador', type: 'dog', status: true },
            { _id: 'pet2', name: 'Michi', breed: 'Siames', type: 'cat', status: true }
        ];

        jest.spyOn(Pet, 'find').mockResolvedValue(mockPets);

        const res = await request(app).get('/api/v1/pets/list');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].name).toBe('Firulais');
    });

    it('GET /api/pets/list (ruta sin prefijo v1) debe responder igual para compatibilidad', async () => {
        const mockPets = [
            { _id: 'pet1', name: 'Firulais', breed: 'Labrador' }
        ];

        jest.spyOn(Pet, 'find').mockResolvedValue(mockPets);

        const res = await request(app).get('/api/pets/list');
        expect(res.status).toBe(200);
        expect(res.body[0].name).toBe('Firulais');
    });
});
