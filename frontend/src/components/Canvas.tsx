// frontend/src/components/Canvas.tsx
import React, { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

type PegMap = number[][];
type Path = string[];

interface CanvasProps {
  pegMap: PegMap;
  path: Path;
  dropColumn: number;
  animate: boolean;
  onAnimationComplete: () => void;
  debug: boolean;
  tilt: boolean;
  reducedMotion: boolean;
}

export default function Canvas({
  pegMap,
  path,
  dropColumn,
  animate,
  onAnimationComplete,
  debug,
  tilt,
  reducedMotion,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // preload tick sound once
    tickRef.current = new Audio("/assets/tick.wav");
    if (tickRef.current) tickRef.current.volume = 0.26;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // sizing
    const W = (canvas.width = 900);
    const H = (canvas.height = 500);

    // layout
    const rows = pegMap.length || 12;
    const startX = 60;
    const endX = W - 60;
    const gapX = (endX - startX) / (13 - 1);
    const gapY = (H - 140) / (rows || 12);

    // helper to draw full scene with given ball coords
    const drawScene = (ballX: number, ballY: number) => {
      ctx.clearRect(0, 0, W, H);

      // tilt transform
      ctx.save();
      if (tilt) {
        ctx.translate(W / 2, H / 2);
        ctx.rotate((3 * Math.PI) / 180); // ~3 degrees
        ctx.translate(-W / 2, -H / 2);
      }

      // background
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, "rgba(0,245,255,0.06)");
      bgGrad.addColorStop(1, "rgba(255,0,242,0.06)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // debug grid
      if (debug) {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
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

      // pegs
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
          ctx.shadowBlur = 0;

          if (debug) {
            ctx.fillStyle = "#bbb";
            ctx.font = "10px monospace";
            ctx.fillText(`${r},${c}`, x + 8, y + 3);
          }
        }
      }

      // bins
      ctx.fillStyle = "rgba(255,255,255,0.12)";
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

      // ball
      ctx.beginPath();
      ctx.arc(ballX, ballY, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#ffcb00";
      ctx.shadowColor = "#ffcb00";
      ctx.shadowBlur = 20;
      ctx.fill();

      // ring for motion (if not reduced)
      if (!reducedMotion) {
        ctx.beginPath();
        ctx.arc(ballX, ballY, 18, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,203,0,0.35)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    };

    // Compute discrete step targets (one per path entry).
    // We'll treat path entries as "R" meaning move one column to the right;
    // other values keep current column. This makes final column = dropColumn + count(R).
    const steps: { x: number; y: number }[] = [];
    let currentCol = dropColumn;
    const startY = 40;
    const rowYs: number[] = [];
    for (let r = 0; r <= rows; r++) {
      rowYs.push(40 + r * gapY);
    }

    // initial position (before any peg)
    steps.push({ x: startX + currentCol * gapX, y: rowYs[0] });

    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      // according to backend earlier, 'R' increments count; handle only 'R' as +1
      if (p === "R") {
        currentCol = currentCol + 1;
      } else if (p === "L") {
        // optional: if backend ever sends 'L', we keep this for completeness
        currentCol = Math.max(0, currentCol - 1);
      } else {
        // any other token -> do nothing (stay in same column)
      }
      const targetRow = Math.min(i + 1, rowYs.length - 1);
      steps.push({ x: startX + currentCol * gapX, y: rowYs[targetRow] });
    }

    // final step ensure we have bottom position (bin row)
    const finalRowY = rowYs[rowYs.length - 1];
    const finalX = startX + currentCol * gapX;
    if (steps.length === 0 || steps[steps.length - 1].y !== finalRowY) {
      steps.push({ x: finalX, y: finalRowY });
    }

    // If not animating, draw final immediately
    if (!animate || path.length === 0) {
      drawScene(finalX, finalRowY);
      // no animation, nothing else
      return;
    }

    // Animation: step-by-step interpolation between consecutive step targets.
    // time-based (ms) for smoothness and consistent timing regardless of framerate.
    const stepDuration = reducedMotion ? 30 : 140; // ms per step (tweak for speed)
    let stepIndex = 0;
    let startTime: number | null = null;
    let from = { x: steps[0].x, y: steps[0].y };
    let to = steps.length > 1 ? steps[1] : steps[0];

    const playTick = () => {
      try {
        if (tickRef.current && !reducedMotion) {
          tickRef.current.currentTime = 0;
          tickRef.current.play().catch(() => {});
        }
      } catch {}
    };

    const animateFrame = (ts: number) => {
      if (startTime === null) startTime = ts;
      const elapsed = ts - startTime;
      const pct = Math.min(1, elapsed / stepDuration);
      // ease-in-out for nicer motion
      const eased = pct < 0.5 ? 2 * pct * pct : -1 + (4 - 2 * pct) * pct;

      const ballX = from.x + (to.x - from.x) * eased;
      const ballY = from.y + (to.y - from.y) * eased;
      drawScene(ballX, ballY);

      if (pct < 1) {
        rafRef.current = requestAnimationFrame(animateFrame);
        return;
      }

      // step finished
      stepIndex++;
      // play tick at the moment of landing on a peg (for every step except the initial)
      playTick();

      if (stepIndex >= steps.length - 1) {
        // reached final target
        drawScene(finalX, finalRowY);
        // celebration
        if (!reducedMotion) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.7 },
            colors: ["#00f5ff", "#ff00f2", "#ffcb00"],
          });
        }
        onAnimationComplete();
        return;
      }

      // prepare next step
      from = { x: to.x, y: to.y };
      to = steps[stepIndex + 1];
      startTime = null;
      rafRef.current = requestAnimationFrame(animateFrame);
    };

    // start animation
    rafRef.current = requestAnimationFrame(animateFrame);

    // cleanup when deps change/unmount
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // deps: animate or inputs changing should restart
  }, [
    pegMap,
    path,
    dropColumn,
    animate,
    tilt,
    reducedMotion,
    onAnimationComplete,
    debug,
  ]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        maxWidth: 900,
        borderRadius: 12,
        margin: "10px auto",
        display: "block",
        boxShadow: "0 0 25px rgba(0,245,255,0.18)",
      }}
    />
  );
}
