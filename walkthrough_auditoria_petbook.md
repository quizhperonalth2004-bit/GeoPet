# Reporte de Auditoría: Detección y Análisis de Referencias Heredadas de "PetBook"

Este documento contiene los resultados del escaneo exhaustivo realizado en la totalidad del espacio de trabajo (**Backend `geopet_serve`** y **Frontend `Mascotas`**) para detectar rastros o cadenas heredadas asociadas a `"petbook"`, `"pet-book"`, `"pet_book"`, `"servicios-petbook"`, `"FabricioY19"` y `"Yanangomez"`.

---

## 1. Resumen Ejecutivo del Escaneo

| Espacio de Trabajo | Coincidencias Detectadas | Estado General |
| :--- | :---: | :--- |
| **Backend (`geopet_serve`)** | **11 hallazgos** (en 7 archivos) | Contiene referencias en configuración (`package.json`, `docker-compose.yml`), endpoints de health check (`app.js`), mensajes de validación al usuario (`user.controller.js`), fallback de base de datos (`db.js`) y secretos de prueba en Jest. |
| **Frontend (`Mascotas`)** | **0 hallazgos** | **100% Limpio**. Las configuraciones de Capacitor (`com.geopet.app`), entornos (`geopet-j1fu.onrender.com`) y código fuente Angular no contienen ninguna referencia residual. |

---

## 2. Clasificación Detallada de Hallazgos en `geopet_serve`

A continuación se detalla cada hallazgo clasificado por su ubicación exacta, contexto e impacto técnico ante una eventual migración:

### A. Archivos de Configuración y Metadatos

#### 1. [`package.json`](file:///c:/Users/VICTUS/Documents/geopet_serve/package.json)
* **Línea 2:** `"name": "pet-book-server",`
  * **Contexto:** Nombre del paquete npm del servidor.
  * **Impacto:** Bajo / Cosmético. No afecta la lógica de ejecución del servidor.
* **Línea 4:** `"description": "Backend Monolítico Modular para PetBook",`
  * **Contexto:** Descripción informativa del proyecto.
  * **Impacto:** Nulo (texto descriptivo).
* **Línea 29:** `"petbook"`
  * **Contexto:** Etiqueta en el arreglo de `keywords`.
  * **Impacto:** Nulo (metadato).

#### 2. [`package-lock.json`](file:///c:/Users/VICTUS/Documents/geopet_serve/package-lock.json)
* **Líneas 2 y 8:** `"name": "pet-book-server",`
  * **Contexto:** Metadato de bloqueo de dependencias npm.
  * **Impacto:** Bajo. Se actualizará en conjunto con `package.json`.

#### 3. [`docker-compose.yml`](file:///c:/Users/VICTUS/Documents/geopet_serve/docker-compose.yml)
* **Línea 6:** `container_name: petbook-server`
  * **Contexto:** Nombre del contenedor Docker asignado al servicio de la aplicación Express.
  * **Impacto:** Bajo. Solo afecta el nombre visible del contenedor en Docker (`docker ps`).
* **Línea 12:** `- MONGO_URI=${MONGO_URI:-mongodb://mongo:27017/bd_petbook}`
  * **Contexto:** Variable de entorno con valor de respaldo si `MONGO_URI` no se define en el host.
  * **Impacto:** **Medio**. Si alguien levanta Docker sin `.env`, crearía una base de datos llamada `bd_petbook` en lugar de `bd_geopet`.
* **Línea 25:** `container_name: petbook-mongodb`
  * **Contexto:** Nombre del contenedor Docker asignado a la base de datos MongoDB.
  * **Impacto:** Bajo. Solo afecta el nombre visible del contenedor en Docker.

---

### B. Rutas y Lógica de la Aplicación

#### 4. [`src/app.js`](file:///c:/Users/VICTUS/Documents/geopet_serve/src/app.js)
* **Línea 68:** `service: 'pet-book-server (Modular Monolith)'`
  * **Contexto:** Objeto JSON de respuesta en el endpoint público de verificación de salud `GET /health`:
    ```javascript
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'pet-book-server (Modular Monolith)'
        });
    });
    ```
  * **Impacto:** **Medio (Afecta Tests)**. Modificar esta propiedad sin actualizar su prueba unitaria romperá la suite `tests/routes.test.js`.

#### 5. [`src/modules/users/user.controller.js`](file:///c:/Users/VICTUS/Documents/geopet_serve/src/modules/users/user.controller.js)
* **Línea 50:**
  ```javascript
  if (error.code === 11000 && error.keyPattern && error.keyPattern.ci) {
      res.status(400).json({ message: 'Ya existe un usuario en PetBook con ese número de identificación' });
  ```
  * **Contexto:** Mensaje de error retornado al cliente cuando se intenta registrar una cédula ecuatoriana ya existente.
  * **Impacto:** Bajo / Interfaz de usuario. Es un mensaje directo al usuario final; actualizarlo a `GeoPet` mejora la coherencia de marca.

---

### C. Configuración de Base de Datos

#### 6. [`src/config/db.js`](file:///c:/Users/VICTUS/Documents/geopet_serve/src/config/db.js)
* **Línea 4:** `const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bd_petbook';`
  * **Contexto:** URI de fallback en caso de que la variable de entorno `MONGO_URI` no exista en el entorno de ejecución.
  * **Impacto:** **Medio**. Actualmente, el archivo [`.env`](file:///c:/Users/VICTUS/Documents/geopet_serve/.env) define explícitamente `MONGO_URI` apuntando a `bd_geopet`. Sin embargo, si se corre el servidor sin `.env` (o en testing sin variables inyectadas), se conectaría a `bd_petbook`. Debe armonizarse a `bd_geopet`.

---

### D. Pruebas Automatizadas y Secretos Heredados

#### 7. [`tests/routes.test.js`](file:///c:/Users/VICTUS/Documents/geopet_serve/tests/routes.test.js)
* **Línea 9:**
  ```javascript
  expect(response.body.service).toBe('pet-book-server (Modular Monolith)');
  ```
  * **Contexto:** Aserción de Jest que valida la respuesta del endpoint `GET /health`.
  * **Impacto:** **Directo en Pruebas**. Debe cambiarse en simultáneo con `src/app.js` a `'geopet-server (Modular Monolith)'` para mantener el 100% de la suite en verde.

#### 8. Fallback de Secreto JWT en Pruebas Unitarias (`'fabricio29'`)
* **[`tests/users.test.js`](file:///c:/Users/VICTUS/Documents/geopet_serve/tests/users.test.js)** (Línea 8):
  `const jwtSecret = process.env.JWT_SECRET || 'fabricio29';`
* **[`tests/sightings.test.js`](file:///c:/Users/VICTUS/Documents/geopet_serve/tests/sightings.test.js)** (Línea 10):
  `const jwtSecret = process.env.JWT_SECRET || 'fabricio29';`
* **[`tests/security.test.js`](file:///c:/Users/VICTUS/Documents/geopet_serve/tests/security.test.js)** (Línea 96):
  `process.env.JWT_SECRET || 'fabricio29'`
* **Contexto:** Clave secreta fija de respaldo usada para firmar tokens JWT simulados en los tests si `process.env.JWT_SECRET` no está presente.
* **Impacto:** **Seguridad / Coherencia**. En el `.env` el secreto real de la app es `ronalth_geo_pet`. Cambiar este fallback por un identificador representativo (`geopet_test_secret` o `ronalth_geo_pet`) elimina rastros personales y unifica el estándar del proyecto.

---

## 3. Matriz de Riesgo e Impacto

| Archivo | Tipo de Hallazgo | ¿Afecta Lógica de Ejecución? | Riesgo de Regresión | Acción Recomendada |
| :--- | :--- | :---: | :---: | :--- |
| `src/app.js` | Endpoint `/health` | **Sí** (en contrato con test) | Medio | Actualizar junto con `tests/routes.test.js` |
| `tests/routes.test.js` | Test de `/health` | **Sí** (aserción de Jest) | Medio | Sincronizar string esperado |
| `src/config/db.js` | Fallback URI Mongo | **Sí** (si no hay `.env`) | Medio | Cambiar `bd_petbook` por `bd_geopet` |
| `docker-compose.yml` | Fallback URI & Container | Bajo (solo Docker) | Bajo | Cambiar nombres y fallback a `geopet` |
| `src/modules/users/user.controller.js`| Mensaje de error CI | No (solo texto de UI) | Nulo | Cambiar `PetBook` por `GeoPet` |
| `package.json` | Nombre y descripción | No | Nulo | Cambiar `pet-book-server` a `geopet-server` |
| `package-lock.json` | Nombre de paquete | No | Nulo | Regenerar o sincronizar |
| `tests/*.test.js` | Fallback JWT `fabricio29` | No (solo fallback en tests)| Bajo | Cambiar por `geopet_jwt_secret_test` |

---

## 4. Plan de Acción Preliminar (Migración Segura a GeoPet)

Cuando se autorice la ejecución, se recomienda aplicar los cambios siguiendo este orden estricto para evitar roturas:

1. **Paso 1: Sincronización del Endpoint `/health` y su Prueba**:
   - En `src/app.js`: cambiar `service: 'geopet-server (Modular Monolith)'`.
   - En `tests/routes.test.js`: cambiar `expect(response.body.service).toBe('geopet-server (Modular Monolith)');`.
   - Ejecutar `npx jest tests/routes.test.js` para asegurar verde inmediato.

2. **Paso 2: Unificación de la Base de Datos por Defecto**:
   - En `src/config/db.js`: cambiar `'mongodb://127.0.0.1:27017/bd_petbook'` a `'mongodb://127.0.0.1:27017/bd_geopet'`.
   - En `docker-compose.yml`: cambiar `bd_petbook` a `bd_geopet`, y renombrar los contenedores a `geopet-server` y `geopet-mongodb`.

3. **Paso 3: Mensaje al Usuario y Metadatos**:
   - En `src/modules/users/user.controller.js`: cambiar `Ya existe un usuario en PetBook...` por `Ya existe un usuario en GeoPet...`.
   - En `package.json`: cambiar name a `"geopet-server"`, description a `"Backend Monolítico Modular para GeoPet"` y keyword a `"geopet"`.

4. **Paso 4: Limpieza de Claves de Respaldo en Tests**:
   - En `tests/users.test.js`, `tests/sightings.test.js` y `tests/security.test.js`: reemplazar `'fabricio29'` por `'geopet_test_secret'`.

5. **Paso 5: Verificación Integral**:
   - Ejecutar `npm test` en `geopet_serve` para certificar que las 6 suites y 44 pruebas continúen 100% en verde.
