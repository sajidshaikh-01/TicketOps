# bookings-worker

A background processor (no public API beyond `/health` and `/ready`). Consumes the Redis booking queue, generates QR codes, records confirmation notifications, marks bookings CONFIRMED, and releases seat locks. Runs a reconciliation sweep every 30 seconds to catch any job Redis ever drops.

## Run locally
```bash
cp .env.example .env
npm run start:dev
```

Health endpoints on **http://localhost:4002**.

See the [root README](../../README.md) for full project setup.
