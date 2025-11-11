// backend/index.js
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { Engine } from "./engine.js";
import { verifyRound } from "./controllers/verify.controller.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
import roundRoutes from "./src/routes/roundRoutes.js";
app.use("/api/rounds", roundRoutes);

// ✅ Helper
function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s), "utf8").digest("hex");
}

// ✅ Helper to safely read secrets.json
async function loadSecrets() {
  const secretsPath = path.join(__dirname, "secrets.json");
  try {
    const data = await fs.readFile(secretsPath, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// ✅ Helper to write secrets.json
async function saveSecret(roundId, serverSeed) {
  const secretsPath = path.join(__dirname, "secrets.json");
  const map = await loadSecrets();
  map[roundId] = serverSeed;
  await fs.writeFile(secretsPath, JSON.stringify(map, null, 2), "utf8");
}

// ✅ /api/rounds/commit
app.post("/api/rounds/commit", async (req, res) => {
  try {
    const serverSeed = crypto.randomBytes(32).toString("hex");
    const nonce = Date.now().toString();
    const commitHex = sha256Hex(`${serverSeed}:${nonce}`);

    const round = await prisma.round.create({
      data: {
        nonce: Number(nonce) || 0,
        commitHex,
        serverSeed: null,
        clientSeed: "",
        combinedSeed: null,
        pegMapHash: null,
        rows: 12,
        dropColumn: 6,
        binIndex: null,
        payoutMultiplier: 0,
        betCents: 0,
        pathJson: [],
        status: "CREATED",
      },
    });

    await saveSecret(round.id, serverSeed);
    res.json({ roundId: round.id, commitHex, nonce });
  } catch (err) {
    console.error("❌ Commit error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ /api/rounds/:id/start
app.post("/api/rounds/:id/start", async (req, res) => {
  try {
    let { id } = req.params;
    const { clientSeed, betCents = 0, dropColumn = 6 } = req.body;

    let round = await prisma.round.findUnique({ where: { id } });

    // Auto-create new round if invalid
    if (!round || round.status !== "CREATED") {
      console.log("ℹ️ Auto-creating new round (invalid or used round ID)");
      const serverSeed = crypto.randomBytes(32).toString("hex");
      const nonce = Date.now().toString();
      const commitHex = sha256Hex(`${serverSeed}:${nonce}`);
      round = await prisma.round.create({
        data: {
          nonce: Number(nonce) || 0,
          commitHex,
          serverSeed: null,
          clientSeed: "",
          combinedSeed: null,
          pegMapHash: null,
          rows: 12,
          dropColumn: 6,
          binIndex: null,
          payoutMultiplier: 0,
          betCents: 0,
          pathJson: [],
          status: "CREATED",
        },
      });
      id = round.id;
      await saveSecret(round.id, serverSeed);
    }

    // ✅ Fetch serverSeed from secrets file
    const secrets = await loadSecrets();
    const serverSeed = secrets[id];
    if (!serverSeed)
      return res
        .status(500)
        .json({ error: "serverSeed missing (dev secrets)" });

    // Combine seeds + generate deterministic path
    const combinedSeed = sha256Hex(
      `${serverSeed}:${clientSeed}:${round.nonce}`
    );
    const engine = new Engine(combinedSeed, Number(dropColumn));
    engine.generate();

    const updated = await prisma.round.update({
      where: { id },
      data: {
        clientSeed: clientSeed || "",
        combinedSeed,
        pegMapHash: engine.pegMapHash,
        rows: 12,
        dropColumn: Number(dropColumn),
        binIndex: engine.binIndex,
        payoutMultiplier: 1 + Math.abs(6 - engine.binIndex) * 0.25,
        betCents: Number(betCents),
        pathJson: engine.path,
        status: "STARTED",
      },
    });

    res.json({
      roundId: updated.id,
      pegMapHash: engine.pegMapHash,
      binIndex: engine.binIndex,
      path: engine.path,
    });
  } catch (err) {
    console.error("❌ Start round error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ /api/rounds/:id/reveal
app.post("/api/rounds/:id/reveal", async (req, res) => {
  try {
    const { id } = req.params;
    const round = await prisma.round.findUnique({ where: { id } });
    if (!round) return res.status(404).json({ error: "Round not found" });

    const secrets = await loadSecrets();
    const serverSeed = secrets[id];
    if (!serverSeed)
      return res.status(500).json({ error: "serverSeed missing" });

    const updated = await prisma.round.update({
      where: { id },
      data: { serverSeed, status: "REVEALED", revealedAt: new Date() },
    });
    res.json({ roundId: updated.id, serverSeed });
  } catch (err) {
    console.error("❌ Reveal error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ /api/rounds/:id
app.get("/api/rounds/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const round = await prisma.round.findUnique({ where: { id } });
    if (!round) return res.status(404).json({ error: "Round not found" });
    const out = { ...round };
    if (!round.serverSeed) out.serverSeed = null;
    res.json(out);
  } catch (err) {
    console.error("❌ Get round error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ /api/rounds (list)
app.get("/api/rounds", async (req, res) => {
  try {
    const limit = Math.min(100, Number(req.query.limit || 20));
    const rounds = await prisma.round.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const sanitized = rounds.map((r) => ({
      ...r,
      serverSeed: r.status === "REVEALED" ? r.serverSeed : null,
    }));
    res.json(sanitized);
  } catch (err) {
    console.error("❌ List rounds error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Verification endpoint
app.get("/api/verify", verifyRound);

// ✅ Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ✅ Start server
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`✅ Backend listening on port ${port}`));
