# Technode VPS (Next.js)

This app now uses Prisma + PostgreSQL for:

- Customer login
- Admin customer creation
- Admin customer listing

## Local development setup

1. Create local PostgreSQL database:

```bash
createdb technode_vps
```

2. Copy/update environment values:

```bash
cp .env.example .env.development
```

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client and run migration:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init_customers
```

5. Start app:

```bash
npm run dev
```

Login route: `/login`

Hidden admin route: `/hidden-admin-login`

## Deployment (Vercel)

Use `.env.production.example` as reference for Vercel environment variables.

- `NEXT_PUBLIC_APP_URL=https://technode-vps.vercel.app`
- `PRISMA_DATABASE_URL=...` (Prisma Postgres)
- `POSTGRES_URL=...` (same hosted DB url)
- `ADMIN_USERNAME=...`
- `ADMIN_PASSWORD=...`

