// backend/controllers/verify.controller.js
import crypto from "crypto";
import { Engine } from "../engine.js";

/**
 * Helper to generate SHA256 hex
 */
function sha256Hex(str) {
  return crypto.createHash("sha256").update(String(str), "utf8").digest("hex");
}

/**
 * GET /api/verify
 * Query Parameters:
 *   serverSeed, clientSeed, nonce, dropColumn
 *
 * Returns:
 *   { commitHex, combinedSeed, pegMapHash, binIndex, path }
 */
export async function verifyRound(req, res) {
  try {
    const { serverSeed, clientSeed = "", nonce, dropColumn = 6 } = req.query;
    if (!serverSeed || !nonce) return res.status(400).json({ error: "serverSeed and nonce required" });
    const commitHex = sha256Hex(`${serverSeed}:${nonce}`);
    const combinedSeed = sha256Hex(`${serverSeed}:${clientSeed}:${nonce}`);
    const engine = new Engine(combinedSeed, Number(dropColumn));
    engine.generate();
    return res.json({
      commitHex,
      combinedSeed,
      pegMapHash: engine.pegMapHash,
      binIndex: engine.binIndex,
      path: engine.path
    });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: "Internal error" });
  }
}
