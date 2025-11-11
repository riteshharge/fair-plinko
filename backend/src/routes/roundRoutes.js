import express from "express";
import crypto from "crypto";
import prisma from "../../prisma/client.js";

const router = express.Router();

/**
 * Utility: Generate SHA256 hash
 */
function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Utility: Deterministic RNG using combinedSeed
 */
function deterministicRNG(seed, steps = 1) {
  let hash = seed;
  for (let i = 0; i < steps; i++) {
    hash = sha256(hash);
  }
  // convert to 0..1 float
  const intVal = parseInt(hash.slice(0, 8), 16);
  return intVal / 0xffffffff;
}

/**
 * Utility: Simulate plinko path
 */
function simulatePlinko(
  serverSeed,
  clientSeed,
  nonce,
  rows = 12,
  dropColumn = 6
) {
  const combinedSeed = sha256(`${serverSeed}:${clientSeed}:${nonce}`);
  let rngSeed = combinedSeed;
  const pegMap = [];
  const path = [];
  let col = dropColumn;

  for (let r = 0; r < rows; r++) {
    const rand = deterministicRNG(rngSeed, r + 1);
    const bias = 0.5 + (rand - 0.5) * 0.2; // ±10%
    const dir = rand < bias ? "L" : "R";
    path.push(dir);
    pegMap.push(rand.toFixed(6));
    if (dir === "R") col++;
    if (dir === "L") col--;
    if (col < 0) col = 0;
    if (col > 12) col = 12;
  }

  const binIndex = col;
  const pegMapHash = sha256(JSON.stringify(pegMap));

  return { combinedSeed, pegMap, pegMapHash, path, binIndex };
}

/**
 *  POST /api/rounds/commit
 * Creates a new round with a serverSeed hash
 */
router.post("/commit", async (req, res) => {
  try {
    const serverSeed = crypto.randomBytes(32).toString("hex");
    const nonce = Date.now().toString();
    const commitHex = sha256(`${serverSeed}:${nonce}`);

    const round = await prisma.round.create({
      data: {
        status: "committed",
        serverSeed,
        commitHex,
        nonce,
      },
    });

    res.json({ roundId: round.id, commitHex, nonce });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Commit failed" });
  }
});

/**
 *  POST /api/rounds/:id/start
 * Takes clientSeed and runs deterministic simulation
 */
router.post("/:id/start", async (req, res) => {
  try {
    const { id } = req.params;
    const { clientSeed, dropColumn = 6, betCents = 100 } = req.body;
    const round = await prisma.round.findUnique({ where: { id } });
    if (!round) return res.status(404).json({ error: "Round not found" });

    const { serverSeed, nonce } = round;
    const { combinedSeed, pegMap, pegMapHash, path, binIndex } = simulatePlinko(
      serverSeed,
      clientSeed,
      nonce,
      12,
      dropColumn
    );

    const updated = await prisma.round.update({
      where: { id },
      data: {
        clientSeed,
        combinedSeed,
        pegMapHash,
        dropColumn,
        pathJson: JSON.stringify(path),
        binIndex,
        betCents,
        status: "started",
      },
    });

    res.json({
      pegMap,
      path,
      binIndex,
      combinedSeed,
      pegMapHash,
      roundId: updated.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Start failed" });
  }
});

/**
 *  POST /api/rounds/:id/reveal
 * Reveals serverSeed and final fairness verification
 */
router.post("/:id/reveal", async (req, res) => {
  try {
    const { id } = req.params;
    const round = await prisma.round.findUnique({ where: { id } });
    if (!round) return res.status(404).json({ error: "Round not found" });

    const { serverSeed, commitHex, nonce } = round;
    const recomputedCommit = sha256(`${serverSeed}:${nonce}`);

    if (recomputedCommit !== commitHex)
      return res
        .status(400)
        .json({ error: "Commit mismatch — tampering detected" });

    const updated = await prisma.round.update({
      where: { id },
      data: { status: "revealed", revealedAt: new Date() },
    });

    res.json({ serverSeed, verified: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Reveal failed" });
  }
});

/**
 *  GET /api/verify
 * External verifier (recompute fairness)
 */
router.get("/verify", async (req, res) => {
  try {
    const { serverSeed, clientSeed, nonce, dropColumn } = req.query;
    if (!serverSeed || !clientSeed || !nonce)
      return res.status(400).json({ error: "Missing params" });

    const { combinedSeed, pegMap, pegMapHash, path, binIndex } = simulatePlinko(
      serverSeed,
      clientSeed,
      nonce,
      12,
      Number(dropColumn || 6)
    );

    const commitHex = sha256(`${serverSeed}:${nonce}`);

    res.json({ commitHex, combinedSeed, pegMap, pegMapHash, path, binIndex });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verify failed" });
  }
});

export default router;
