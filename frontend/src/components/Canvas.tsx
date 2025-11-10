// frontend/src/components/Canvas.tsx
import React, { useEffect, useRef } from "react";

type PegMap = number[][];
type Path = string[];

interface CanvasProps {
  pegMap: PegMap;
  path: Path;
  debug: boolean;
  tilt: boolean;
  reducedMotion: boolean;
}

export default function Canvas({
  pegMap,
  path,
  debug,
  tilt,
  reducedMotion,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = (canvas.width = 900);
    const H = (canvas.height = 500);
    ctx.globalAlpha = 0.9;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // --- Tilt rotation ---
    ctx.save();
    if (tilt) {
      ctx.translate(W / 2, H / 2);
      ctx.rotate((3 * Math.PI) / 180);
      ctx.translate(-W / 2, -H / 2);
    }

    const rows = pegMap.length || 12;
    const startX = 60;
    const endX = W - 60;
    const gapX = (endX - startX) / (13 - 1);
    const gapY = (H - 140) / (rows || 12);

    // --- Background gradient ---
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "rgba(0,245,255,0.08)");
    bgGrad.addColorStop(1, "rgba(255,0,242,0.08)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // --- Draw pegs ---
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 === 0 ? 0 : gapX / 2;
      for (let c = 0; c < 13; c++) {
        const x = startX + c * gapX + offset;
        const y = 40 + r * gapY;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#00f5ff";
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;

        if (debug) {
          ctx.fillStyle = "#999";
          ctx.font = "10px monospace";
          ctx.fillText(`${r},${c}`, x + 8, y + 3);
        }
      }
    }

    // --- Bins ---
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(50, H - 60, W - 100, 30);
    ctx.strokeStyle = "#00f5ff";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 13; i++) {
      const x = 50 + (i * (W - 100)) / 13;
      ctx.beginPath();
      ctx.moveTo(x, H - 60);
      ctx.lineTo(x, H - 30);
      ctx.stroke();
    }

    // --- Result ball ---
    if (path && path.length > 0) {
      let pos = 0;
      for (const v of path) if (v === "R") pos++;
      const lastX = startX + pos * gapX;
      const lastY = 40 + rows * gapY;

      ctx.beginPath();
      ctx.arc(lastX, lastY, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#ffcb00";
      ctx.shadowColor = "#ffcb00";
      ctx.shadowBlur = 20;
      ctx.fill();

      if (!reducedMotion) {
        ctx.beginPath();
        ctx.arc(lastX, lastY, 18, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,203,0,0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    // --- Debug grid ---
    if (debug) {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [pegMap, path, debug, tilt, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        maxWidth: 900,
        borderRadius: 12,
        margin: "10px auto",
        display: "block",
        transition: "transform 0.3s ease",
        boxShadow: "0 0 25px rgba(0,245,255,0.2)",
      }}
    />
  );
}
