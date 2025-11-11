import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Canvas from "./components/Canvas";
import VerifierModal from "./components/VerifierModal";
import "./styles.css";

// ✅ Uses .env for API base URL (Vite style)
const api = axios.create({
  baseURL:
    (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:4000",
});

type PegMap = number[][];
type Path = string[];

export default function App() {
  const [dropColumn, setDropColumn] = useState<number>(6);
  const [betCents, setBetCents] = useState<number>(100);
  const [clientSeed, setClientSeed] = useState<string>("player-default");
  const [pegMap, setPegMap] = useState<PegMap>([]);
  const [path, setPath] = useState<Path>([]);
  const [bin, setBin] = useState<number | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [serverSeed, setServerSeed] = useState<string | null>(null);
  const [commitHex, setCommitHex] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);

  const [muted, setMutedState] = useState<boolean>(() => {
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
      typeof window !== "undefined" &&
      (window as any).matchMedia &&
      (window as any).matchMedia("(prefers-reduced-motion)").matches
    );
  });

  const [animateNow, setAnimateNow] = useState(false);
  const [verifierOpen, setVerifierOpen] = useState(false);

  const startRef = useRef<() => Promise<void> | void>(() => {});
  const commitRef = useRef<() => Promise<void> | void>(() => {});
  const revealRef = useRef<() => Promise<void> | void>(() => {});
  const inputFocusRef = useRef<boolean>(false);

  // ✅ Copy helper
  const copyToClipboard = async (text: string | null, label = "Value") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert(`${label} copied to clipboard ✅`);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert(`${label} copied manually ✅`);
    }
  };

  // ✅ Commit round
  const commitRound = useCallback(async () => {
    try {
      const res = await api.post("/api/rounds/commit");
      setRoundId(res.data.roundId);
      setCommitHex(res.data.commitHex || null);
      setNonce(res.data.nonce || null);
      const newClient = "player-" + Math.random().toString(16).slice(2, 8);
      setClientSeed(newClient);
      setServerSeed(null);
      setPegMap([]);
      setPath([]);
      setBin(null);
      setAnimateNow(false);
      alert(`✅ Round committed: ${res.data.roundId}`);
    } catch (err: any) {
      alert(
        "❌ Commit failed: " + (err?.response?.data?.error || err?.message)
      );
    }
  }, []);

  // ✅ Start round
  const startRound = useCallback(async () => {
    if (!roundId) {
      alert("Please create a round (commit) first.");
      return;
    }
    try {
      const res = await api.post(`/api/rounds/${roundId}/start`, {
        clientSeed,
        betCents,
        dropColumn,
      });
      setPegMap(res.data.pegMap || []);
      setPath(res.data.path || []);
      setBin(res.data.binIndex ?? null);

      setTimeout(() => setAnimateNow(true), 40);

      if (!muted) {
        try {
          const s = new Audio("/assets/land.wav");
          s.volume = 0.3;
          s.play().catch(() => {});
        } catch {}
      }
    } catch (err: any) {
      alert(
        "❌ Error starting round: " +
          (err?.response?.data?.error || err?.message)
      );
    }
  }, [roundId, clientSeed, betCents, dropColumn, muted]);

  // ✅ Reveal round
  const revealRound = useCallback(async () => {
    if (!roundId) {
      alert("No roundId found");
      return;
    }
    try {
      const res = await api.post(`/api/rounds/${roundId}/reveal`, {});
      setServerSeed(res.data.serverSeed || null);
      alert("✅ Round revealed!");
    } catch (err: any) {
      alert(
        "❌ Reveal failed: " + (err?.response?.data?.error || err?.message)
      );
    }
  }, [roundId]);

  // ✅ Verifier modal submission
  const handleVerifySubmit = async (vals: {
    serverSeed: string;
    clientSeed: string;
    nonce: string;
    dropColumn: string;
  }) => {
    try {
      const res = await api.get(
        `/api/verify?serverSeed=${encodeURIComponent(
          vals.serverSeed
        )}&clientSeed=${encodeURIComponent(
          vals.clientSeed
        )}&nonce=${encodeURIComponent(
          vals.nonce
        )}&dropColumn=${encodeURIComponent(vals.dropColumn)}`
      );
      alert(
        `✅ Verified:\nCommit: ${res.data.commitHex}\nBin Index: ${res.data.binIndex}`
      );
      setPegMap(res.data.pegMap || []);
      setPath(res.data.path || []);
      setBin(res.data.binIndex ?? null);
      setTimeout(() => setAnimateNow(true), 40);
    } catch (err: any) {
      alert(
        "❌ Verifier failed: " + (err.response?.data?.error || err.message)
      );
    }
    setVerifierOpen(false);
  };

  // ✅ Hooks
  useEffect(() => {
    startRef.current = startRound;
    commitRef.current = commitRound;
    revealRef.current = revealRound;
  }, [startRound, commitRound, revealRound]);

  // ✅ Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (inputFocusRef.current) return;
      const key = e.key.toLowerCase();
      if (key === "arrowleft") {
        setDropColumn((d) => Math.max(0, d - 1));
      } else if (key === "arrowright") {
        setDropColumn((d) => Math.min(12, d + 1));
      } else if (key === " " || e.code === "Space") {
        e.preventDefault();
        void startRef.current?.();
      } else if (key === "m") {
        setMutedState((m) => {
          const nm = !m;
          localStorage.setItem("muted", nm ? "1" : "0");
          return nm;
        });
      } else if (key === "t") setTilt((t) => !t);
      else if (key === "g") setDebug((d) => !d);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ✅ Helpers
  const onInputFocus = () => (inputFocusRef.current = true);
  const onInputBlur = () => (inputFocusRef.current = false);
  const regenerateClientSeed = () =>
    setClientSeed("player-" + Math.random().toString(16).slice(2, 8));

  return (
    <div style={{ padding: 20 }}>
      <h2>🎮 Plinko (Demo) — ← → Space(drop), M mute, T tilt, G debug</h2>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
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
            onFocus={onInputFocus}
            onBlur={onInputBlur}
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
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </label>

        <label>
          Client seed:
          <input
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            style={{ marginLeft: 8, minWidth: 200 }}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </label>

        <button onClick={regenerateClientSeed}>🎲 Regenerate</button>
        <button onClick={() => void commitRef.current?.()}>Commit</button>
        <button onClick={() => void startRef.current?.()}>Drop</button>
        <button onClick={() => void revealRef.current?.()}>Reveal</button>
        <button onClick={() => setVerifierOpen(true)}>Modal Verify</button>

        {/* ✅ New Verify Page Link */}
        <Link to="/verify">
          <button style={{ background: "#00f5ff", color: "#000" }}>
            🌐 Go to Verify Page
          </button>
        </Link>
      </div>

      {/* Info */}
      <div
        className="round-info"
        style={{
          marginBottom: 20,
          padding: 12,
          borderRadius: 10,
          backgroundColor: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(0,245,255,0.2)",
          boxShadow: "0 0 8px rgba(0,245,255,0.15)",
        }}
      >
        <div>
          <strong>Round:</strong> {roundId ?? "—"} &nbsp; | &nbsp;
          <strong>Bin:</strong> {bin ?? "—"} &nbsp; | &nbsp;
          <strong>Nonce:</strong> {nonce ?? "—"}
        </div>

        {[
          { label: "Commit Hash", value: commitHex },
          { label: "Server Seed", value: serverSeed },
          { label: "Client Seed", value: clientSeed },
        ].map(({ label, value }) => (
          <div key={label} style={{ marginTop: 8 }}>
            <strong>{label}:</strong>
            <input
              readOnly
              value={value ?? "—"}
              onClick={() => copyToClipboard(value, label)}
              style={{
                display: "block",
                width: "100%",
                maxWidth: 700,
                marginTop: 6,
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #00f5ff",
                backgroundColor: "#0a0a0a",
                color: "#00e6e6",
                fontFamily: "monospace",
                cursor: value ? "copy" : "default",
              }}
            />
          </div>
        ))}

        <p
          style={{
            marginTop: 14,
            fontSize: "0.85rem",
            color: "#ccc",
            background: "rgba(255,255,255,0.05)",
            padding: "8px 10px",
            borderRadius: 8,
          }}
        >
          💡 Note: Click <strong>Reveal</strong> to get your Server Seed, then
          verify using Client Seed and Nonce manually or via the Verify page.
        </p>
      </div>

      <Canvas
        pegMap={pegMap}
        path={path}
        dropColumn={dropColumn}
        animate={animateNow}
        onAnimationComplete={() => setAnimateNow(false)}
        debug={debug}
        tilt={tilt}
        reducedMotion={reducedMotion}
      />

      <VerifierModal
        isOpen={verifierOpen}
        onClose={() => setVerifierOpen(false)}
        onVerify={handleVerifySubmit}
        defaultValues={{
          serverSeed: serverSeed || "",
          clientSeed: clientSeed || "",
          nonce: nonce || "",
          dropColumn: String(dropColumn),
        }}
      />
    </div>
  );
}
