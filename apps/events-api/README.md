# events-api

The public-facing service: event browsing, seat maps, and booking creation with Redis-backed atomic seat locking. Guest checkout is supported (JWT is optional here, not required).

## Run locally
```bash
cp .env.example .env
npm run start:dev
```

Runs on **http://localhost:4000**. Swagger docs at `/api/docs`.

See the [root README](../../README.md) for full project setup.
