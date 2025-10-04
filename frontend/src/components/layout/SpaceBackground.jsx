import React, { useEffect, useRef } from 'react';

const SpaceBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Initialize stars array
    const stars = [];

    // Function to generate stars
    const generateStars = () => {
      stars.length = 0; // Clear existing stars
      const numStars = Math.floor((canvas.width * canvas.height) / 8000);
      const minStars = 150;
      const maxStars = 400;
      const finalStarCount = Math.max(minStars, Math.min(maxStars, numStars));

      for (let i = 0; i < finalStarCount; i++) {
        const starType = Math.random();
        let radius, opacity, color;
        
        if (starType < 0.1) {
          // 10% chance for bright, larger stars
          radius = Math.random() * 2 + 1.5;
          opacity = Math.random() * 0.3 + 0.7;
          color = 'rgba(255, 255, 255, ';
        } else if (starType < 0.2) {
          // 10% chance for slightly blue-tinted stars
          radius = Math.random() * 1.2 + 0.8;
          opacity = Math.random() * 0.6 + 0.4;
          color = 'rgba(200, 220, 255, ';
        } else {
          // 80% regular white stars
          radius = Math.random() * 1.2 + 0.4;
          opacity = Math.random() * 0.7 + 0.3;
          color = 'rgba(255, 255, 255, ';
        }

        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: radius,
          opacity: opacity,
          color: color,
          twinkleSpeed: Math.random() * 0.015 + 0.005,
          twinkleDirection: Math.random() > 0.5 ? 1 : -1
        });
      }
    };

    // Set canvas size and regenerate stars on resize
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      generateStars();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw stars
      stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${star.color}${star.opacity})`;
        ctx.fill();

        // Subtle twinkling effect
        star.opacity += star.twinkleSpeed * star.twinkleDirection;
        if (star.opacity <= 0.2 || star.opacity >= 1) {
          star.twinkleDirection *= -1;
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ 
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 30%, #16213e 70%, #0f3460 100%)'
      }}
    />
  );
};

export default SpaceBackground;