# Laboratorio: Sistema Escolar (Node.js + React + MariaDB)

## Notas de esta instalación

- **Node 22** (vía nvm): `nvm use 22` antes de cualquier `npm`. El Node por defecto del equipo es v16 y no soporta `--env-file`.
- **MariaDB de Homebrew en el puerto 3307**: el 3306 lo ocupa el contenedor Docker `mariadb_db`.
  La configuración está en `/opt/homebrew/etc/my.cnf.d/lab-escolar.cnf` y `backend/.env` usa `DB_PORT=3307`.
- En Homebrew tu usuario de macOS es administrador de MariaDB, así que `mariadb` funciona sin `sudo`.

## Arranque

```bash
# Terminal 1 — backend
cd backend
nvm use 22
mariadb < database/schema.sql   # solo la primera vez
npm run seed                    # crea Admin / Root y datos de ejemplo
npm run dev                     # http://localhost:3000
npm test                        # 13 pruebas

# Terminal 2 — frontend
cd frontend
nvm use 22
npm run dev                     # http://localhost:5173
```

Credenciales: `Admin` / `$3cr3t` y `Root` / `W@t@SHi09`.
