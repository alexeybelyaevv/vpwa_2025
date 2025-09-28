# VPWA 2025

## Local development with Docker

The project ships with a Docker Compose stack that starts PostgreSQL, the AdonisJS backend, and the Quasar frontend with hot-reload.

### Prerequisites
- Docker Engine 24+
- Docker Compose V2 (bundled with modern Docker Desktop)

### First run
```bash
make up
```
The `up` target builds the frontend and backend dev images, installs dependencies, creates dedicated `node_modules` volumes, and starts all services:
- PostgreSQL on port 5432
- Backend API on http://localhost:3333
- Frontend dev server on http://localhost:9000

Changes in `backend/` or `frontend/` are live-reloaded thanks to bind mounts.

### Environment variables
Customize `.env.backend` and `.env.frontend` as needed before running the stack. Defaults are suitable for local development.

### Useful commands
- Rebuild backend and frontend images:
  ```bash
  make build
  ```
- Start in detached mode:
  ```bash
  make up-detached
  ```
- Follow service logs:
  ```bash
  make logs
  ```
- Stop the stack:
  ```bash
  make down
  ```
- Reset PostgreSQL data (destroys local DB data):
  ```bash
  make reset
  ```
