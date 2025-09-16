// product-api-express-jwt.js
// Ejemplo de API REST para "productos" con autenticación mediante token (JWT)
// Requisitos: Node.js 18+ (o similar)

/**
 * Instrucciones rápidas:
 * 1) Crear carpeta y archivo:
 *    mkdir product-api && cd product-api
 *    npm init -y
 * 2) Instalar dependencias:
 *    npm install express jsonwebtoken body-parser cors
 *    (opcional: npm install -D nodemon)
 * 3) Copiar este archivo como product-api-express-jwt.js
 * 4) Ejecutar:
 *    node product-api-express-jwt.js
 *    (o con nodemon: npx nodemon product-api-express-jwt.js)
 * 5) Probar en Postman / curl usando los ejemplos abajo.
 */

const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- Configuración simple ---
const PORT = process.env.PORT || 3000;


const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_123';
const TOKEN_EXPIRATION = '1h'; // o '7d' según prefieras

// Credenciales de ejemplo (en un proyecto real usar DB y hashed passwords)
const USERS = [
  { id: 1, username: 'emilys', password: 'emilyspass', role: 'admin' },
  { id: 2, username: 'emilys', password: 'emilyspass', role: 'user' }
];

// Datos en memoria (para pruebas); en producción usar una DB
let products = [
  { id: 1, name: 'Zapatillas', price: 79.9, stock: 10 },
  { id: 2, name: 'Camiseta', price: 19.9, stock: 50 }
];
let nextProductId = 3;

// --- Helper: generar token ---
function generateToken(user) {
  // Payload mínimo: id, username, role
  const payload = { id: user.id, username: user.username, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
}

// --- Ruta de autenticación (similar a Restful-Booker) ---
// POST /auth  --> { username, password }  devuelve { token }
app.post('/auth', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username y password son requeridos' });

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
    req.user = user; // payload del token
    next();
  });
}

// --- Endpoints CRUD para productos ---
// GET /products            -> listar (público)
// GET /products/:id        -> detalle (público)
// POST /products           -> crear (requiere token)
// PUT /products/:id        -> actualizar (requiere token)
// DELETE /products/:id     -> eliminar (requiere token)

// Listar (público)
app.get('/products', (req, res) => {
  res.json(products);
});

// Detalle (público)
app.get('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const p = products.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(p);
});

// Crear (protegido)
app.post('/products', authenticateToken, (req, res) => {
  const { name, price, stock } = req.body || {};
  if (!name || price == null || stock == null) return res.status(400).json({ error: 'name, price y stock son requeridos' });

  const newProduct = { id: nextProductId++, name, price: Number(price), stock: Number(stock) };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// Actualizar (protegido)
app.put('/products/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  const pIndex = products.findIndex(x => x.id === id);
  if (pIndex === -1) return res.status(404).json({ error: 'Producto no encontrado' });

  const { name, price, stock } = req.body || {};
  const updated = Object.assign({}, products[pIndex]);
  if (name !== undefined) updated.name = name;
  if (price !== undefined) updated.price = Number(price);
  if (stock !== undefined) updated.stock = Number(stock);

  products[pIndex] = updated;
  res.json(updated);
});

// Eliminar (protegido)
app.delete('/products/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  const pIndex = products.findIndex(x => x.id === id);
  if (pIndex === -1) return res.status(404).json({ error: 'Producto no encontrado' });
  const removed = products.splice(pIndex, 1)[0];
  res.json({ deleted: removed });
});

// --- Servidor ---
app.listen(PORT, () => {
  console.log(`API de productos con auth corriendo en http://localhost:${PORT}`);
  console.log(`Usuario de prueba: admin / password123 -> POST /auth devuelve token`);
});

/*
Ejemplos curl para Postman / terminal:

1) Obtener token (igual que el ejemplo que mostraste):

curl -X POST http://localhost:3000/auth \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"password123"}'

Respuesta: { "token": "eyJ..." }

2) Crear producto (usar token obtenido):

curl -X POST http://localhost:3000/products \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' \
  -d '{"name":"Gorra","price":12.5,"stock":30}'

3) Listar productos (público):

curl http://localhost:3000/products

4) Actualizar:

curl -X PUT http://localhost:3000/products/1 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' \
  -d '{"price":99.9}'

5) Eliminar:

curl -X DELETE http://localhost:3000/products/2 \
  -H 'Authorization: Bearer <TOKEN>'

Notas / mejoras sugeridas:
- Para persistencia entre reinicios usa una DB (SQLite, Postgres, MongoDB) o un archivo JSON con lowdb.
- Guarda contraseñas hasheadas (bcrypt) y no en plano.
- Configura HTTPS en producción y un secreto JWT seguro en variables de entorno.
- Control de roles: hoy cualquier usuario con token puede crear/editar; puedes restringir por role (ej: only admin).
*/
