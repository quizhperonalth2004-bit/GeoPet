const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/modules/users/models/user.model');
const Profile = require('../src/modules/users/models/profile.model');

describe('Users & Profiles Module Tests', () => {
    const jwtSecret = process.env.JWT_SECRET || 'geopet_jwt_test_secret';
    const adminToken = jwt.sign({ userId: 'admin1', email: 'admin@geopet.com', rol: 'admin' }, jwtSecret);
    const userToken = jwt.sign({ userId: 'user1', email: 'user@geopet.com', rol: 'usuario' }, jwtSecret);

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET /api/v1/users/allUsers debe responder 401 si no hay token y 403 si el rol no es admin', async () => {
        // Sin token
        const resNoToken = await request(app).get('/api/v1/users/allUsers');
        expect(resNoToken.status).toBe(401);

        // Con usuario normal
        const resUser = await request(app)
            .get('/api/v1/users/allUsers')
            .set('Authorization', `Bearer ${userToken}`);
        expect(resUser.status).toBe(403);
    });

    it('GET /api/v1/users/allUsers debe retornar lista de usuarios si el rol es admin', async () => {
        const mockUsers = [
            { _id: '1', name: 'Carlos', username: 'carlos1', email: 'carlos@test.com' },
            { _id: '2', name: 'Ana', username: 'ana1', email: 'ana@test.com' }
        ];

        jest.spyOn(User, 'find').mockResolvedValue(mockUsers);

        const res = await request(app)
            .get('/api/v1/users/allUsers')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].username).toBe('carlos1');
    });

    it('GET /api/v1/profiles/all debe retornar lista de perfiles', async () => {
        const mockProfiles = [
            { _id: 'p1', user: '1', number_phone: 999999999, photo_profile_url: 'url1' }
        ];

        jest.spyOn(Profile, 'find').mockResolvedValue(mockProfiles);

        const res = await request(app).get('/api/v1/profiles/all');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });

    it('POST /api/v1/users/new debe registrar un nuevo usuario sin requerir cédula (ci)', async () => {
        const mockSavedUser = {
            _id: '507f1f77bcf86cd799439012',
            name: 'Juan',
            last_name: 'Perez',
            username: 'juanp',
            email: 'juan@test.com',
            rol: 'usuario',
            status_profile: true,
            save: jest.fn().mockResolvedValue(true)
        };

        jest.spyOn(User.prototype, 'save').mockResolvedValue(mockSavedUser);
        jest.spyOn(Profile.prototype, 'save').mockResolvedValue(true);

        const res = await request(app)
            .post('/api/v1/users/new')
            .send({
                name: 'Juan',
                last_name: 'Perez',
                username: 'juanp',
                email: 'juan@test.com',
                password: 'Password123!',
                rol: 'usuario'
            });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('Usuario creado correctamente');
    });

    it('PATCH /api/v1/users/:id/role debe rechazar usuarios no admin con 403 y permitir con admin 200', async () => {
        // Usuario normal intentando cambiar rol -> 403
        const resUser = await request(app)
            .patch('/api/v1/users/507f1f77bcf86cd799439012/role')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ rol: 'admin' });
        expect(resUser.status).toBe(403);

        // Admin cambiando rol -> 200
        jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({
            _id: '507f1f77bcf86cd799439012',
            username: 'juanp',
            rol: 'admin'
        });

        const resAdmin = await request(app)
            .patch('/api/v1/users/507f1f77bcf86cd799439012/role')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ rol: 'admin' });
        expect(resAdmin.status).toBe(200);
        expect(resAdmin.body.message).toBe('Rol actualizado exitosamente.');
    });

    it('GET /api/v1/admin/metrics debe rechazar usuarios normales con 403 y permitir admin con 200', async () => {
        // Usuario normal -> 403
        const resUser = await request(app)
            .get('/api/v1/admin/metrics')
            .set('Authorization', `Bearer ${userToken}`);
        expect(resUser.status).toBe(403);

        // Admin -> 200
        const adminService = require('../src/modules/admin/admin.service');
        jest.spyOn(adminService, 'getGlobalMetrics').mockResolvedValue({
            timestamp: new Date().toISOString(),
            metrics: {
                users: { total: 10 }
            }
        });

        const resAdmin = await request(app)
            .get('/api/v1/admin/metrics')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(resAdmin.status).toBe(200);
        expect(resAdmin.body.metrics).toBeDefined();
        expect(resAdmin.body.metrics.users).toBeDefined();
    });
});
