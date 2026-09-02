const request = require('supertest');
const app = require('../src/app');

describe('Monolito Modular - Health & Routing Tests', () => {
    it('GET /health debe retornar estado 200 y status OK', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
        expect(response.body.service).toBe('pet-book-server (Modular Monolith)');
    });

    it('GET a ruta inexistente debe retornar 404 con mensaje estructurado', async () => {
        const response = await request(app).get('/api/ruta-inexistente-12345');
        expect(response.status).toBe(404);
        expect(response.body.error).toBeDefined();
    });
});
