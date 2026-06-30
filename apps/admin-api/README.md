# admin-api

Owns authentication (register/login/refresh/logout with JWT access + rotating refresh tokens), RBAC, event management, and booking/dashboard administration for ADMIN and ORGANIZER roles.

## Run locally
```bash
cp .env.example .env
npm run start:dev
```

Runs on **http://localhost:4001**. Swagger docs at `/api/docs`.

`JWT_ACCESS_SECRET` must match the value in `events-api/.env`, since tokens issued here are verified there.

See the [root README](../../README.md) for full project setup.
