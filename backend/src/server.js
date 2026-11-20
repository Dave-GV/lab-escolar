import app from './app.js';
import { pool, verificarConexion } from './config/db.js';

const PORT = Number(process.env.PORT) || 3000;

try {
  await verificarConexion();
  console.log('✅ Conectado a MariaDB');
} catch (err) {
  console.error(`❌ No se pudo conectar a MariaDB: ${err.code ?? err.message}`);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(`🚀 API escuchando en http://localhost:${PORT}`);
});

// Cierre ordenado (Ctrl + C)
for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    server.close(() => pool.end().finally(() => process.exit(0)));
  });
}
