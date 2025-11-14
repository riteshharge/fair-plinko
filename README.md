# 🎮 Plinko – Fairness-Verified Game (Full-Stack Project)

A provably fair **Plinko** game built with **React + TypeScript**, **Node.js (Express)**, and **Prisma + PostgreSQL**.  
The system ensures transparency by revealing seeds and allowing independent verification of every round.  
It includes both an in-app **Verifier Modal** and a standalone **/verify page**.

---

## 🚀 How to Run Locally

### 1️⃣ Clone the repository

```bash
git clone https://github.com/<your-username>/plinko_prisma_project_all_features.git
cd plinko_prisma_project_all_features
```

2️⃣ Setup the backend
cd backend
npm install

Create a .env file inside /backend:

PORT=4000
DATABASE_URL="postgresql://postgres:admin@localhost:5432/plinko"

Run Prisma setup:

npx prisma migrate dev
npx prisma generate
npm run dev

Backend will run on → http://localhost:4000

3️⃣ Setup the frontend
cd ../frontend
npm install

Create a .env file inside /frontend:

VITE_API_BASE_URL=http://localhost:4000

Then start it:

npm run dev

Frontend will run on → http://localhost:5173

⚙️ Architecture Overview

Tech Stack

Frontend: React + TypeScript + Vite + TailwindCSS

Backend: Node.js + Express + Prisma ORM

Database: PostgreSQL

Animations: HTML5 Canvas, canvas-confetti, Framer Motion

Routing: React Router DOM

Fairness Engine: HMAC-SHA256 Commit-Reveal system

┌──────────────────────────┐
│ FRONTEND │
│ React / TypeScript / Vite│
│ ├─ Canvas.tsx (Plinko) │
│ ├─ App.tsx (Main Game) │
│ ├─ VerifyPage.tsx │
│ └─ VerifierModal.tsx │
└──────────┬───────────────┘
│ REST API (Axios)
┌──────────▼───────────────┐
│ BACKEND │
│ Express + Prisma + HMAC │
│ ├─ /api/rounds │
│ ├─ /api/verify │
│ └─ Seed Generator │
└──────────┬───────────────┘
│
PostgreSQL DB
│
Prisma ORM Models

🔒 Fairness Specification

Each round uses a Commit-Reveal mechanism for provable fairness.

🧮 1. Commit Phase

Backend generates random Server Seed (256-bit).

Stores its hash:

commitHex = SHA256(serverSeed)

This commit is sent to the frontend before play so it can’t be changed later.

🎲 2. Start Phase

The player provides a Client Seed.

Backend computes:

combinedSeed = HMAC_SHA256(serverSeed, clientSeed + nonce)

This initializes a deterministic PRNG that controls left/right bounces.

⚙️ 3. Peg Map Logic

A 13-column triangular grid determines bounce outcomes.

Each step uses PRNG bits (0 = left, 1 = right).

The final bin index decides payout multiplier.

4.  Reveal Phase

Once complete, backend reveals the original serverSeed.

Anyone can verify by recalculating the commit and replaying the path.

🧩 5. Rounding & Determinism

PRNG output is fixed-precision (float32-like).

Identical seeds always reproduce the same bin — ensuring verifiability.

🤖 Where AI Was Used

AI was used selectively for complex implementation tasks, such as:

Optimizing canvas physics animations with requestAnimationFrame.

Integrating confetti bursts (canvas-confetti) on round completion.

Ensuring correctness of the HMAC-SHA256 Commit-Reveal flow between Node.js and browser.

Refactoring TypeScript types and React state logic for maintainability.

All fairness design, UI structure, and gameplay flow were conceptualized and implemented manually.

🕓 Development Time Log (Approx.)
Phase Duration Notes
Backend + Prisma setup 3 hrs Schema, DB, and routes
Frontend Canvas simulation 5 hrs Physics + animation
Verifier Modal & /verify page 2 hrs Manual verification UI
Debugging + fairness validation 2 hrs HMAC / seed tests
UI polish, confetti, audio 2 hrs Finishing touches

Total: ~14 hours across 2 days.

🚧 If I Had More Time

Add leaderboard + user wallet system with Prisma relations.

Improve physics realism using Matter.js.

Implement Jest-based fairness test suite.

Deploy backend (Render) and frontend (Vercel) for production.

Add mobile-responsive layout and localization support.

🧠 Summary

This project demonstrates:

End-to-end full-stack architecture (frontend + backend + database).

Cryptographic fairness via HMAC commit-reveal.

Smooth visual simulation using Canvas and TypeScript.

Clean Prisma schema and reproducible round logic.

Transparent verification for every round.

Built with passion for fair, transparent gaming systems and clean full-stack engineering.
