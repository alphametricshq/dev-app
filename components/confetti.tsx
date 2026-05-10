"use client";

import { useEffect, useRef } from "react";
import { subscribeConfetti } from "@/lib/celebrations";

const COLORS = [
  "#a070ff", // accent
  "#4ade80", // success
  "#f59e0b", // warning
  "#ef4444", // danger
  "#38bdf8", // sky
  "#f472b6", // pink
];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  shape: "rect" | "circle";
  life: number;
};

const GRAVITY = 0.18;
const DRAG = 0.99;
const PARTICLE_COUNT = 110;
const LIFE = 220;

export function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function spawnBurst() {
      if (!canvas) return;
      const cx = canvas.width / 2;
      const cy = canvas.height - 50;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (Math.random() * Math.PI * 0.7) + Math.PI * 0.15 + Math.PI; // upward fan
        const speed = 8 + Math.random() * 8;
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * 60,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 6 + Math.random() * 6,
          shape: Math.random() > 0.5 ? "rect" : "circle",
          life: LIFE,
        });
      }
      if (animationRef.current == null) loop();
    }

    function loop() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.vy += GRAVITY;
        p.vx *= DRAG;
        p.vy *= DRAG;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.life -= 1;
        if (p.life <= 0 || p.y > canvas.height + 50) {
          ps.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.min(1, p.life / 60);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (ps.length > 0) {
        animationRef.current = requestAnimationFrame(loop);
      } else {
        animationRef.current = null;
      }
    }

    const unsub = subscribeConfetti(() => spawnBurst());

    return () => {
      window.removeEventListener("resize", resize);
      unsub();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[55]"
      aria-hidden
    />
  );
}
