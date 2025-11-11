import React, { useState, useEffect } from "react";

interface VerifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (vals: {
    serverSeed: string;
    clientSeed: string;
    nonce: string;
    dropColumn: string;
  }) => void;
  defaultValues?: {
    serverSeed: string;
    clientSeed: string;
    nonce: string;
    dropColumn: string;
  };
}

export default function VerifierModal({
  isOpen,
  onClose,
  onVerify,
  defaultValues,
}: VerifierModalProps) {
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState("");
  const [dropColumn, setDropColumn] = useState("6");

  useEffect(() => {
    if (defaultValues) {
      setServerSeed(defaultValues.serverSeed || "");
      setClientSeed(defaultValues.clientSeed || "");
      setNonce(defaultValues.nonce || "");
      setDropColumn(defaultValues.dropColumn || "6");
    }
  }, [defaultValues]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onVerify({ serverSeed, clientSeed, nonce, dropColumn });
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: "#111",
          border: "1px solid #00f5ff",
          borderRadius: 12,
          padding: 20,
          width: "90%",
          maxWidth: 480,
          boxShadow: "0 0 20px rgba(0,245,255,0.3)",
          fontFamily: "Inter, system-ui",
        }}
      >
        <h3 style={{ marginBottom: 12, color: "#00e6e6" }}>🔍 Verify Round</h3>
        <form onSubmit={handleSubmit}>
          {[
            {
              label: "Server Seed",
              value: serverSeed,
              setter: setServerSeed,
              placeholder: "Paste or auto-filled",
            },
            {
              label: "Client Seed",
              value: clientSeed,
              setter: setClientSeed,
              placeholder: "Paste or auto-filled",
            },
            {
              label: "Nonce",
              value: nonce,
              setter: setNonce,
              placeholder: "Paste or auto-filled",
            },
          ].map((f) => (
            <div key={f.label} style={{ marginBottom: 12 }}>
              <label style={{ display: "block", color: "#ccc" }}>
                {f.label}:
              </label>
              <input
                value={f.value}
                onChange={(e) => f.setter(e.target.value)}
                placeholder={f.placeholder}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #00f5ff",
                  background: "#0a0a0a",
                  color: "#00ffff",
                  fontFamily: "monospace",
                }}
              />
            </div>
          ))}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: "#ccc" }}>
              Drop Column:
            </label>
            <input
              type="number"
              min={0}
              max={12}
              value={dropColumn}
              onChange={(e) => setDropColumn(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #00f5ff",
                background: "#0a0a0a",
                color: "#00ffff",
                fontFamily: "monospace",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "linear-gradient(135deg,#444,#222)",
                color: "#ccc",
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                background: "linear-gradient(135deg,#00f5ff,#ff00f2)",
                color: "white",
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
              }}
            >
              Verify
            </button>
          </div>
        </form>

        <p
          style={{
            fontSize: "0.8rem",
            color: "#999",
            marginTop: 14,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          💡 Fields are pre-filled automatically, but you can change them
          manually to verify any round.
        </p>
      </div>
    </div>
  );
}
