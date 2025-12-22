
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export const SnowEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { themeSettings } = useTheme();
  const [isActive, setIsActive] = useState(true);

  // Respect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setIsActive(!mediaQuery.matches);
    handleChange(); // Initial check
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isActive || !themeSettings?.enableSnow) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; radius: number; speed: number; wind: number }[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const particleCount = Math.min(window.innerWidth / 10, 100); // Limit count based on width
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 1,
          speed: Math.random() * 1 + 0.5,
          wind: Math.random() * 0.5 - 0.25,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();

      particles.forEach((p) => {
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      });

      ctx.fill();
      update();
      animationFrameId = requestAnimationFrame(draw);
    };

    const update = () => {
      particles.forEach((p) => {
        p.y += p.speed;
        p.x += p.wind;

        if (p.y > canvas.height) {
          p.y = -5;
          p.x = Math.random() * canvas.width;
        }
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
      });
    };

    window.addEventListener('resize', () => {
      resizeCanvas();
      createParticles();
    });

    resizeCanvas();
    createParticles();
    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, themeSettings?.enableSnow]);

  if (!themeSettings?.enableSnow) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ opacity: 0.6 }}
    />
  );
};
