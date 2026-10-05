import React, { useEffect, useRef, useState } from 'react';

export type VideoFlipMode = 'none' | 'horizontal' | 'vertical' | 'both';

interface BackgroundVideoLayerProps {
  videoUrl?: string | null;
  flipMode?: VideoFlipMode;
  opacity?: number;
}

export const BackgroundVideoLayer: React.FC<BackgroundVideoLayerProps> = ({
  videoUrl = '/background.mp4',
  flipMode = 'none',
  opacity = 0.72
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const activeVideoUrl = videoUrl || '/background.mp4';

  // Compute CSS transform based on flipMode
  const getTransform = () => {
    switch (flipMode) {
      case 'horizontal':
        return 'scaleX(-1)';
      case 'vertical':
        return 'scaleY(-1)';
      case 'both':
        return 'scale(-1, -1)';
      default:
        return 'none';
    }
  };

  // Autoplay management with fallback on interaction
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const attemptPlay = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setVideoLoaded(true))
          .catch(() => {
            // Autoplay policy fallback: resume on user interaction
            const resumeOnInteraction = () => {
              video.play().then(() => setVideoLoaded(true)).catch(() => {});
              window.removeEventListener('click', resumeOnInteraction);
              window.removeEventListener('keydown', resumeOnInteraction);
            };
            window.addEventListener('click', resumeOnInteraction, { once: true });
            window.addEventListener('keydown', resumeOnInteraction, { once: true });
          });
      }
    };

    attemptPlay();
  }, [activeVideoUrl]);

  // High-performance cinematic canvas telemetry layer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Global logistics telemetry points (scaled normalized coordinates)
    const hubs = [
      { name: 'YOK', x: 0.82, y: 0.36, ping: 0 },
      { name: 'LAX', x: 0.18, y: 0.38, ping: 0.4 },
      { name: 'SHA', x: 0.77, y: 0.42, ping: 0.8 },
      { name: 'SIN', x: 0.73, y: 0.62, ping: 1.2 },
      { name: 'RTM', x: 0.51, y: 0.28, ping: 1.6 },
      { name: 'HAM', x: 0.53, y: 0.26, ping: 2.0 },
      { name: 'DXB', x: 0.63, y: 0.45, ping: 0.6 },
      { name: 'SSZ', x: 0.32, y: 0.74, ping: 1.0 },
      { name: 'BNE', x: 0.88, y: 0.72, ping: 1.4 },
      { name: 'NYC', x: 0.28, y: 0.34, ping: 1.8 }
    ];

    // Maritime arcs between key hubs
    const routes = [
      [0, 1], // YOK -> LAX
      [2, 3], // SHA -> SIN
      [3, 6], // SIN -> DXB
      [6, 4], // DXB -> RTM
      [4, 5], // RTM -> HAM
      [1, 9], // LAX -> NYC
      [9, 7], // NYC -> SSZ
      [8, 7], // BNE -> SSZ
      [3, 8]  // SIN -> BNE
    ];

    // Ambient floating particles
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.35 + 0.1
      });
    }

    let t = 0;

    const render = () => {
      t += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Render subtle coordinates grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.018)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Render Maritime Corridor Arcs with animated pulse packets
      routes.forEach(([fromIdx, toIdx], rIdx) => {
        const from = hubs[fromIdx];
        const to = hubs[toIdx];
        const fx = from.x * width;
        const fy = from.y * height;
        const tx = to.x * width;
        const ty = to.y * height;

        const mx = (fx + tx) / 2;
        const my = (fy + ty) / 2 - 40;

        // Background arc line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(mx, my, tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated telemetry packet traveling along the arc
        const progress = ((t * 0.25 + rIdx * 0.12) % 1.0);
        const inv = 1 - progress;
        const px = inv * inv * fx + 2 * inv * progress * mx + progress * progress * tx;
        const py = inv * inv * fy + 2 * inv * progress * my + progress * progress * ty;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Global Logistic Hubs
      hubs.forEach((hub) => {
        const hx = hub.x * width;
        const hy = hub.y * height;

        // Radiating ping ring
        const pingPhase = ((t + hub.ping) % 2.5) / 2.5;
        const pingRadius = 6 + pingPhase * 28;
        const pingAlpha = Math.max(0, (1 - pingPhase) * 0.22);

        ctx.strokeStyle = `rgba(255, 255, 255, ${pingAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(hx, hy, pingRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Hub core dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hx, hy, 2, 0, Math.PI * 2);
        ctx.fill();

        // Hub callsign
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(hub.name, hx + 8, hy + 3);
      });

      // Render Floating Telemetry Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const transformStyle = getTransform();

  return (
    <div
      className="cinematic-bg-container"
      aria-hidden="true"
      style={{ '--bg-video-opacity': opacity } as React.CSSProperties}
    >
      {/* Permanent Fixed Non-Scrolling Background Video */}
      <video
        ref={videoRef}
        key={`${activeVideoUrl}-${flipMode}`}
        className="cinematic-bg-video"
        style={{
          transform: transformStyle,
          WebkitTransform: transformStyle,
          opacity: opacity
        }}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onLoadedData={() => setVideoLoaded(true)}
        onCanPlay={() => setVideoLoaded(true)}
      >
        <source src={activeVideoUrl} type="video/mp4" />
      </video>

      {/* Real-time Telemetry Canvas Layer */}
      <canvas
        ref={canvasRef}
        className={`cinematic-bg-canvas ${videoLoaded ? 'video-active' : ''}`}
      />

      {/* Cinematic Vignette Overlay */}
      <div className="cinematic-vignette-overlay" />
      <div className="cinematic-scanline-overlay" />
    </div>
  );
};
