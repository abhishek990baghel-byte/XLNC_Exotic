# XLNC Exotic Homes Inventory Management Portal - Deployment Guide

This guide details step-by-step instructions for deploying the **XLNC Exotic Homes Inventory Management Portal** to live production cloud environments.

---

## 🚀 Quick Launch Options

### Option 1: Docker / Docker Compose (Recommended for Any Cloud VPS)

1. **Clone & Configure**:
   ```bash
   git clone <your-repo-url>
   cd xlnc-inventory
   cp .env.production.example .env
   ```

2. **Set Environment Secrets**:
   Edit `.env` and set your `GEMINI_API_KEY` and database passwords.

3. **Spin Up Full Stack (Node.js App + PostgreSQL)**:
   ```bash
   docker-compose up -d --build
   ```

4. **Verify Container Health**:
   ```bash
   docker ps
   curl http://localhost:3000/health
   ```

---

### Option 2: Render.com One-Click Blueprint

1. Push your repository to GitHub or GitLab.
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Select your repository. Render automatically reads `render.yaml` and provisions:
   - A managed **PostgreSQL Database** (`xlnc-postgres-db`)
   - A **Node.js Web Service** (`xlnc-inventory-portal`)
5. Enter your `GEMINI_API_KEY` in the Render Environment Variables tab and click **Deploy**.

---

### Option 3: Manual Cloud Deployment (AWS Cloud Run, Railway, Heroku)

1. **Build Step**:
   ```bash
   npm install
   npm run build
   ```
   This generates the static Vite frontend assets in `dist/` and bundles the Express server into `dist/server.cjs`.

2. **Start Step**:
   ```bash
   npm start
   ```

3. **Required Environment Variables**:
   - `PORT`: `3000`
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: `postgresql://user:password@host:5432/dbname?sslmode=require` (Strictly required)
   - `GEMINI_API_KEY`: Your Google Gemini API Key

