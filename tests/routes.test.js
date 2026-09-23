const request = require('supertest');
const app = require('../src/app');

describe('Monolito Modular - Health & Routing Tests', () => {
    it('GET /health debe retornar estado 200 y status OK', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
        expect(response.body.service).toBe('geopet-server (Modular Monolith)');
    });

    it('GET a ruta inexistente debe retornar 404 con mensaje estructurado', async () => {
        const response = await request(app).get('/api/ruta-inexistente-12345');
        expect(response.status).toBe(404);
        expect(response.body.error).toBeDefined();
    });

    it('GET /api/v1/posts debe retornar 200 con array de publicaciones enriquecidas', async () => {
        const postService = require('../src/modules/posts/post.service');
        jest.spyOn(postService, 'getPost').mockResolvedValue([
            {
                _id: 'post1',
                type: 'Perdida',
                body: 'Mascota perdida en el centro',
                petPhoto: 'assets/dogs/perroLogin.jpg',
                profilePhoto: 'assets/default-avatar.png',
                firstName: 'Juan',
                lastName: 'Perez',
                userDetails: { name: 'Juan Perez', photo: 'assets/default-avatar.png' }
            }
        ]);

        const response = await request(app).get('/api/v1/posts');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body[0].firstName).toBe('Juan');
        expect(response.body[0].userDetails).toBeDefined();
    });

    it('GET /api/v1/posts con filtro ?type=avistamiento debe pasar el filtro al servicio', async () => {
        const postService = require('../src/modules/posts/post.service');
        const spy = jest.spyOn(postService, 'getPost').mockResolvedValue([
            {
                _id: 'post2',
                type: 'Avistamiento',
                status: 'avistamiento',
                body: 'Mascota vista en el parque'
            }
        ]);

        const response = await request(app).get('/api/v1/posts?type=avistamiento');
        expect(response.status).toBe(200);
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'avistamiento' }));
        expect(response.body[0].type).toBe('Avistamiento');
    });
});
