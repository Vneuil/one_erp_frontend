# Full-stack end-to-end tests

These run against a **real backend and database**, not mocks. They create their
own company through the public registration endpoint, so they need a scratch
database and never touch real data.

```bash
# 1. scratch database (Postgres running locally)
createdb one_e2e

# 2. backend (apps/one-backend)
DB_HOST=localhost DB_USER=$USER DB_NAME=one_e2e LOCAL_STORAGE_DIR=/tmp/one-e2e-files \
JWT_SECRET=e2e-secret-key-please-change-1234567890 \
APP_PORT=3100 FRONTEND_BASE_URL=http://localhost:3101 go run ./cmd/server

# 3. frontend (apps/one-frontend)
NEXT_PUBLIC_API_URL=http://localhost:3100/api/v1 npx next dev -p 3101

# 4. tests
npx playwright test -c playwright.e2e.config.ts
```

`E2E_API_URL` and `E2E_FRONTEND_URL` override the addresses.
