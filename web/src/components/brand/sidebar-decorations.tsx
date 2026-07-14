// Author: Robert Massey | Created: 2026-07-14 | Module: Web / Brand
// Purpose: The login hero's geometric language (torus rings, hexagon, orbs,
// diagonals) scaled down for the 240px dashboard sidebar. Colors derive from
// sidebar theme tokens so every [data-theme] keeps the shapes visible but
// subtle. Sits behind nav content — parent must be relative; content z-10.

export function SidebarDecorations(): React.ReactElement {
  const stroke = 'hsl(var(--sidebar-foreground) / 0.07)';
  const fill = 'hsl(var(--sidebar-foreground) / 0.04)';

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Fine grid — carried over from the previous sidebar-grid treatment */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            `linear-gradient(${fill} 1px, transparent 1px), ` +
            `linear-gradient(90deg, ${fill} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ambient brand-orange orbs, top and bottom */}
      <div
        style={{
          position: 'absolute',
          top: -70,
          right: -70,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'hsl(var(--primary) / 0.12)',
          filter: 'blur(48px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -80,
          left: -60,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: 'hsl(var(--primary) / 0.10)',
          filter: 'blur(56px)',
        }}
      />

      {/* Upper-left: outlined circle + smaller filled companion */}
      <div
        style={{
          position: 'absolute',
          top: 88,
          left: -48,
          width: 128,
          height: 128,
          borderRadius: '50%',
          border: `2px solid ${stroke}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 128,
          left: -8,
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: fill,
        }}
      />

      {/* Upper-right: hexagon */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          right: -28,
          width: 96,
          height: 96,
          background: fill,
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          transform: 'rotate(12deg)',
        }}
      />

      {/* Mid: torus ring pushed off the left edge */}
      <div
        style={{
          position: 'absolute',
          top: '48%',
          left: -90,
          width: 200,
          height: 200,
          borderRadius: '50%',
          border: `20px solid ${fill}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 'calc(48% + 26px)',
          left: -64,
          width: 148,
          height: 148,
          borderRadius: '50%',
          border: `2px solid ${stroke}`,
        }}
      />

      {/* Diagonal accent line */}
      <div
        style={{
          position: 'absolute',
          top: '38%',
          right: -20,
          width: 130,
          height: 2,
          background: stroke,
          transform: 'rotate(-45deg)',
        }}
      />

      {/* Lower-right: rotated rounded square + filled companion */}
      <div
        style={{
          position: 'absolute',
          bottom: 130,
          right: -40,
          width: 120,
          height: 120,
          border: `2px solid ${stroke}`,
          borderRadius: 16,
          transform: 'rotate(45deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 150,
          right: 4,
          width: 64,
          height: 64,
          background: fill,
          borderRadius: 10,
          transform: 'rotate(12deg)',
        }}
      />

      {/* Bottom-left: triangle */}
      <div
        style={{
          position: 'absolute',
          bottom: 36,
          left: 12,
          width: 96,
          height: 96,
          background: fill,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          transform: 'rotate(45deg)',
        }}
      />
    </div>
  );
}
