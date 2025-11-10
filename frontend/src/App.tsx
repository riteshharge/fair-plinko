import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import Canvas from "./components/Canvas";
import "./styles.css";

const api = axios.create({
  baseURL: "http://localhost:4000", // local dev
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
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion)").matches
    );
  });

  const startRef = useRef<() => Promise<void> | void>(() => {});
  const commitRef = useRef<() => Promise<void> | void>(() => {});
  const revealRef = useRef<() => Promise<void> | void>(() => {});
  const inputFocusRef = useRef<boolean>(false);

  // Copy helper
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
      try {
        document.execCommand("copy");
        alert(`${label} copied to clipboard ✅`);
      } catch {
        alert(`Copy failed — please copy manually`);
      }
      document.body.removeChild(ta);
    }
    // Always blur to re-enable keyboard controls
    (document.activeElement as HTMLElement)?.blur();
    inputFocusRef.current = false;
  };

  // Commit round
  const commitRound = useCallback(async () => {
    try {
      const res = await api.post("/api/rounds/commit");
      setRoundId(res.data.roundId);
      setCommitHex(res.data.commitHex || null);
      const newClient = "player-" + Math.random().toString(16).slice(2, 8);
      setClientSeed(newClient);
      setServerSeed(null);
      setPegMap([]);
      setPath([]);
      setBin(null);
      alert(
        `✅ Round committed:\n${res.data.roundId}\nCommit: ${
          res.data.commitHex || "—"
        }`
      );
    } catch (err: any) {
      console.error("Commit failed:", err);
      alert(
        "❌ Commit failed: " + (err?.response?.data?.error || err?.message)
      );
    }
  }, []);

  // Start round
  const startRound = useCallback(async () => {
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
        "Error starting round: " + (err?.response?.data?.error || err?.message)
      );
    }
  }, [roundId, clientSeed, betCents, dropColumn, muted]);

  // Reveal round
  const revealRound = useCallback(async () => {
    if (!roundId) {
      alert("No roundId found");
      return;
    }
    try {
      const res = await api.post(`/api/rounds/${roundId}/reveal`, {});
      setServerSeed(res.data.serverSeed || null);
      if (!res.data.serverSeed)
        alert("⚠️ No serverSeed revealed — check backend logs!");
      else alert("✅ Round revealed!");
    } catch (err: any) {
      console.error("Reveal failed:", err);
      alert(
        "❌ Reveal failed: " + (err?.response?.data?.error || err?.message)
      );
    }
  }, [roundId]);

  // Verifier
  const openVerifier = async () => {
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
        `Verifier result:\nCommit: ${res.data.commitHex}\nBin Index: ${res.data.binIndex}`
      );
      setPegMap(res.data.pegMap || []);
      setPath(res.data.path || []);
      setBin(res.data.binIndex ?? null);
    } catch (err: any) {
      alert(
        "❌ Verifier failed: " + (err.response?.data?.error || err.message)
      );
    }
  };

  useEffect(() => {
    startRef.current = startRound;
    commitRef.current = commitRound;
    revealRef.current = revealRound;
  }, [startRound, commitRound, revealRound]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (inputFocusRef.current) return;
      const key = e.key.toLowerCase();
      if (key === "arrowleft") {
        setDropColumn((d) => Math.max(0, d - 1));
        e.preventDefault();
      } else if (key === "arrowright") {
        setDropColumn((d) => Math.min(12, d + 1));
        e.preventDefault();
      } else if (key === " " || e.code === "Space") {
        e.preventDefault();
        void startRef.current?.();
      } else if (key === "m") {
        setMutedState((m) => {
          const nm = !m;
          localStorage.setItem("muted", nm ? "1" : "0");
          return nm;
        });
      } else if (key === "t") {
        setTilt((t) => !t);
      } else if (key === "g") {
        setDebug((d) => !d);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reduced motion listener
  useEffect(() => {
    const mq =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion)")
        : null;
    if (!mq) return;
    const f = (ev: MediaQueryListEvent) => setReducedMotion(ev.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  const onInputFocus = () => (inputFocusRef.current = true);
  const onInputBlur = () => (inputFocusRef.current = false);
  const regenerateClientSeed = () =>
    setClientSeed("player-" + Math.random().toString(16).slice(2, 8));

  return (
    <div style={{ padding: 20 }}>
      <h2>Plinko (Demo) — ← → Space(drop), M mute, T tilt, G debug</h2>

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
            placeholder="optional clientSeed"
            style={{ marginLeft: 8, minWidth: 200 }}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </label>

        <button onClick={regenerateClientSeed}>🎲 Regenerate</button>
        <button onClick={() => void commitRef.current?.()}>Commit</button>
        <button onClick={() => void startRef.current?.()}>Drop</button>
        <button onClick={() => void revealRef.current?.()}>Reveal</button>
        <button onClick={openVerifier}>Verifier</button>
        <button
          onClick={() =>
            setMutedState((m) => {
              const nm = !m;
              try {
                localStorage.setItem("muted", nm ? "1" : "0");
              } catch {}
              return nm;
            })
          }
        >
          {muted ? "Unmute (M)" : "Mute (M)"}
        </button>
      </div>

      {/* Copyable seed display fields */}
      <div className="round-info" style={{ marginBottom: 12 }}>
        <div>
          <strong>Bin result:</strong> {bin ?? "---"} &nbsp; | &nbsp;
          <strong>Round:</strong> {roundId ?? "none"}
        </div>

        {[
          { label: "Commit Hash", value: commitHex },
          { label: "Server Seed (Revealed)", value: serverSeed },
          { label: "Client Seed", value: clientSeed },
        ].map(({ label, value }) => (
          <div key={label} style={{ marginTop: 8 }}>
            <strong>{label}:</strong>
            <input
              readOnly
              value={value ?? "—"}
              onFocus={(e) => {
                e.currentTarget.select();
                onInputFocus();
              }}
              onBlur={onInputBlur}
              onClick={() => copyToClipboard(value, label)}
              title="Click to copy"
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
          Reduced motion: {String(reducedMotion)} | Tilt: {String(tilt)} |
          Debug: {String(debug)}
        </small>
      </div>
    </div>
  );
}
