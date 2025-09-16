const express = require("express");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
app.use(bodyParser.json());

const SECRET_KEY = "miclaveultrasecreta";
let productos = [
   { id: 1, name: 'Zapatillas', price: 79.9, stock: 10, color: blue, brand: Essence },
   { id: 2, name: 'Camiseta', price: 19.9, stock: 50, color: white, brand: Ess }
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
 *               color:
 *                 type: string
 *                 example: black
 *               brand:
 *                 type: string
 *                 example: bce
 *     responses:
 *       201:
 *         description: Producto creado
 */
app.get("/productos", (req, res) => {
  res.json(productos);
});

app.post("/productos", verificarToken, (req, res) => {
  const { name, price, stock, color, brand } = req.body;
  const nuevoProducto = { id: productos.length + 1, name, price, stock, color, brand};
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
 *               color:
 *                 type: string
 *                 example: black
 *               brand:
 *                 type: string
 *                 example: nice
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
  const { name, price, stock, color, brand } = req.body;
  const producto = productos.find((p) => p.id == id);
  if (!producto) return res.status(404).json({ message: "Producto no encontrado" });
  producto.name = name;
  producto.price = price;
  producto.stock = stock;
  producto.color = color;
  producto.brand = brand;
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
// Página de inicio con criterios del parcial
app.get("/", (req, res) => {
  res.send(`
    <h1>API de Productos con Auth (JWT)</h1>
    <p><b>Criterios del parcial:</b></p>
    <ul style="list-style: none;">
      <li>1️⃣ Crear la colección en Postman.</li>
      <li>2️⃣ Configurar variables de entorno para: <code>username</code> y <code>password</code>.</li>
      <li>3️⃣ Crear el script de prueba (<i>Tests</i>) en la solicitud <b>"Token"</b> para capturar el token de la respuesta y almacenarlo en una variable de entorno llamada <code>authToken</code>.</li>
      <li>4️⃣ Ejecutar el flujo de trabajo de API con los métodos: Create, Read, Update y Delete (CRUD).</li>
      <li>5️⃣ Escribir scripts de prueba (<i>Tests</i>) para validar los campos: <code>id</code>, <code>name</code>, <code>price</code>, <code>stock</code>, <code>color</code> y <code>brand</code>, y guardar sus valores en variables de entorno.</li>
      <li>6️⃣ Utilizar variables aleatorias para el campo <code>color</code>.</li>
      <li>7️⃣ Emplear tanto variables de entorno como variables dinámicas de Postman en las solicitudes.</li>
      <li>8️⃣ Generar un reporte de ejecución utilizando Newman.</li>
      <li>9️⃣ Verificar que el código de estado sea <b>200</b> o <b>201</b> en todas las solicitudes.</li>
      <li>🔟 Validar que en las variables de entorno se almacenen correctamente los datos modificados del producto.</li>
    </ul>
    '<p>👉 Documentación interactiva (Swagger UI): <a href="https://api-productos-jwt.onrender.com/api-docs">https://api-productos-jwt.onrender.com/api-docs</a></p>' +
    '<p>📧 Entregar: Deben enviar las colecciones de Postman (.json) y el archivo generado del reporte de Newman (.html o .json) al correo: <a href="mailto:lriano@unisangil.edu.co">lriano@unisangil.edu.co</a></p>' +
    '<hr>' +
    <p>👉 Endpoints disponibles:</p>
    <ul>
      <li><code>POST /auth</code> → obtener token</li>
      <li><code>GET /products</code> → listar productos</li>
      <li><code>GET /products/:id</code> → detalle producto</li>
      <li><code>POST /products</code> → crear producto (requiere token)</li>
      <li><code>PUT /products/:id</code> → actualizar producto (requiere token)</li>
      <li><code>DELETE /products/:id</code> → eliminar producto (requiere token)</li>
    </ul>
    <hr>
    <p>ℹ️ Usa Postman para interactuar con la API. </p>
  `);
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
