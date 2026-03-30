# Quote App Deployment Guide

This repository contains two folders:
1. `frontend`: The React (Vite) application.
2. `backend`: The FastAPI application.

## 1. Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Name it `quote-app-fullstack`.
3. Do NOT initialize with README or .gitignore (I've already added one).
4. Click **Create repository**.

## 2. Push Your Code to GitHub
Open your terminal (PowerShell or Git Bash) and run:
```bash
cd C:\Users\HP\.gemini\antigravity\scratch\quoteapp-deployment
git init
git add .
git commit -m "initial commit: frontend and backend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/quote-app-fullstack.git
git push -u origin main
```
*(Replace `YOUR_USERNAME` with your actual GitHub username)*

## 3. Deploy Backend to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import your `quote-app-fullstack` repository.
4. For the **Backend**:
   - Project Name: `quote-app-backend`
   - Framework Preset: **Other**
   - Root Directory: Click **Edit** and select the `backend` folder.
   - **Environment Variables**: Add all variables from your `.env` file (e.g., `MONGO_URL`, `SECRET_KEY`, `EMAIL_USER`, `EMAIL_PASS`).
5. Click **Deploy**.

## 4. Deploy Frontend to Vercel
1. Go back to Vercel Dashboard.
2. Click **Add New...** > **Project**.
3. Import the same repository (`quote-app-fullstack`).
4. For the **Frontend**:
   - Project Name: `quote-app-frontend`
   - Framework Preset: **Vite**
   - Root Directory: Click **Edit** and select the `frontend` folder.
   - **Environment Variables**:
     - `VITE_API_URL`: Use your backend URL (e.g., `https://quote-app-backend.vercel.app/api`).
5. Click **Deploy**.

## Note on Folder Size
The `node_modules` and `venv` folders are excluded by the `.gitignore` I created, so it will be very fast to push and deploy!
