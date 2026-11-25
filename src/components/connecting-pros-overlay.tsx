import type { CSSProperties } from 'react';

const PINS = [
  { x: 160, y: 28, delay: 0 },
  { x: 58, y: 182, delay: 180 },
  { x: 262, y: 182, delay: 360 },
];

const HOUSE = { x: 160, y: 110 };

export function ConnectingProsOverlay({
  title = 'Connecting you with local pros…',
  subtitle = 'Matching your request to verified pros near you.',
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="connecting-overlay fixed inset-0 z-50 flex items-center justify-center bg-gray-950">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 600px at 78% 18%, rgba(240,180,41,.13), transparent 60%),' +
            'radial-gradient(800px 700px at 10% 95%, rgba(240,180,41,.08), transparent 60%)',
        }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-[0.06]" aria-hidden="true">
        <defs>
          <pattern id="connecting-hex" width="52" height="30" patternUnits="userSpaceOnUse" patternTransform="scale(1.4)">
            <path
              d="M13 0 L26 7.5 L26 22.5 L13 30 L0 22.5 L0 7.5 Z"
              fill="none"
              stroke="#f0b429"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#connecting-hex)" />
      </svg>

      <div className="relative flex flex-col items-center gap-8 px-6 text-center">
        <svg viewBox="0 0 320 220" className="h-40 w-56 sm:h-48 sm:w-64" aria-hidden="true">
          {PINS.map((pin) => (
            <line
              key={`line-${pin.x}-${pin.y}`}
              className="connecting-line"
              style={{ '--delay': `${pin.delay}ms` } as CSSProperties}
              x1={HOUSE.x}
              y1={HOUSE.y}
              x2={pin.x}
              y2={pin.y}
              stroke="#de911d"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ))}

          <circle
            className="connecting-pulse-ring"
            cx={HOUSE.x}
            cy={HOUSE.y}
            r="16"
            fill="none"
            stroke="#f0b429"
            strokeWidth="2.5"
          />
          <g transform={`translate(${HOUSE.x - 18} ${HOUSE.y - 16})`}>
            <path d="M0 16 L18 2 L36 16 V34 H0 Z" fill="#f0b429" />
            <rect x="14" y="20" width="8" height="14" fill="#18181b" />
          </g>

          {PINS.map((pin) => (
            <g
              key={`pin-${pin.x}-${pin.y}`}
              className="connecting-pin"
              style={{ '--delay': `${pin.delay + 500}ms` } as CSSProperties}
            >
              <circle cx={pin.x} cy={pin.y} r="11" fill="#f0b429" />
              <circle cx={pin.x} cy={pin.y} r="4" fill="#18181b" />
            </g>
          ))}
        </svg>

        <div>
          <p className="text-lg font-bold text-white sm:text-xl">{title}</p>
          <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
