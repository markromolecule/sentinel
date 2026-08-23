# Vercel Monorepo Deployment & Smart Build Skipping Runbook

This guide details how to configure individual Vercel projects for applications in the **Sentinel Monorepo** so that each project automatically skips unnecessary builds when unaffected by a commit or Pull Request against the **`master`** branch.

---

## 🏗️ Architecture & Mechanism

When code is pushed to your Git repository:
1. Vercel executes the **Ignored Build Step** command before provisioning build resources.
2. `npx turbo-ignore --fallback=master` queries Turborepo's dependency graph.
3. Turborepo checks if the application or any of its internal workspace dependencies (e.g., `@sentinel/ui`, `@sentinel/db`, `@sentinel/shared`) have changed relative to the previous deployment or `origin/master`.
4. **If No Changes:** The command exits with code `0`. Vercel logs **`Build Ignored`** and cancels the deployment immediately (0 build minutes consumed).
5. **If Changes Detected:** The command exits with code `1`. Vercel proceeds with `pnpm install` and `next build`.

---

## 📋 Vercel Project Configuration Matrix

Create a separate project in the Vercel Dashboard for each web application:

| Application | Root Directory | Framework Preset | Ignored Build Step Command |
| :--- | :--- | :--- | :--- |
| **`sentinel-web`** | `app/sentinel-web` | Next.js | `pnpm run ignore-build` |
| **`sentinel-core`** | `app/sentinel-core` | Next.js | `pnpm run ignore-build` |
| **`sentinel-support`** | `app/sentinel-support` | Next.js | `pnpm run ignore-build` |

---

## 🛠️ Step-by-Step Vercel Setup

### Step 1: Create or Select the Project
1. Log in to [Vercel](https://vercel.com/) and navigate to your team / workspace.
2. Click **Add New…** → **Project**.
3. Import the `sentinel` repository.

### Step 2: Configure General Settings
1. In the project setup (or **Settings** → **General**):
   - **Project Name:** Set to `sentinel-web` (or `sentinel-core`, `sentinel-support`).
   - **Framework Preset:** Select **Next.js**.
   - **Root Directory:** Click *Edit* and select the corresponding folder (e.g., `app/sentinel-web`).
   - ✅ **Ensure Checked:** *"Include source files outside of the Root Directory in the Build Step"* (MANDATORY for pnpm workspace packages).

### Step 3: Configure Git & Ignored Build Step
1. Navigate to **Settings** → **Git**.
2. **Production Branch:** Ensure this is set to `master`.
3. **Ignored Build Step:**
   - Select **Custom**.
   - Enter the command:
     ```bash
     pnpm run ignore-build
     ```
     *(This runs `npx turbo-ignore --fallback=master` as configured in `package.json`).*

### Step 4: Environment Variables
1. Navigate to **Settings** → **Environment Variables**.
2. Add necessary public and server environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Any app-specific runtime variables.

---

## 🧪 Build Behavior & Dependency Scenarios

| File / Folder Modified in Commit | `sentinel-web` Action | `sentinel-core` Action | `sentinel-support` Action |
| :--- | :--- | :--- | :--- |
| `app/sentinel-web/**` | 🟢 **Builds & Deploys** | ⏭️ **Build Ignored (0 min)** | ⏭️ **Build Ignored (0 min)** |
| `app/sentinel-core/**` | ⏭️ **Build Ignored (0 min)** | 🟢 **Builds & Deploys** | ⏭️ **Build Ignored (0 min)** |
| `app/sentinel-support/**` | ⏭️ **Build Ignored (0 min)** | ⏭️ **Build Ignored (0 min)** | 🟢 **Builds & Deploys** |
| `packages/ui/**` *(imported by all)* | 🟢 **Builds & Deploys** | 🟢 **Builds & Deploys** | 🟢 **Builds & Deploys** |
| `packages/db/**` | 🟢 **Builds & Deploys** | 🟢 **Builds & Deploys** | 🟢 **Builds & Deploys** |
| `docs/**` or `scripts/**` | ⏭️ **Build Ignored (0 min)** | ⏭️ **Build Ignored (0 min)** | ⏭️ **Build Ignored (0 min)** |

---

## 🔍 Troubleshooting & FAQ

### How can I force a build on Vercel even if `turbo-ignore` skipped it?
- In the Vercel Dashboard, go to **Deployments**, click the three dots on the latest commit, and select **Redeploy**. Uncheck *"Use existing build cache"* if you want a completely fresh compilation.

### What if Vercel says `turbo-ignore: command not found`?
- Ensure the project uses `pnpm run ignore-build` or `npx turbo-ignore --fallback=master`. Vercel automatically provides `npx` in its build container environment.

### Why is my build triggering when I only changed a shared package?
- This is intentional. Turborepo tracks the full workspace dependency graph (`packages/ui`, `packages/shared`, `packages/db`, etc.). If a shared dependency changes, all apps importing it must be rebuilt to ensure runtime and type safety.
