import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const api = axios.create({
  baseURL:
    (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:4000",
});

interface VerifyResult {
  commitHex: string;
  binIndex: number;
  pegMap?: number[][];
  path?: string[];
}

export default function VerifyPage() {
  const navigate = useNavigate();

  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState("");
  const [dropColumn, setDropColumn] = useState("6");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  //  Autofill and sync with localStorage
  useEffect(() => {
    const s = localStorage.getItem("serverSeed");
    const c = localStorage.getItem("clientSeed");
    const n = localStorage.getItem("nonce");
    const d = localStorage.getItem("dropColumn");

    if (s) setServerSeed(s);
    if (c) setClientSeed(c);
    if (n) setNonce(n);
    if (d) setDropColumn(d);
  }, []);

  //  Auto-save changes to localStorage
  useEffect(() => {
    localStorage.setItem("serverSeed", serverSeed);
  }, [serverSeed]);

  useEffect(() => {
    localStorage.setItem("clientSeed", clientSeed);
  }, [clientSeed]);

  useEffect(() => {
    localStorage.setItem("nonce", nonce);
  }, [nonce]);

  useEffect(() => {
    localStorage.setItem("dropColumn", dropColumn);
  }, [dropColumn]);

  //  Verify function
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverSeed || !clientSeed || !nonce) {
      alert("Please fill in Server Seed, Client Seed, and Nonce.");
      return;
    }

    setLoading(true);
    setResult(null);
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
      setResult(res.data);
      alert(" Verification successful!");
    } catch (err: any) {
      alert(
        "❌ Verification failed: " + (err.response?.data?.error || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: 700,
        margin: "0 auto",
        color: "#e0e0e0",
        fontFamily: "sans-serif",
      }}
    >
      <h2 style={{ color: "#00f5ff", marginBottom: 20 }}>
        Verify Round Fairness
      </h2>

      <form
        onSubmit={handleVerify}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          background: "rgba(0,0,0,0.4)",
          padding: 20,
          borderRadius: 10,
          border: "1px solid rgba(0,245,255,0.3)",
          boxShadow: "0 0 10px rgba(0,245,255,0.2)",
        }}
      >
        <label>
          Server Seed:
          <input
            type="text"
            value={serverSeed}
            onChange={(e) => setServerSeed(e.target.value)}
            placeholder="Enter or auto-filled server seed"
            style={inputStyle}
          />
        </label>

        <label>
          Client Seed:
          <input
            type="text"
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            placeholder="Enter or auto-filled client seed"
            style={inputStyle}
          />
        </label>

        <label>
          Nonce:
          <input
            type="text"
            value={nonce}
            onChange={(e) => setNonce(e.target.value)}
            placeholder="Enter or auto-filled nonce"
            style={inputStyle}
          />
        </label>

        <label>
          Drop Column:
          <input
            type="number"
            min={0}
            max={12}
            value={dropColumn}
            onChange={(e) => setDropColumn(e.target.value)}
            style={inputStyle}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 16px",
            backgroundColor: loading ? "#555" : "#00f5ff",
            color: "#000",
            fontWeight: 600,
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            transition: "0.2s",
          }}
        >
          {loading ? "Verifying..." : "Verify Round"}
        </button>
      </form>

      {result && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 10,
            background: "rgba(0,245,255,0.05)",
            border: "1px solid rgba(0,245,255,0.2)",
          }}
        >
          <h3 style={{ color: "#00f5ff" }}>Verification Result</h3>
          <p>
            <strong>Commit Hash:</strong> {result.commitHex}
          </p>
          <p>
            <strong>Bin Index:</strong> {result.binIndex}
          </p>
        </div>
      )}

      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: 20,
          background: "transparent",
          border: "1px solid #00f5ff",
          color: "#00f5ff",
          padding: "8px 14px",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        ← Back to Game
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid rgba(0,245,255,0.4)",
  backgroundColor: "#0a0a0a",
  color: "#00f5ff",
  fontFamily: "monospace",
  marginTop: 4,
};
