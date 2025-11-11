import React, { useState } from "react";
import axios from "axios";
import Canvas from "../components/Canvas";
import { Link } from "react-router-dom";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000",
});

export default function VerifyPage() {
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState("");
  const [dropColumn, setDropColumn] = useState("6");
  const [pegMap, setPegMap] = useState<number[][]>([]);
  const [path, setPath] = useState<string[]>([]);
  const [bin, setBin] = useState<number | null>(null);
  const [animate, setAnimate] = useState(false);

  const handleVerify = async () => {
    try {
      const res = await api.get(
        `/api/verify?serverSeed=${encodeURIComponent(
          serverSeed
        )}&clientSeed=${encodeURIComponent(
          clientSeed
        )}&nonce=${encodeURIComponent(nonce)}&dropColumn=${encodeURIComponent(
          dropColumn
        )}`
      );
      setPegMap(res.data.pegMap);
      setPath(res.data.path);
      setBin(res.data.binIndex);
      setAnimate(true);
      alert(`✅ Verified! Bin Index: ${res.data.binIndex}`);
    } catch (err: any) {
      alert("❌ Verification failed");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🔍 Verify Round</h2>
      <Link to="/">
        <button>⬅ Back to Game</button>
      </Link>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxWidth: 500,
        }}
      >
        <input
          placeholder="Server Seed"
          value={serverSeed}
          onChange={(e) => setServerSeed(e.target.value)}
        />
        <input
          placeholder="Client Seed"
          value={clientSeed}
          onChange={(e) => setClientSeed(e.target.value)}
        />
        <input
          placeholder="Nonce"
          value={nonce}
          onChange={(e) => setNonce(e.target.value)}
        />
        <input
          type="number"
          placeholder="Drop Column"
          value={dropColumn}
          onChange={(e) => setDropColumn(e.target.value)}
        />
        <button onClick={handleVerify}>Verify</button>
      </div>

      {bin !== null && (
        <div style={{ marginTop: 20, color: "#00f5ff" }}>
          ✅ Result: Bin {bin}
        </div>
      )}

      <Canvas
        pegMap={pegMap}
        path={path}
        dropColumn={Number(dropColumn)}
        animate={animate}
        onAnimationComplete={() => setAnimate(false)}
        debug={false}
        tilt={false}
        reducedMotion={false}
      />
    </div>
  );
}
