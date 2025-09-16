const express = require("express");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
app.use(bodyParser.json());

const SECRET_KEY = "miclaveultrasecreta";
let productos = [
   { id: 1, name: 'Zapatillas', price: 79.9, stock: 10 },
   { id: 2, name: 'Camiseta', price: 19.9, stock: 50 }
];

// ================== AUTENTICACIÓN ==================
/**
 * @swagger
 * /auth:
 *   post:
 *     summary: Crear token de autenticación
 *     description: Retorna un token JWT si el usuario y contraseña son correctos.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: emilys
 *               password:
 *                 type: string
 *                 example: emilyspass
 *     responses:
 *       200:
 *         description: Token generado
 */
app.post("/auth", (req, res) => {
  const { username, password } = req.body;
  if (username === "emilys" && password === "emilyspass") {
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "10m" });
    return res.json({ token });
  }
  res.status(401).json({ message: "Credenciales inválidas" });
});

// Middleware para verificar token
function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.sendStatus(403);
  const token = authHeader.split(" ")[1];
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// ================== CRUD PRODUCTOS ==================
/**
 * @swagger
 * /productos:
 *   get:
 *     summary: Listar todos los productos
 *     responses:
 *       200:
 *         description: Lista de productos
 *
 *   post:
 *     summary: Crear un nuevo producto
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: blusa
 *               price:
 *                 type: number
 *                 example: 100
 *               stock:
 *                 type: number
 *                 example: 15
 *     responses:
 *       201:
 *         description: Producto creado
 */
app.get("/productos", (req, res) => {
  res.json(productos);
});

app.post("/productos", verificarToken, (req, res) => {
  const { name, price, stock } = req.body;
  const nuevoProducto = { id: productos.length + 1, name, price, stock };
  productos.push(nuevoProducto);
  res.status(201).json(nuevoProducto);
});

/**
 * @swagger
 * /productos/{id}:
 *   put:
 *     summary: Actualizar un producto por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: tenis
 *               price:
 *                 type: number
 *                 example: 300
 *               stock:
 *                 type: number
 *                 example: 5
 *     responses:
 *       200:
 *         description: Producto actualizado
 *
 *   delete:
 *     summary: Eliminar un producto por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Producto eliminado
 */
app.put("/productos/:id", verificarToken, (req, res) => {
  const { id } = req.params;
  const { name, price, stock } = req.body;
  const producto = productos.find((p) => p.id == id);
  if (!producto) return res.status(404).json({ message: "Producto no encontrado" });
  producto.name = name;
  producto.price = price;
  producto.stock = stock;
  res.json(producto);
});

app.delete("/productos/:id", verificarToken, (req, res) => {
  const { id } = req.params;
  productos = productos.filter((p) => p.id != id);
  res.json({ message: "Producto eliminado" });
});

// ================== SWAGGER CONFIG ==================
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Productos con JWT",
      version: "1.0.0",
      description: "API de ejemplo con autenticación JWT para prácticas",
    },
    servers: [
      {
        url: "https://api-productos-jwt.onrender.com", // 🔹 tu dominio de Render
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./api_productos_con_auth_express_jwt.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ================== INICIO SERVIDOR ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
