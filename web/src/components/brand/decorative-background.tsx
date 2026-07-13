// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Brand
// Purpose: Vector-style geometric background for branded hero panels (hexagons,
// torus rings, blurred orbs, grid overlay). Extracted from the enterprise login
// page into a shared component per MASTER_PLAN §6a.
// All shapes are purely visual and non-interactive.

export function DecorativeBackground(): React.ReactElement {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* 20×20 grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Radial orbs — blurred colour blobs for ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: -96,
          right: -96,
          width: 384,
          height: 384,
          borderRadius: '50%',
          background: 'rgba(234,88,12,0.20)',
          filter: 'blur(64px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -96,
          left: -96,
          width: 384,
          height: 384,
          borderRadius: '50%',
          background: 'rgba(234,88,12,0.20)',
          filter: 'blur(64px)',
        }}
      />

      {/* Top-left: large outlined circle + overlapping smaller filled circle */}
      <div
        style={{
          position: 'absolute',
          top: -64,
          left: -64,
          width: 256,
          height: 256,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.07)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          width: 192,
          height: 192,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }}
      />

      {/* Top-right: hexagon */}
      <div
        style={{
          position: 'absolute',
          top: 48,
          right: 48,
          width: 160,
          height: 160,
          background: 'rgba(255,255,255,0.04)',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          transform: 'rotate(12deg)',
        }}
      />

      {/* Middle-right: outlined rounded-square (rotated 45°) + smaller filled */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: -32,
          width: 224,
          height: 224,
          border: '3px solid rgba(255,255,255,0.07)',
          borderRadius: 24,
          transform: 'translateY(-50%) rotate(45deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: 48,
          width: 128,
          height: 128,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 16,
          transform: 'translateY(-50%) rotate(12deg)',
        }}
      />

      {/* Bottom-left: triangle */}
      <div
        style={{
          position: 'absolute',
          bottom: 64,
          left: 16,
          width: 192,
          height: 192,
          background: 'rgba(255,255,255,0.04)',
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          transform: 'rotate(45deg)',
        }}
      />

      {/* Bottom-right cluster: outlined circle + two filled circles */}
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          right: 32,
          width: 160,
          height: 160,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.07)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          right: 80,
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          right: 16,
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }}
      />

      {/* Diagonal lines crossing the panel */}
      <div
        style={{
          position: 'absolute',
          top: '33%',
          left: '25%',
          width: 256,
          height: 2,
          background: 'rgba(255,255,255,0.07)',
          transform: 'rotate(45deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '67%',
          right: '25%',
          width: 192,
          height: 2,
          background: 'rgba(255,255,255,0.07)',
          transform: 'rotate(-45deg)',
        }}
      />

      {/* Center-left: filled trapezoid */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: -16,
          width: 384,
          height: 320,
          background: 'rgba(255,255,255,0.04)',
          clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
          transform: 'translateY(-50%) rotate(-12deg)',
        }}
      />
      {/* Center-left: outlined trapezoid */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 8,
          width: 320,
          height: 256,
          border: '3px solid rgba(255,255,255,0.07)',
          clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
          transform: 'translateY(-50%) rotate(6deg)',
        }}
      />

      {/* Giant centered torus — thick outer ring */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          border: '40px solid rgba(255,255,255,0.04)',
          transform: 'translate(-50%, -50%)',
        }}
      />
      {/* Giant centered torus — thin inner ring */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 372,
          height: 372,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.07)',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Upper-center-right torus — partially off right edge */}
      <div
        style={{
          position: 'absolute',
          top: '18%',
          right: -72,
          width: 288,
          height: 288,
          borderRadius: '50%',
          border: '28px solid rgba(255,255,255,0.05)',
          transform: 'rotate(45deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 'calc(18% + 40px)',
          right: -32,
          width: 208,
          height: 208,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.07)',
        }}
      />
    </div>
  );
}
