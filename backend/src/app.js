import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import catalogosRoutes from './routes/catalogos.routes.js';
import { manejarErrores, noEncontrado } from './middleware/errores.js';
import { DIR_UPLOADS } from './middleware/subida.js';

const app = express();

// Cabeceras de seguridad: CSP, nosniff, frame-options, HSTS, etc.
app.use(helmet());
app.disable('x-powered-by');

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Fotos de perfil (solo archivos, sin listado de carpeta)
app.use('/uploads', express.static(DIR_UPLOADS, {
  index: false,
  dotfiles: 'deny',
  maxAge: '1d',
}));

app.get('/api/salud', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api', catalogosRoutes);

app.use(noEncontrado);
app.use(manejarErrores);

export default app;
