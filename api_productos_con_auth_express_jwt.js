// api_productos_con_auth_express_jwt.js
// Ejemplo de API REST para "productos" con autenticación mediante token (JWT)
// con documentación Swagger incluida.

const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// --- Swagger ---
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- Configuración simple ---
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_123';
const TOKEN_EXPIRATION = '1h';

// Credenciales de ejemplo
const USERS = [
  { id: 1, username: 'admin', password: 'password123', role: 'admin' }
];

// Datos en memoria
let products = [
  { id: 1, name: 'Zapatillas', price: 79.9, stock: 10 },
  { id: 2, name: 'Camiseta', price: 19.9, stock: 50 }
];
let nextProductId = 3;

// --- Helper: generar token ---
function generateToken(user) {
  const payload = { id: user.id, username: user.username, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
}

// --- Ruta de autenticación ---
/**
 * @openapi
 * /auth:
 *   post:
 *     summary: Obtener token de autenticación
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Devuelve el token JWT
 */
app.post('/auth', (req, res) => {
  const { username, password } = req.body || {};
  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  const token = generateToken(user);
  res.json({ token });
});

// --- Middleware para proteger rutas ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No se encontró el header Authorization' });

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Formato de Authorization: Bearer <token>' });

  const token = parts[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
}

// --- Endpoints CRUD para productos ---
/**
 * @openapi
 * /products:
 *   get:
 *     summary: Listar todos los productos
 *     tags: [Productos]
 *     responses:
 *       200:
 *         description: Lista de productos
 */
app.get('/products', (req, res) => {
  res.json(products);
});

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Obtener producto por ID
 *     tags: [Productos]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Producto encontrado
 */
app.get('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const p = products.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(p);
});

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Crear un nuevo producto
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
app.post('/products', authenticateToken, (req, res) => {
  const { name, price, stock } = req.body || {};
  if (!name || price == null || stock == null) return res.status(400).json({ error: 'name, price y stock son requeridos' });

  const newProduct = { id: nextProductId++, name, price: Number(price), stock: Number(stock) };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     summary: Actualizar producto existente
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
app.put('/products/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  const pIndex = products.findIndex(x => x.id === id);
  if (pIndex === -1) return res.status(404).json({ error: 'Producto no encontrado' });

  const { name, price, stock } = req.body || {};
  const updated = { ...products[pIndex], name, price, stock };
  products[pIndex] = updated;
  res.json(updated);
});

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     summary: Eliminar producto
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
app.delete('/products/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  const pIndex = products.findIndex(x => x.id === id);
  if (pIndex === -1) return res.status(404).json({ error: 'Producto no encontrado' });
  const removed = products.splice(pIndex, 1)[0];
  res.json({ deleted: removed });
});

// --- Swagger config ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Productos con JWT',
      version: '1.0.0',
      description: 'Documentación de la API para prácticas con autenticación JWT'
    },
    servers: [
      { url: 'https://api-productos-jwt.onrender.com' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [__filename], // este mismo archivo
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Ruta raíz ---
app.get('/', (req, res) => {
  res.send('<h1>API de Productos con JWT</h1><p>Visita <a href="/docs">/docs</a> para ver la documentación interactiva.</p>');
});

// --- Servidor ---
app.listen(PORT, () => {
  console.log(`API de productos corriendo en http://localhost:${PORT}`);
});
