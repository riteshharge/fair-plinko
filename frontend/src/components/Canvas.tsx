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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = (canvas.width = 900);
    const H = (canvas.height = 500);
    const rows = pegMap.length || 12;
    const startX = 60;
    const endX = W - 60;
    const gapX = (endX - startX) / (13 - 1);
    const gapY = (H - 140) / (rows || 12);

    const tick = new Audio("/assets/tick.wav");
    tick.volume = 0.3;

    const playTick = () => {
      try {
        tick.currentTime = 0;
        tick.play();
      } catch {}
    };

    const drawFrame = (ballY: number, ballX: number) => {
      ctx.clearRect(0, 0, W, H);

      // tilt
      ctx.save();
      if (tilt) {
        ctx.translate(W / 2, H / 2);
        ctx.rotate((3 * Math.PI) / 180);
        ctx.translate(-W / 2, -H / 2);
      }

      // background
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, "rgba(0,245,255,0.08)");
      bgGrad.addColorStop(1, "rgba(255,0,242,0.08)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

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
        }
      }

      // bins
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(50, H - 60, W - 100, 30);
      ctx.strokeStyle = "#00f5ff";
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

      ctx.restore();
    };

    let frame = 0;
    let anim: number;

    const totalFrames = 120;
    const startY = 40;
    const endY = 40 + rows * gapY;
    const xStart = startX + dropColumn * gapX;
    const directionPath = path;

    if (animate && directionPath.length > 0) {
      let posX = xStart;
      let step = 0;
      const stepY = (endY - startY) / directionPath.length;

      const animateBall = () => {
        const progress = frame / totalFrames;
        const targetY = startY + progress * (endY - startY);

        // simulate pegs along the way
        if (
          frame % Math.floor(totalFrames / directionPath.length) === 0 &&
          step < directionPath.length
        ) {
          if (directionPath[step] === "R") posX += gapX / 2;
          else posX -= gapX / 2;
          if (!reducedMotion) playTick();
          step++;
        }

        drawFrame(targetY, posX);
        frame++;

        if (frame <= totalFrames) {
          anim = requestAnimationFrame(animateBall);
        } else {
          cancelAnimationFrame(anim);
          onAnimationComplete();
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.7 },
            colors: ["#00f5ff", "#ff00f2", "#ffcb00"],
          });
        }
      };

      animateBall();
    } else {
      const finalX = startX + dropColumn * gapX;
      drawFrame(endY, finalX);
    }
  }, [
    pegMap,
    path,
    dropColumn,
    animate,
    tilt,
    reducedMotion,
    onAnimationComplete,
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
        boxShadow: "0 0 25px rgba(0,245,255,0.2)",
      }}
    />
  );
}
