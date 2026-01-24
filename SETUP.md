# Sentinel Project Setup Guide

This guide details the procedure to clone, configure, and run the Sentinel project locally.

## Prerequisites

- **Node.js**: Version 22.x or later.
- **Git**: For version control.
- **pnpm**: Recommended package manager.

## 1. Clone the Repository

```bash
git clone <repository_url>
cd sentinel
```

## 2. Automated Setup (Recommended)

We have provided a script to automate the installation and initial configuration.

```bash
./scripts/setup.sh
```

This script will:

1.  Check for `pnpm` (and install it via `npm` if missing).
2.  Install all project dependencies.
3.  Create `.env` and `.env.local` files from example templates if they don't exist.
4.  Generate the Prisma client.

## 3. Manual Configuration

If you prefer to set up manually:

### 3.1 Install Dependencies

```bash
pnpm install
```

### 3.2 Configure Environment Variables

You need to set up environment variables for both the API and Web applications.

**For `app/sentinel-api`:**
Copy `app/sentinel-api/.env.example` to `app/sentinel-api/.env` and fill in your Supabase/PostgreSQL credentials.

```bash
cp app/sentinel-api/.env.example app/sentinel-api/.env
```

Required variables:

- `DATABASE_URL`: Connection string to your database (Transaction mode usually).
- `DIRECT_URL`: Direct connection string (Session mode) for migrations.
- `SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_ANON_KEY`: Your Supabase Anon Key.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key.

**For `app/sentinel-web`:**
Copy `app/sentinel-web/.env.example` to `app/sentinel-web/.env.local`.

```bash
cp app/sentinel-web/.env.example app/sentinel-web/.env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
- `NEXT_PUBLIC_API_URL`: URL of the backend API (default: `http://localhost:3001`).

### 3.3 Database Setup

The project uses Prisma. Ensure your database is accessible.

To push the schema to your database (if starting fresh):

```bash
cd app/sentinel-api
npx prisma db push
cd ../..
```

To generate the client (if not done by install):

```bash
cd app/sentinel-api
npx prisma generate
cd ../..
```

## 4. Running the Project

To start the development server for all apps (API and Web):

```bash
pnpm dev
```

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:3001](http://localhost:3001)

## Troubleshooting

- **Prisma Client issues**: Run `pnpm turbo run build` or `cd app/sentinel-api && npx prisma generate`.
- **Connection errors**: Double-check your `DATABASE_URL` in `app/sentinel-api/.env`.
