// frontend/src/App.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import Canvas from "./components/Canvas";
import "./styles.css";

/**
 * App.tsx — unified React version of play.html behavior
 * - Commit -> auto-generate clientSeed and display commitHex
 * - Start -> uses clientSeed, bet, dropColumn; draws path from API path
 * - Reveal -> calls reveal and stores displayed serverSeed
 * - Regenerate client seed button
 * - Keyboard controls: ← / → / Space / M / T / G
 * - imports shared styles.css
 */

const api = axios.create({
  baseURL: "https://fair-plinko.onrender.com",
});

type PegMap = number[][];
type Path = string[];

export default function App() {
  const [dropColumn, setDropColumn] = useState<number>(6);
  const [betCents, setBetCents] = useState<number>(100);
  const [clientSeed, setClientSeed] = useState<string>("");
  const [pegMap, setPegMap] = useState<PegMap>([]);
  const [path, setPath] = useState<Path>([]);
  const [bin, setBin] = useState<number | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [serverSeed, setServerSeed] = useState<string | null>(null);
  const [commitHex, setCommitHex] = useState<string | null>(null);

  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem("muted") === "1";
    } catch {
      return false;
    }
  });
  const [tilt, setTilt] = useState(false);
  const [debug, setDebug] = useState(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return (
      window.matchMedia && window.matchMedia("(prefers-reduced-motion)").matches
    );
  });

  // Keyboard controls: arrows, space, m, t, g
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        setDropColumn((d) => Math.max(0, d - 1));
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        setDropColumn((d) => Math.min(12, d + 1));
        e.preventDefault();
      } else if (e.code === "Space") {
        e.preventDefault();
        startRound();
      } else if (e.key.toLowerCase() === "m") {
        setMuted((m) => {
          const nm = !m;
          localStorage.setItem("muted", nm ? "1" : "0");
          return nm;
        });
      } else if (e.key.toLowerCase() === "t") {
        setTilt((t) => !t);
      } else if (e.key.toLowerCase() === "g") {
        setDebug((d) => !d);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Prefers reduced motion listener
  useEffect(() => {
    const mq =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion)");
    if (!mq) return;
    const f = (ev: MediaQueryListEvent) => setReducedMotion(ev.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  // Commit: server creates serverSeed+nonce and stores commitHex.
  // We use commit response to show commitHex and auto-generate clientSeed.
  async function commitRound() {
    try {
      const res = await api.post("/api/rounds/commit");
      setRoundId(res.data.roundId);
      setCommitHex(res.data.commitHex || null);

      // Auto-generate a client seed and set it in UI so user can use it for start
      const newClient = "player-" + Math.random().toString(16).slice(2, 8);
      setClientSeed(newClient);

      // clear previous serverSeed (not revealed yet)
      setServerSeed(null);
      // keep UX feedback lightweight — also set pegMap/path reset
      setPegMap([]);
      setPath([]);
      setBin(null);
      alert(
        "✅ Round committed: " +
          res.data.roundId +
          "\nCommit: " +
          (res.data.commitHex || "—")
      );
    } catch (err: any) {
      console.error(err);
      alert(
        "❌ Commit failed: " + (err?.response?.data?.error || err?.message)
      );
    }
  }

  // Start round: sends clientSeed + betCents + dropColumn -> backend returns deterministic pegMap, path, binIndex
  async function startRound() {
    if (!roundId) {
      alert("Please create a round (commit) first.");
      return;
    }
    try {
      const res = await api.post(`/api/rounds/${roundId}/start`, {
        clientSeed:
          clientSeed || "guest-" + Math.random().toString(36).slice(2, 8),
        betCents,
        dropColumn,
      });
      setPegMap(res.data.pegMap || []);
      setPath(res.data.path || []);
      setBin(res.data.binIndex ?? null);

      // optional audio cue on landing
      if (!muted) {
        try {
          const s = new Audio("/assets/land.wav");
          s.volume = 0.3;
          s.play().catch(() => {});
        } catch {}
      }
    } catch (err: any) {
      console.error("Start round failed:", err);
      alert(
        "Error starting round: " + (err.response?.data?.error || err.message)
      );
    }
  }

  // Reveal: sends serverSeed to server to mark round REVEALED (serverSeed is persisted)
  // If your backend returns serverSeed, store it and show to user.
  async function revealRound() {
    if (!roundId) {
      alert("no roundId");
      return;
    }
    // reveal may require user to paste serverSeed OR the endpoint may reveal serverSeed from server side.
    // Here we call reveal endpoint without body; backend may reveal stored serverSeed automatically for security.
    try {
      const res = await api.post(`/api/rounds/${roundId}/reveal`, {});
      setServerSeed(res.data.serverSeed || null);
      alert("✅ Round revealed!");
    } catch (err: any) {
      alert("❌ Reveal failed: " + (err.response?.data?.error || err?.message));
    }
  }

  // Open verifier (simple prompt-based) — calls /api/verify with inputs and shows returned recomputed values.
  async function openVerifier() {
    const server = prompt("serverSeed:");
    const client = prompt("clientSeed:");
    const nonce = prompt("nonce:");
    const drop = prompt("dropColumn (0..12):", String(dropColumn));
    if (!server || client == null || nonce == null || drop == null) return;
    try {
      const res = await api.get(
        `/api/verify?serverSeed=${encodeURIComponent(
          server
        )}&clientSeed=${encodeURIComponent(client)}&nonce=${encodeURIComponent(
          nonce
        )}&dropColumn=${encodeURIComponent(drop)}`
      );
      alert(
        `Verifier result: commitHex=${res.data.commitHex}, binIndex=${res.data.binIndex}`
      );
      setPegMap(res.data.pegMap || []);
      setPath(res.data.path || []);
      setBin(res.data.binIndex ?? null);
    } catch (err: any) {
      alert("Verifier failed: " + (err.response?.data?.error || err?.message));
    }
  }

  function regenerateClientSeed() {
    const newClient = "player-" + Math.random().toString(16).slice(2, 8);
    setClientSeed(newClient);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Plinko (Demo) — ← → space(drop), M mute, T tilt, G debug</h2>

      <div
        style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}
      >
        <label>
          Drop column:
          <input
            type="number"
            min={0}
            max={12}
            value={dropColumn}
            onChange={(e) =>
              setDropColumn(Math.max(0, Math.min(12, Number(e.target.value))))
            }
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>

        <label>
          Bet (cents):
          <input
            type="number"
            min={0}
            value={betCents}
            onChange={(e) => setBetCents(Number(e.target.value))}
            style={{ width: 100, marginLeft: 8 }}
          />
        </label>

        <label>
          Client seed:
          <input
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            placeholder="optional clientSeed"
            style={{ marginLeft: 8, minWidth: 200 }}
          />
        </label>
        <button onClick={regenerateClientSeed}>🎲 Regenerate</button>

        <button onClick={commitRound}>Commit (create round)</button>
        <button onClick={startRound}>Drop (start)</button>
        <button onClick={revealRound}>Reveal (serverSeed)</button>
        <button onClick={openVerifier}>Verifier</button>
        <button
          onClick={() =>
            setMuted((m) => {
              const nm = !m;
              localStorage.setItem("muted", nm ? "1" : "0");
              return nm;
            })
          }
        >
          {muted ? "Unmute (M)" : "Mute (M)"}
        </button>
      </div>

      <div style={{ marginBottom: 12, lineHeight: "1.6" }}>
        <strong>Bin result:</strong> {bin ?? "---"} &nbsp; | &nbsp;
        <strong>Round:</strong> {roundId ?? "none"}
        <br />
        <strong>Commit Hash:</strong>{" "}
        <span style={{ color: "#00e6e6", wordBreak: "break-all" }}>
          {commitHex ?? "—"}
        </span>
        <br />
        <strong>Server Seed (revealed):</strong>{" "}
        <span style={{ color: "#00e6e6", wordBreak: "break-all" }}>
          {serverSeed ?? "— not revealed —"}
        </span>
      </div>

      <Canvas
        pegMap={pegMap}
        path={path}
        debug={debug}
        tilt={tilt}
        reducedMotion={reducedMotion}
      />

      <div style={{ marginTop: 16 }}>
        <small>
          Reduced motion: {String(reducedMotion)} &nbsp; | &nbsp; Tilt:{" "}
          {String(tilt)} &nbsp; | &nbsp; Debug: {String(debug)}
        </small>
      </div>
    </div>
  );
}
