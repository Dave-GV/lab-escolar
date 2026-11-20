import mysql from 'mysql2/promise';

// Toda la configuración de la conexión vive en backend/.env
const requeridas = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const faltantes = requeridas.filter((v) => !process.env[v]);
if (faltantes.length) {
  console.error(`❌ Faltan variables en .env: ${faltantes.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET debe tener al menos 32 caracteres');
  process.exit(1);
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // las fechas llegan como 'YYYY-MM-DD' (sin corrimiento de zona horaria)
  multipleStatements: false, // evita que una inyección encadene sentencias
});

export async function verificarConexion() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}
