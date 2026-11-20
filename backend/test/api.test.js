// Pruebas automáticas de la API (runner nativo de Node: node --test)
// Requisitos: MariaDB encendido y haber ejecutado `npm run seed`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { pool } from '../src/config/db.js';

let server;
let BASE;
const sufijo = Date.now().toString(36);
const creados = { usuarios: [], maestros: [], materias: [] };

async function api(ruta, { metodo = 'GET', cuerpo, cookie } = {}) {
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: {
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await res.text();
  return { res, status: res.status, datos: texto ? JSON.parse(texto) : null };
}

async function login(username, password) {
  const r = await api('/api/auth/login', { metodo: 'POST', cuerpo: { username, password } });
  const setCookie = r.res.headers.getSetCookie()[0] ?? '';
  return { ...r, setCookie, cookie: setCookie.split(';')[0] };
}

let cookieAdmin;

before(async () => {
  server = app.listen(0);
  await new Promise((ok) => server.once('listening', ok));
  BASE = `http://127.0.0.1:${server.address().port}`;
  // Por si una corrida anterior dejó bloqueado al Admin
  await pool.query("UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE username = 'Admin'");
  cookieAdmin = (await login('Admin', '$3cr3t')).cookie;
});

after(async () => {
  for (const id of creados.materias) await pool.query('DELETE FROM materias WHERE id = ?', [id]);
  for (const id of creados.maestros) await pool.query('DELETE FROM maestros WHERE id = ?', [id]);
  for (const id of creados.usuarios) await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
  await new Promise((ok) => server.close(ok));
  await pool.end();
});

test('1. Login correcto entrega cookie httpOnly y SameSite=Strict sin exponer el hash', async () => {
  const r = await login('Admin', '$3cr3t');
  assert.equal(r.status, 200);
  assert.match(r.setCookie, /^lab_token=/);
  assert.match(r.setCookie, /HttpOnly/i);
  assert.match(r.setCookie, /SameSite=Strict/i);
  assert.equal(r.datos.usuario.rol, 'admin');
  assert.equal(r.datos.usuario.password_hash, undefined);
});

test('2. Contraseña incorrecta y usuario inexistente dan el mismo mensaje genérico', async () => {
  const mala = await login('Root', 'incorrecta');
  const inexistente = await login(`nadie_${sufijo}`, 'loquesea');
  assert.equal(mala.status, 401);
  assert.equal(inexistente.status, 401);
  assert.equal(mala.datos.error, inexistente.datos.error);
  await pool.query("UPDATE usuarios SET intentos_fallidos = 0 WHERE username = 'Root'");
});

test("3. Inyección SQL en el login (' OR '1'='1) es rechazada", async () => {
  const r = await login("' OR '1'='1", "' OR '1'='1");
  assert.equal(r.status, 401);
  assert.equal(r.setCookie, '');
});

test('4. Sin sesión o con token falsificado no hay acceso', async () => {
  assert.equal((await api('/api/alumnos')).status, 401);
  const falso = 'lab_token=eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIiwicm9sIjoiYWRtaW4ifQ.';
  assert.equal((await api('/api/alumnos', { cookie: falso })).status, 401);
});

test('5. Cabeceras de seguridad de Helmet presentes y errores sin stack trace', async () => {
  const r = await api('/api/no-existe');
  assert.equal(r.status, 404);
  assert.equal(r.res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(r.res.headers.get('content-security-policy'));
  assert.equal(r.res.headers.get('x-powered-by'), null);
  const malJson = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{malo',
  });
  const cuerpo = await malJson.text();
  assert.equal(malJson.status, 400);
  assert.doesNotMatch(cuerpo, /at .*\.js/);
});

test('6. El admin crea usuarios, pero "rol":"admin" se ignora (sin escalar privilegios)', async () => {
  const r = await api('/api/usuarios', {
    metodo: 'POST',
    cookie: cookieAdmin,
    cuerpo: { nombre: 'Prueba', username: `prueba_${sufijo}`, password: 'Prueba#2026', rol: 'admin' },
  });
  assert.equal(r.status, 201);
  creados.usuarios.push(r.datos.id);
  assert.equal(r.datos.rol, 'usuario');
});

test('7. La política de contraseñas rechaza "123"', async () => {
  const r = await api('/api/usuarios', {
    metodo: 'POST',
    cookie: cookieAdmin,
    cuerpo: { nombre: 'Débil', username: `debil_${sufijo}`, password: '123' },
  });
  assert.equal(r.status, 400);
  assert.ok(r.datos.detalles.some((d) => d.campo === 'password'));
});

test('8. Un usuario normal recibe 403 en /api/usuarios pero sí puede usar los catálogos', async () => {
  const { cookie } = await login(`prueba_${sufijo}`, 'Prueba#2026');
  assert.equal((await api('/api/usuarios', { cookie })).status, 403);
  assert.equal((await api('/api/alumnos', { cookie })).status, 200);
});

test('9. La base de datos impide un tercer administrador (trigger)', async () => {
  await assert.rejects(
    pool.query(
      "INSERT INTO usuarios (nombre, username, password_hash, rol) VALUES ('X', ?, 'x', 'admin')",
      [`x_${sufijo}`],
    ),
    (err) => err.code === 'ER_SIGNAL_EXCEPTION' && /dos administradores/.test(err.sqlMessage),
  );
  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'admin'");
  assert.equal(total, 2);
});

test('10. Los administradores no se pueden borrar ni por la API ni en la BD', async () => {
  const [[root]] = await pool.query("SELECT id FROM usuarios WHERE username = 'Root'");
  const r = await api(`/api/usuarios/${root.id}`, { metodo: 'DELETE', cookie: cookieAdmin });
  assert.equal(r.status, 403);
  await assert.rejects(
    pool.query('DELETE FROM usuarios WHERE id = ?', [root.id]),
    (err) => err.code === 'ER_SIGNAL_EXCEPTION',
  );
  await assert.rejects(
    pool.query("UPDATE usuarios SET rol = 'usuario' WHERE id = ?", [root.id]),
    (err) => err.code === 'ER_SIGNAL_EXCEPTION',
  );
});

test('11. CRUD completo de maestros (crear, leer, actualizar, eliminar)', async () => {
  const datos = { nombre: 'Temporal', apellidos: 'De Prueba', email: `temp_${sufijo}@escuela.local` };
  const c = await api('/api/maestros', { metodo: 'POST', cookie: cookieAdmin, cuerpo: datos });
  assert.equal(c.status, 201);
  const id = c.datos.id;

  const l = await api(`/api/maestros/${id}`, { cookie: cookieAdmin });
  assert.equal(l.datos.email, datos.email);

  const u = await api(`/api/maestros/${id}`, {
    metodo: 'PUT', cookie: cookieAdmin, cuerpo: { ...datos, especialidad: 'Física' },
  });
  assert.equal(u.status, 200);
  assert.equal(u.datos.especialidad, 'Física');

  const d = await api(`/api/maestros/${id}`, { metodo: 'DELETE', cookie: cookieAdmin });
  assert.equal(d.status, 204);
  assert.equal((await api(`/api/maestros/${id}`, { cookie: cookieAdmin })).status, 404);
});

test('12. Integridad referencial: no se borra un maestro con materias asignadas', async () => {
  const m = await api('/api/maestros', {
    metodo: 'POST', cookie: cookieAdmin,
    cuerpo: { nombre: 'Con', apellidos: 'Materia', email: `fk_${sufijo}@escuela.local` },
  });
  creados.maestros.push(m.datos.id);
  const mat = await api('/api/materias', {
    metodo: 'POST', cookie: cookieAdmin,
    cuerpo: { clave: `T${sufijo}`.slice(0, 20), nombre: 'Materia temporal', creditos: 4, maestro_id: m.datos.id },
  });
  assert.equal(mat.status, 201);
  creados.materias.push(mat.datos.id);

  const d = await api(`/api/maestros/${m.datos.id}`, { metodo: 'DELETE', cookie: cookieAdmin });
  assert.equal(d.status, 409);

  const inexistente = await api('/api/materias', {
    metodo: 'POST', cookie: cookieAdmin,
    cuerpo: { clave: `X${sufijo}`.slice(0, 20), nombre: 'Sin maestro', creditos: 4, maestro_id: 999999 },
  });
  assert.equal(inexistente.status, 400);
});

test('13. La cuenta se bloquea (423) tras 5 contraseñas incorrectas', async () => {
  const username = `bloqueo_${sufijo}`;
  const c = await api('/api/usuarios', {
    metodo: 'POST', cookie: cookieAdmin,
    cuerpo: { nombre: 'Bloqueo', username, password: 'Bloqueo#2026' },
  });
  creados.usuarios.push(c.datos.id);

  const estados = [];
  for (let i = 0; i < 5; i++) estados.push((await login(username, 'Equivocada#1')).status);
  assert.deepEqual(estados, [401, 401, 401, 401, 423]);

  // Ni siquiera la contraseña correcta funciona mientras está bloqueada
  assert.equal((await login(username, 'Bloqueo#2026')).status, 423);
});
