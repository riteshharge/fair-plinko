# 🎮 Plinko – Fairness-Verified Game (Full-Stack Project)
A provably fair Plinko game built using React + TypeScript, Node.js (Express), and Prisma + PostgreSQL. It uses a cryptographic HMAC-SHA256 commit–reveal system so every round is independently verifiable. Verification is available in-app via a Verifier Modal and on a standalone /verify page. This entire document is provided as one continuous copy-paste block.

## 🚀 Run the Project Locally
Clone the repository:
git clone https://github.com/<your-username>/plinko_prisma_project_all_features.git
cd plinko_prisma_project_all_features

Backend setup:
cd backend
npm install

Create backend/.env:
PORT=4000
DATABASE_URL="postgresql://postgres:admin@localhost:5432/plinko"

Run Prisma and start backend:
npx prisma migrate dev
npx prisma generate
npm run dev
Backend URL: http://localhost:4000

Frontend setup:
cd ../frontend
npm install

Create frontend/.env:
VITE_API_BASE_URL=http://localhost:4000

Start frontend:
npm run dev
Frontend URL: http://localhost:5173

## ⚙️ Architecture Overview (With Full System Diagram)
Tech Stack:
Frontend → React, TypeScript, Vite, TailwindCSS  
Backend → Node.js, Express, Prisma ORM  
Database → PostgreSQL  
Animations → HTML5 Canvas, Framer Motion, canvas-confetti  
Routing → React Router DOM  
Fairness Engine → HMAC-SHA256 Commit–Reveal

System Diagram:
┌──────────────────────────┐
│         FRONTEND         │
│ React / TypeScript / Vite│
│ ├─ Canvas.tsx (Plinko)   │
│ ├─ App.tsx (Main Game)   │
│ ├─ VerifyPage.tsx        │
│ └─ VerifierModal.tsx     │
└──────────┬───────────────┘
           │ REST API (Axios)
┌──────────▼───────────────┐
│         BACKEND          │
│ Express + Prisma + HMAC  │
│ ├─ /api/rounds           │
│ ├─ /api/verify           │
│ └─ Seed Generator        │
└──────────┬───────────────┘
           │
        PostgreSQL DB
           │
        Prisma Models

## 🔒 Fairness System (Commit–Reveal)
1. Commit Phase  
Backend generates a 256-bit serverSeed and exposes only:  
commitHex = SHA256(serverSeed)

2. Start Phase  
User provides clientSeed. Backend creates deterministic PRNG seed:  
combinedSeed = HMAC_SHA256(serverSeed, clientSeed + nonce)

3. Pegboard Logic  
13-column triangular peg layout. Each PRNG bit decides movement:  
0 → left  
1 → right  
Final bin determines multiplier.

4. Reveal Phase  
Server reveals serverSeed. Anyone can:  
• Recompute SHA256(serverSeed) → must match commitHex  
• Recompute PRNG  
• Replay Plinko path  
• Verify final bin and payout  

5. Deterministic Output  
Uses float32-like fixed precision. Same inputs always produce identical results, ensuring full reproducibility.

## 🤖 Where AI Helped
AI was used for optimizing Canvas animation performance, integrating confetti, validating the HMAC commit-reveal flow across backend/frontend, and refactoring TypeScript logic. All fairness design, gameplay logic, UI structure, and architectural decisions were manually implemented.

## 🕓 Development Time Log
Backend + Prisma setup: ~3 hours  
Canvas physics + animation: ~5 hours  
Verifier Modal + verify page: ~2 hours  
Fairness debugging + HMAC validation: ~2 hours  
UI polish, confetti, audio: ~2 hours  
Total ~14 hours

## 🚧 Possible Future Enhancements
• Leaderboard + wallet system with Prisma relations  
• Physics upgrade via Matter.js  
• Jest fairness test suite   
• Mobile-optimized UI  
• Localization/internationalization support  

## 🧠 Summary
This project demonstrates a full-stack architecture using React, Express, Prisma, and PostgreSQL. It includes a deterministic, cryptographically secure fairness engine using HMAC-SHA256 commit–reveal, a reproducible PRNG-driven Plinko game engine, a transparent verification interface, and smooth Canvas-driven visuals. The entire system is engineered for fairness, transparency, reproducibility, and clean full-stack execution.

