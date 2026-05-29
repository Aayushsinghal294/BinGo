Deployment guide - Frontend (Vercel) + Backend (Render)
=======================================================

This project contains:
- client/ - Vite React frontend
- server/ - Node/Express backend
- ai_backend/ - Optional Python AI service (not deployed here)

Goal: deploy client to Vercel and server to Render.

Prerequisites
- GitHub repository with this project pushed
- Vercel account
- Render account
- MongoDB Atlas URI
- Google API key for Gemini

1) Backend deploy on Render

- Open Render dashboard and click New > Web Service.
- Connect your GitHub repo and select this repository.
- If prompted, use render.yaml from repo root as the Blueprint.
- Configure service:
	- Name: bingo-server
	- Root Directory: server
	- Runtime: Node
	- Build Command: npm install
	- Start Command: npm start
- Set environment variables in Render:
	- MONGO_URI
	- GOOGLE_API_KEY
	- GEMINI_CHAT_MODEL (optional)
	- GEMINI_IMAGE_MODEL (optional)
	- NODE_ENV=production
	- PORT=4000
	- FRONTEND_URL (set after Vercel deploy)
- Deploy and copy backend URL, for example:
	- https://bingo-server.onrender.com

2) Frontend deploy on Vercel

- In Vercel, import your GitHub repository.
- Set project root to client.
- Build settings:
	- Build command: npm run build
	- Output directory: dist
- Add environment variable:
	- VITE_SERVER_URL=https://bingo-server.onrender.com
- Deploy.

3) Final CORS wiring

- Copy Vercel production URL.
- In Render environment variables, set FRONTEND_URL to your Vercel URL.
- Trigger redeploy in Render.

4) Smoke tests

- Open backend health URL:
	- https://bingo-server.onrender.com/api/health
- Open frontend URL from Vercel and test:
	- Chat endpoint
	- Image analysis endpoint

Notes
- Render free services can sleep after inactivity; first request may be slow.
- Do not commit secrets to Git. Use dashboard environment variables only.
- ai_backend is intentionally excluded from this free deployment path due to heavy ML dependencies.
