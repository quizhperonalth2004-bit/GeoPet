const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Post = require('../src/modules/posts/post.model');

describe('Sightings / Geolocalización & Módulos desconectados', () => {
    const validUserId = new mongoose.Types.ObjectId().toString();
    const validPostId = new mongoose.Types.ObjectId().toString();
    const jwtSecret = process.env.JWT_SECRET || 'fabricio29';
    const token = jwt.sign(
        { userId: validUserId, email: 'test@example.com', rol: 'usuario' },
        jwtSecret,
        { expiresIn: '1h' }
    );

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('1. Verificación de módulos desconectados y rutas activas', () => {
        it('No debe tener registrados en mongoose los modelos eliminados (Event, Forum, Reaction)', () => {
            const registeredModels = Object.keys(mongoose.models);
            expect(registeredModels).not.toContain('Event');
            expect(registeredModels).not.toContain('Forum');
            expect(registeredModels).not.toContain('Reaction');
        });

        it('Las rutas de /events, /forums y /reactions deben responder 404', async () => {
            const eventRes = await request(app).get('/api/v1/events/all');
            expect(eventRes.status).toBe(404);

            const forumRes = await request(app).get('/api/v1/forums/all');
            expect(forumRes.status).toBe(404);

            const reactionRes = await request(app).get('/api/v1/reactions/check');
            expect(reactionRes.status).toBe(404);
        });

        it('Las rutas de /comments deben estar montadas correctamente (no retornan 404)', async () => {
            const commentRes = await request(app).post('/api/v1/comments/post/new');
            expect(commentRes.status).not.toBe(404);
        });
    });

    describe('2. Endpoint POST /api/v1/posts/:id/sightings', () => {
        it('Debe rechazar la petición sin token JWT (401)', async () => {
            const res = await request(app)
                .post(`/api/v1/posts/${validPostId}/sightings`)
                .send({
                    location: { lat: -0.180653, lng: -78.467834 },
                    comment: 'La vi cerca del parque'
                });

            expect(res.status).toBe(401);
            expect(res.body.message).toContain('Token no proporcionado');
        });

        it('Debe rechazar la petición si el ID de post es inválido (400)', async () => {
            const res = await request(app)
                .post('/api/v1/posts/id-invalido-123/sightings')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    location: { lat: -0.180653, lng: -78.467834 },
                    comment: 'Prueba'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('ID de publicación');
        });

        it('Debe rechazar la petición si el post no existe (404)', async () => {
            jest.spyOn(Post, 'findById').mockResolvedValue(null);

            const res = await request(app)
                .post(`/api/v1/posts/${validPostId}/sightings`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    location: { lat: -0.180653, lng: -78.467834 },
                    comment: 'Prueba'
                });

            expect(res.status).toBe(404);
            expect(res.body.error).toContain('Publicación no encontrada');
        });

        it('Debe rechazar la petición si faltan las coordenadas (400)', async () => {
            const mockPost = {
                _id: validPostId,
                owner: new mongoose.Types.ObjectId(),
                sightings: [],
                save: jest.fn().mockResolvedValue(true)
            };
            jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);

            const res = await request(app)
                .post(`/api/v1/posts/${validPostId}/sightings`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    comment: 'Sin coordenadas'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('coordenadas');
        });

        it('Debe rechazar la petición si las coordenadas son inválidas o fuera de rango (400)', async () => {
            const mockPost = {
                _id: validPostId,
                owner: new mongoose.Types.ObjectId(),
                sightings: [],
                save: jest.fn().mockResolvedValue(true)
            };
            jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);

            const res = await request(app)
                .post(`/api/v1/posts/${validPostId}/sightings`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    location: { lat: 100, lng: -78.467834 },
                    comment: 'Coordenada fuera de rango'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('rango');
        });

        it('Debe registrar exitosamente un avistamiento con location { lat, lng } (201)', async () => {
            const mockPost = {
                _id: validPostId,
                owner: new mongoose.Types.ObjectId(),
                sightings: [],
                save: jest.fn().mockImplementation(function () {
                    return Promise.resolve(this);
                }),
                populate: jest.fn().mockResolvedValue(true)
            };
            jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);

            const res = await request(app)
                .post(`/api/v1/posts/${validPostId}/sightings`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    location: { lat: -0.180653, lng: -78.467834 },
                    comment: 'Vista hoy a las 9am corriendo hacia el parque',
                    photo_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
                });

            expect(res.status).toBe(201);
            expect(res.body.sighting).toBeDefined();
            expect(res.body.sighting.location.lat).toBe(-0.180653);
            expect(res.body.sighting.location.lng).toBe(-78.467834);
            expect(res.body.sighting.comment).toBe('Vista hoy a las 9am corriendo hacia el parque');
            expect(res.body.sighting.photo_url).toBe('https://res.cloudinary.com/demo/image/upload/sample.jpg');
            expect(mockPost.sightings).toHaveLength(1);
            expect(mockPost.save).toHaveBeenCalled();
        });

        it('Debe aceptar también coordenadas planas lat y lng en el body (201)', async () => {
            const mockPost = {
                _id: validPostId,
                owner: new mongoose.Types.ObjectId(),
                sightings: [],
                save: jest.fn().mockImplementation(function () {
                    return Promise.resolve(this);
                }),
                populate: jest.fn().mockResolvedValue(true)
            };
            jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);

            const res = await request(app)
                .post(`/api/v1/posts/${validPostId}/sightings`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    lat: -0.210000,
                    lng: -78.500000,
                    comment: 'Otro avistamiento plano'
                });

            expect(res.status).toBe(201);
            expect(res.body.sighting.location.lat).toBe(-0.21);
            expect(res.body.sighting.location.lng).toBe(-78.5);
            expect(mockPost.sightings).toHaveLength(1);
        });

        it('Debe rechazar con 400 si el autor intenta registrar un avistamiento sobre su propia publicación', async () => {
            const mockPost = {
                _id: validPostId,
                owner: new mongoose.Types.ObjectId(validUserId),
                sightings: [],
                save: jest.fn()
            };
            jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);

            const res = await request(app)
                .post(`/api/v1/posts/${validPostId}/sightings`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    location: { lat: -0.180653, lng: -78.467834 },
                    comment: 'Intento de auto-avistamiento'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('No puedes registrar un avistamiento sobre tu propia publicación');
            expect(mockPost.save).not.toHaveBeenCalled();
        });

        it('Debe rechazar con 400 si la publicación ya fue marcada como encontrado', async () => {
            const mockPost = {
                _id: validPostId,
                owner: new mongoose.Types.ObjectId(),
                status: 'encontrado',
                sightings: [],
                save: jest.fn()
            };
            jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);

            const res = await request(app)
                .post(`/api/v1/posts/${validPostId}/sightings`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    location: { lat: -0.180653, lng: -78.467834 },
                    comment: 'Avistamiento tardío'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Este caso ya fue cerrado como encontrado. No se pueden agregar más avistamientos.');
            expect(mockPost.save).not.toHaveBeenCalled();
        });

        it('Debe incluir los avistamientos con usuario y profile_picture al consultar el detalle del post (GET)', async () => {
            const User = require('../src/modules/users/models/user.model');
            const Profile = require('../src/modules/users/models/profile.model');
            jest.spyOn(User, 'findById').mockResolvedValue({ name: 'Dueño', last_name: 'Post', toObject: function() { return this; } });
            jest.spyOn(Profile, 'findOne').mockResolvedValue({ photo_profile_url: 'https://example.com/p.jpg', toObject: function() { return this; } });

            const mockPost = {
                _id: validPostId,
                owner: new mongoose.Types.ObjectId(),
                type: 'Perdida',
                sightings: [
                    {
                        post: validPostId,
                        post_id: validPostId,
                        user: {
                            _id: new mongoose.Types.ObjectId(),
                            name: 'Vecino Vigilante',
                            profile_picture: 'https://example.com/vecino.jpg'
                        },
                        location: { lat: -0.180653, lng: -78.467834 },
                        comment: 'Lo vi por la tienda'
                    }
                ],
                toObject: function () { return this; }
            };

            jest.spyOn(Post, 'findById').mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockPost)
            });

            const res = await request(app)
                .get(`/api/v1/posts/${validPostId}`);

            expect(res.status).toBe(200);
            expect(res.body.sightings).toBeDefined();
            expect(res.body.sightings).toHaveLength(1);
            expect(res.body.sightings[0].user.name).toBe('Vecino Vigilante');
            expect(res.body.sightings[0].user.profile_picture).toBe('https://example.com/vecino.jpg');
        });
    });
});
