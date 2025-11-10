// frontend/src/components/Canvas.tsx
import React, { useEffect, useRef } from "react";

type PegMap = number[][];
type Path = string[];

export default function Canvas({
  pegMap,
  path,
  debug,
  tilt,
  reducedMotion,
}: {
  pegMap: PegMap;
  path: Path;
  debug: boolean;
  tilt: boolean;
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = (canvas.width = 900);
    const H = (canvas.height = 500);
    ctx.clearRect(0, 0, W, H);

    const rows = pegMap.length || 12;
    const startX = 60;
    const endX = W - 60;
    const gapX = (endX - startX) / (13 - 1);
    const gapY = (H - 140) / (rows || 12);
    ctx.save();

    // Draw pegs (triangle)
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 === 0 ? 0 : gapX / 2;
      for (let c = 0; c < 13; c++) {
        const x = startX + c * gapX + offset;
        const y = 40 + r * gapY;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#cfcfcf";
        ctx.fill();
        if (debug) {
          ctx.fillStyle = "black";
          ctx.fillText(`${r},${c}`, x + 8, y + 4);
        }
      }
    }

    // bins
    ctx.fillStyle = "#eee";
    ctx.fillRect(50, H - 60, W - 100, 30);
    ctx.restore();

    // draw final ball marker if path exists
    if (path && path.length > 0) {
      let pos = 0;
      for (const v of path) if (v === "R") pos++;
      const lastX = startX + pos * gapX;
      const lastY = 40 + rows * gapY;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 12, 0, Math.PI * 2);
      ctx.fillStyle = "orange";
      ctx.fill();
    }
  }, [pegMap, path, debug, tilt, reducedMotion]);

  return <canvas ref={canvasRef} style={{ width: "100%", maxWidth: 900 }} />;
}
