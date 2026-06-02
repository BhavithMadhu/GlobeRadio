import React, { useRef, useEffect, useState } from 'react';
import { Globe as GlobeIcon, Radio } from 'lucide-react';
import { Hotspot } from '../types';

interface GlobeProps {
  onSelectCountry: (country: string) => void;
  selectedCountry: string;
}

// Landmark points on the globe: Lat, Lng
const WORLD_HOTSPOTS: Hotspot[] = [
  { id: '1', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { id: '2', country: 'Germany', lat: 52.5200, lng: 13.4050 },
  { id: '3', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { id: '4', country: 'United States', lat: 40.7128, lng: -74.0060 },
  { id: '5', country: 'France', lat: 48.8566, lng: 2.3522 },
  { id: '6', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { id: '7', country: 'Brazil', lat: -22.9068, lng: -43.1729 },
  { id: '8', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { id: '9', country: 'South Africa', lat: -33.9249, lng: 18.4241 },
  { id: '10', country: 'India', lat: 19.0760, lng: 72.8777 },
  { id: '11', country: 'Spain', lat: 40.4168, lng: -3.7038 },
  { id: '12', country: 'Iceland', lat: 64.1466, lng: -21.9426 }
];

export default function Globe({ onSelectCountry, selectedCountry }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [rotation, setRotation] = useState({ x: 0.3, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredHotspot, setHoveredHotspot] = useState<Hotspot | null>(null);
  const rotationRef = useRef(rotation);

  rotationRef.current = rotation;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let size = 600;

    // Resize observer
    const handleResize = () => {
      if (containerRef.current && canvas) {
        const width = containerRef.current.clientWidth;
        size = Math.min(width, 600);
        canvas.width = size;
        canvas.height = size;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Continuous subtle auto-rotation when user is not dragging
    let autoRotateSpeed = 0.0012;

    // Generate procedural grid of dot coordinates indicating continent outlines
    // to give it a highly sophisticated "digital matrix globe" look.
    const continentPoints: { lat: number; lng: number }[] = [];
    const seedContinent = (lat: number, lng: number, radiusLat: number, radiusLng: number, density: number) => {
      for (let i = 0; i < density; i++) {
        continentPoints.push({
          lat: lat + (Math.random() - 0.5) * radiusLat,
          lng: lng + (Math.random() - 0.5) * radiusLng
        });
      }
    };

    // Spawn point clusters representing continents
    seedContinent(40, -100, 20, 40, 140); // North America
    seedContinent(-15, -60, 25, 25, 120);  // South America
    seedContinent(50, 15, 15, 30, 160);   // Europe
    seedContinent(5, 20, 20, 15, 110);    // Africa
    seedContinent(45, 90, 20, 50, 200);   // Asia
    seedContinent(-25, 133, 15, 20, 80);  // Australia
    seedContinent(60, 100, 5, 40, 50);    // Siberia

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      
      const cx = size / 2;
      const cy = size / 2;
      const r = size * 0.42; // Sphere Radius

      // Apply subtle auto-rotation to Y angle
      if (!isDragging) {
        setRotation(prev => ({ ...prev, y: prev.y + autoRotateSpeed }));
      }

      const rotX = rotationRef.current.x;
      const rotY = rotationRef.current.y;

      // Draw beautiful atmosphere background glow
      const glow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.25);
      glow.addColorStop(0, 'rgba(99, 102, 241, 0.03)');
      glow.addColorStop(0.5, 'rgba(99, 102, 241, 0.08)');
      glow.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Draw glass sphere outer ring
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Draw orbital rings
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.04)';
      ctx.lineWidth = 1.5;
      
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.35);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Draw latitude lines (grid)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 0.8;
      for (let lat = -60; lat <= 60; lat += 30) {
        const thetaLat = (lat * Math.PI) / 180;
        const latRadius = r * Math.cos(thetaLat);
        const latY = cy + r * Math.sin(thetaLat) * Math.sin(rotX);
        const scaleY = Math.cos(rotX);

        ctx.save();
        ctx.translate(cx, cy + r * Math.sin(thetaLat));
        ctx.scale(1, scaleY);
        ctx.beginPath();
        ctx.arc(0, 0, latRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw digital continent landmass dot mesh matrix
      ctx.fillStyle = 'rgba(99, 102, 241, 0.42)';
      continentPoints.forEach(pt => {
        const phi = (pt.lat * Math.PI) / 180;
        const lambda = (pt.lng * Math.PI) / 180 + rotY;

        // Spherical coordinate math
        const x3d = Math.cos(phi) * Math.sin(lambda);
        const y3d = Math.sin(phi);
        const z3d = Math.cos(phi) * Math.cos(lambda);

        // Rotate X (looking slightly down)
        const rotX_x = x3d;
        const rotX_y = y3d * Math.cos(rotX) - z3d * Math.sin(rotX);
        const rotX_z = y3d * Math.sin(rotX) + z3d * Math.cos(rotX);

        if (rotX_z > 0) { // On the front of the sphere, so project & draw
          const screenX = cx + rotX_x * r;
          const screenY = cy - rotX_y * r;
          
          // Size based on depth z
          const pointSize = Math.max(1, (rotX_z + 0.3) * 1.8);
          ctx.beginPath();
          ctx.arc(screenX, screenY, pointSize, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Calculate and draw active hotspots list on the sphere representation
      let currentHovered: Hotspot | null = null;

      WORLD_HOTSPOTS.forEach(spot => {
        const phi = (spot.lat * Math.PI) / 180;
        const lambda = (spot.lng * Math.PI) / 180 + rotY;

        const x3d = Math.cos(phi) * Math.sin(lambda);
        const y3d = Math.sin(phi);
        const z3d = Math.cos(phi) * Math.cos(lambda);

        const rotX_x = x3d;
        const rotX_y = y3d * Math.cos(rotX) - z3d * Math.sin(rotX);
        const rotX_z = y3d * Math.sin(rotX) + z3d * Math.cos(rotX);

        // Store screen positions inside object reference
        if (rotX_z > 0) {
          spot.x = cx + rotX_x * r;
          spot.y = cy - rotX_y * r;
          spot.z = rotX_z;
          spot.visible = true;

          const isSelected = selectedCountry?.toLowerCase() === spot.country.toLowerCase();
          
          // Draw standard ping animation ring
          const age = (Date.now() / 1000) % 2;
          ctx.strokeStyle = isSelected ? 'rgba(129, 140, 248, 0.8)' : 'rgba(99, 102, 241, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(spot.x, spot.y, 4 + age * 12, 0, Math.PI * 2);
          ctx.stroke();

          // Draw central hotspot node core
          ctx.fillStyle = isSelected ? '#818cf8' : '#6366f1';
          ctx.shadowColor = '#6366f1';
          ctx.shadowBlur = matchesHover(spot) ? 14 : 4;
          ctx.beginPath();
          ctx.arc(spot.x, spot.y, isSelected ? 6.5 : 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // Reset shadow

          // Check if mouse is hovering over this projected 2D coordinates on canvas
          if (matchesHover(spot)) {
            currentHovered = spot;
          }
        } else {
          spot.visible = false;
        }
      });

      setHoveredHotspot(currentHovered);

      // Render tooltip label for hovered hotspot directly on the Canvas
      if (currentHovered) {
        const spot = currentHovered as Hotspot;
        if (spot.x && spot.y) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          ctx.shadowBlur = 10;
          ctx.fillStyle = 'rgba(10, 10, 10, 0.95)';
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 1;

          const labelText = spot.country;
          ctx.font = '12px Inter, sans-serif';
          const textWidth = ctx.measureText(labelText).width;
          const boxWidth = textWidth + 24;
          const boxHeight = 24;

          const bx = spot.x - boxWidth / 2;
          const by = spot.y - boxHeight - 12;

          // Draw container border & box
          ctx.beginPath();
          ctx.roundRect(bx, by, boxWidth, boxHeight, 4);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Draw small anchor line indicator
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
          ctx.beginPath();
          ctx.moveTo(spot.x, spot.y - 1);
          ctx.lineTo(spot.x, spot.y - 12);
          ctx.stroke();

          // Draw text font
          ctx.fillStyle = '#818cf8';
          ctx.textAlign = 'center';
          ctx.font = 'bold 11px Inter, system-ui';
          ctx.fillText(labelText, spot.x, by + 16);
        }
      }

      animId = requestAnimationFrame(render);
    };

    // Helper checks mouse coordinates from state within radius
    const matchesHover = (spot: Hotspot) => {
      if (!spot.x || !spot.y) return false;
      const dist = Math.hypot(cursorPos.x - spot.x, cursorPos.y - spot.y);
      return dist < 14;
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [rotation, isDragging, selectedCountry]);

  // Track relative cursor position on canvas bounding rect
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCursorPos({ x, y });

    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setRotation(prev => ({
        x: Math.max(-Math.PI / 3, Math.min(Math.PI / 3, prev.x - dy * 0.005)),
        y: prev.y + dx * 0.005
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseClick = () => {
    if (hoveredHotspot) {
      onSelectCountry(hoveredHotspot.country);
    }
  };

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center justify-center py-6 select-none relative">
      {/* Dynamic selection title bar */}
      <div className="absolute top-0 text-center z-10 pointer-events-none">
        <p className="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant font-semibold">
          {selectedCountry ? 'Locked Coordinates' : 'Global Signal Radar'}
        </p>
        <h3 className="text-lg font-bold text-indigo-400 flex items-center justify-center gap-2 mt-1">
          <GlobeIcon className="w-4 h-4 animate-spin-slow" />
          {selectedCountry ? selectedCountry : 'Drag to Rotate & Select'}
        </h3>
      </div>

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleMouseClick}
        className="cursor-grab active:cursor-grabbing max-w-full drop-shadow-[0_0_50px_rgba(99,102,241,0.08)]"
      />

      <div className="flex gap-4 items-center text-[11px] text-neutral-400 mt-3 absolute bottom-0 bg-neutral-900/80 backdrop-blur-xl px-4 py-1.5 rounded-full border border-neutral-800">
        <span className="flex items-center gap-1.5 font-semibold text-indigo-400">
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
          12 Nodes Ready
        </span>
        <span className="w-1 h-1 bg-white/10 rounded-full" />
        <span>Drag map to adjust latitude</span>
      </div>
    </div>
  );
}
