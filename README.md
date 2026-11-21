# Kanan

Estructura inicial del proyecto Kanan, preparada para trabajar con PostgreSQL, MongoDB y Neo4j.

## Requisitos previos

- Docker Engine o Docker Desktop con Docker Compose v2 (`docker compose`).
- Git (opcional, para clonar y versionar el proyecto).

## Configuración local

Desde la carpeta `kanan`, copia el archivo de ejemplo para crear tu configuración local:

```bash
cp .env.example .env
```

En Windows PowerShell puedes usar:

```powershell
Copy-Item .env.example .env
```

Los valores incluidos son únicamente para desarrollo local. Ajusta `.env` si necesitas otros puertos o credenciales; no uses estas contraseñas en producción.

## Iniciar las bases de datos

Desde la carpeta `kanan`, ejecuta:

```bash
docker compose up -d
```

Compose descargará las imágenes y arrancará los tres servicios con volúmenes persistentes. PostgreSQL ejecuta los archivos SQL presentes en `database/relational/schema` al inicializar por primera vez su volumen.

Para revisar el estado:

```bash
docker compose ps
```

Para detener los servicios sin eliminar los datos:

```bash
docker compose down
```

## Puertos locales

- PostgreSQL: `5432`
- MongoDB: `27017`
- Neo4j Browser: `7474`
- Neo4j Bolt: `7687`
- Puerto reservado para el backend: `8000` (configurable con `BACKEND_PORT`)

## Estructura

- `docs/`: propuesta, modelos, arquitectura y decisiones tecnológicas.
- `database/`: esquemas, datos y consultas para las bases relacional, documental y de grafos.
- `backend/`: código fuente, configuración, repositorios y pruebas.
- `frontend/`: pruebas organizadas por nivel.
