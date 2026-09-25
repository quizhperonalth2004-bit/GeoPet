const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/modules/users/models/user.model');
const Post = require('../src/modules/posts/post.model');
const Notification = require('../src/modules/notifications/notification.model');

describe('Prueba de Estrés e Integridad Funcional Profunda (Sightings & Geospatial Engine)', () => {
    const jwtSecret = process.env.JWT_SECRET || 'geopet_jwt_test_secret';
    const timestamp = Date.now();

    const propietarioEmail = `propietario_${timestamp}@test.com`;
    const colaboradorEmail = `colaborador_${timestamp}@test.com`;
    const password = 'Password123!';

    let agent;

    let propietarioId;
    let colaboradorId;
    let propietarioToken;
    let colaboradorToken;
    let createdPostId;

    beforeAll(async () => {
        // Conexión garantizada a MongoDB local para la prueba de integración profunda y latencia certificada
        const mongoURI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/bd_geopet';
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        await mongoose.connect(mongoURI);

        // Asegurar que los índices (en especial 2dsphere) estén creados y activos
        await Post.createIndexes();

        agent = request(app);

        // Calentamiento inicial de la pila de Express y Mongoose
        await agent.get('/health');
    }, 15000);

    afterAll(async () => {
        try {
            // Limpieza de datos transaccionales creados durante la prueba
            if (propietarioId || colaboradorId) {
                await User.deleteMany({
                    _id: { $in: [propietarioId, colaboradorId].filter(Boolean) }
                });
            }
            if (createdPostId) {
                await Post.deleteOne({ _id: createdPostId });
                await Notification.deleteMany({ post_id: createdPostId });
            }
        } catch (cleanupErr) {
            console.warn('[IntegrityTest] Advertencia durante limpieza de datos:', cleanupErr.message);
        }

        // Cierre limpio de la conexión Mongoose
        await mongoose.disconnect();
    });

    // --------------------------------------------------------------------------
    // 1. AUTENTICACIÓN Y CUENTAS
    // --------------------------------------------------------------------------
    describe('1. Autenticación y Cuentas de Usuario', () => {
        it('1.1 Registro concurrente de Propietario y Colaborador con rol "usuario" en < 300 ms', async () => {
            const startRegister = Date.now();

            const [resProp, resColab] = await Promise.all([
                agent
                    .post('/api/v1/users/new')
                    .send({
                        name: 'Carlos',
                        last_name: 'Propietario',
                        username: `prop_${timestamp}`,
                        email: propietarioEmail,
                        password: password,
                        rol: 'usuario'
                    }),
                agent
                    .post('/api/v1/users/new')
                    .send({
                        name: 'Ana',
                        last_name: 'Colaboradora',
                        username: `colab_${timestamp}`,
                        email: colaboradorEmail,
                        password: password,
                        rol: 'usuario'
                    })
            ]);

            const totalDuration = Date.now() - startRegister;
            const avgDuration = totalDuration / 2;

            expect(resProp.status).toBe(201);
            expect(resColab.status).toBe(201);

            expect(resProp.body.user).toBeDefined();
            expect(resColab.body.user).toBeDefined();

            propietarioId = resProp.body.user._id;
            colaboradorId = resColab.body.user._id;

            expect(resProp.body.user.rol).toBe('usuario');
            expect(resColab.body.user.rol).toBe('usuario');

            expect(avgDuration).toBeLessThan(300);
        });

        it('1.2 Generación de JWT para Propietario en < 300 ms', async () => {
            const startLogin = Date.now();

            const res = await agent
                .post('/api/v1/auth/login')
                .send({
                    email: propietarioEmail,
                    password: password
                });

            const duration = Date.now() - startLogin;

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();

            propietarioToken = res.body.token;

            const decoded = jwt.verify(propietarioToken, jwtSecret);
            expect(decoded.userId).toBe(propietarioId.toString());
            expect(decoded.rol).toBe('usuario');

            expect(duration).toBeLessThan(300);
        });

        it('1.3 Generación de JWT para Colaborador en < 300 ms', async () => {
            const startLogin = Date.now();

            const res = await agent
                .post('/api/v1/auth/login')
                .send({
                    email: colaboradorEmail,
                    password: password
                });

            const duration = Date.now() - startLogin;

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();

            colaboradorToken = res.body.token;

            const decoded = jwt.verify(colaboradorToken, jwtSecret);
            expect(decoded.userId).toBe(colaboradorId.toString());
            expect(decoded.rol).toBe('usuario');

            expect(duration).toBeLessThan(300);
        });
    });

    // --------------------------------------------------------------------------
    // 2. PUBLICACIÓN DE MASCOTA CON COORDENADAS GEOJSON
    // --------------------------------------------------------------------------
    describe('2. Publicación de Mascota Perdida con Coordenadas GeoJSON', () => {
        it('2.1 Creación de reporte "Perdido" con coordenadas [longitud, latitud] en < 300 ms', async () => {
            const startPost = Date.now();

            const res = await agent
                .post('/api/v1/posts/new')
                .set('Authorization', `Bearer ${propietarioToken}`)
                .send({
                    type: 'Perdida',
                    body: 'Se busca perrito Toby extraviado en el Parque Central.',
                    coordinates: [-79.2042, -3.9931], // GeoJSON [lng, lat]
                    address: 'Parque Central, Loja, Ecuador',
                    reward: 100,
                    owner: propietarioId
                });

            const duration = Date.now() - startPost;

            expect(res.status).toBe(201);
            expect(res.body.post).toBeDefined();
            expect(res.body.post.type).toBe('Perdida');
            expect(res.body.post.status).toBe('perdido');
            expect(res.body.post.location).toBeDefined();
            expect(res.body.post.location.type).toBe('Point');
            expect(res.body.post.location.coordinates).toEqual([-79.2042, -3.9931]);

            createdPostId = res.body.post._id;
            expect(createdPostId).toBeDefined();

            expect(duration).toBeLessThan(300);
        });
    });

    // --------------------------------------------------------------------------
    // 3. REGISTRO DE AVISTAMIENTO COLABORATIVO
    // --------------------------------------------------------------------------
    describe('3. Registro de Avistamiento Colaborativo con GPS', () => {
        it('3.1 Colaborador registra avistamiento con coordenadas y comentario en < 300 ms (HTTP 201)', async () => {
            const startSighting = Date.now();

            const sightingPayload = {
                location: {
                    lat: -3.9935,
                    lng: -79.2045
                },
                comment: 'Avisté a Toby cerca de la fuente de agua hace 10 minutos',
                photo_url: 'https://res.cloudinary.com/geopet/image/upload/sample_sighting.jpg'
            };

            const res = await agent
                .post(`/api/v1/posts/${createdPostId}/sightings`)
                .set('Authorization', `Bearer ${colaboradorToken}`)
                .send(sightingPayload);

            const duration = Date.now() - startSighting;

            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Avistamiento registrado exitosamente');
            expect(res.body.sighting).toBeDefined();

            expect(res.body.sighting.location.lat).toBe(-3.9935);
            expect(res.body.sighting.location.lng).toBe(-79.2045);
            expect(res.body.sighting.comment).toBe(sightingPayload.comment);
            expect(res.body.sighting.photo_url).toBe(sightingPayload.photo_url);

            expect(duration).toBeLessThan(300);
        });
    });

    // --------------------------------------------------------------------------
    // 4. VERIFICACIÓN DE INTEGRIDAD EN MONGODB
    // --------------------------------------------------------------------------
    describe('4. Verificación de Integridad en MongoDB (Posts & Notifications)', () => {
        it('4.1 Array "sightings" en la colección "posts" posee tipos numéricos exactos y autor', async () => {
            const postDoc = await Post.findById(createdPostId);

            expect(postDoc).not.toBeNull();
            expect(postDoc.sightings).toBeDefined();
            expect(postDoc.sightings.length).toBe(1);

            const sighting = postDoc.sightings[0];

            // Verificación estricta de tipos numéricos
            expect(typeof sighting.location.lat).toBe('number');
            expect(typeof sighting.location.lng).toBe('number');
            expect(sighting.location.lat).toBeCloseTo(-3.9935, 4);
            expect(sighting.location.lng).toBeCloseTo(-79.2045, 4);

            // Verificación de autor y referencia de post
            expect(sighting.user.toString()).toBe(colaboradorId.toString());
            expect(sighting.post.toString()).toBe(createdPostId.toString());
            expect(sighting.comment).toContain('fuente de agua');
        });

        it('4.2 Colección "notifications" contiene la alerta para el Propietario con view: false y post_id', async () => {
            const notifDoc = await Notification.findOne({
                post_id: createdPostId,
                receiver_id: propietarioId
            });

            expect(notifDoc).not.toBeNull();
            expect(notifDoc.type).toBe('post');
            expect(notifDoc.view).toBe(false);
            expect(notifDoc.emiter_id.toString()).toBe(colaboradorId.toString());
            expect(notifDoc.receiver_id.toString()).toBe(propietarioId.toString());
            expect(notifDoc.createdAt).toBeInstanceOf(Date);
        });
    });

    // --------------------------------------------------------------------------
    // 5. CONSULTA GEOESPACIAL DE LA HUELLA (2DSPHERE)
    // --------------------------------------------------------------------------
    describe('5. Consulta Geoespacial de la Huella en Mapa (2dsphere Index)', () => {
        it('5.1 Debe indexar y recuperar la huella en radio de 5 km usando operador $near', async () => {
            const centerCoordinates = [-79.2042, -3.9931];

            // Búsqueda espacial $near sobre índice 2dsphere a máx 5000 metros (5 km)
            const nearbyPosts = await Post.find({
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: centerCoordinates
                        },
                        $maxDistance: 5000 // 5 km
                    }
                }
            });

            expect(nearbyPosts).toBeDefined();
            expect(nearbyPosts.length).toBeGreaterThanOrEqual(1);

            const foundPost = nearbyPosts.find(p => p._id.toString() === createdPostId.toString());
            expect(foundPost).toBeDefined();
            expect(foundPost.type).toBe('Perdida');
            expect(foundPost.sightings.length).toBe(1);
        });

        it('5.2 Debe recuperar la huella mediante $geoWithin en una esfera de 5 km (Leaflet Viewport)', async () => {
            const centerCoordinates = [-79.2042, -3.9931];
            // Radio en radianes: distancia_km / radio_tierra_km (6378.1 km)
            const radiusInRadians = 5 / 6378.1;

            const areaPosts = await Post.find({
                location: {
                    $geoWithin: {
                        $centerSphere: [centerCoordinates, radiusInRadians]
                    }
                }
            });

            expect(areaPosts).toBeDefined();
            const matching = areaPosts.some(p => p._id.toString() === createdPostId.toString());
            expect(matching).toBe(true);
        });
    });

    // --------------------------------------------------------------------------
    // 6. CERTIFICACIÓN DE LATENCIA Y RENDIMIENTO
    // --------------------------------------------------------------------------
    describe('6. Certificación de Rendimiento y Latencia de Endpoints', () => {
        it('6.1 Consulta de detalle de post enriquecido con sightings responde en < 300 ms', async () => {
            const startGet = Date.now();

            const res = await agent
                .get(`/api/v1/posts/${createdPostId}`);

            const duration = Date.now() - startGet;

            expect(res.status).toBe(200);
            expect(res.body.sightings).toBeDefined();
            expect(res.body.sightings.length).toBe(1);

            expect(duration).toBeLessThan(300);
        });
    });
});
