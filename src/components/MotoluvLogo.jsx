import React from 'react';

/**
 * Motoluv Official Vector Brand Logo Component
 * Matches the official identity:
 * - "MOTO" in crisp white with angular geometric racing cuts and italic slant.
 * - "LUV" in crisp white enclosed inside a red rounded badge (#E10600).
 * - "SUBE CONECTA RUEDA" slogan in bold red wide tracking below.
 */
export const MotoluvLogo = ({ className = 'h-8 md:h-9 w-auto', showSlogan = false, inverted = false }) => {
  return (
    <svg
      viewBox={showSlogan ? "0 0 740 230" : "0 0 700 160"}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible', display: 'block' }}
      aria-label="Motoluv - Sube Conecta Rueda"
      role="img"
    >
      <defs>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Teko:wght@700&family=Montserrat:ital,wght@1,900&display=swap');
            .motoluv-main-text {
              font-family: 'Montserrat', ui-sans-serif, system-ui, -apple-system, sans-serif;
              font-weight: 900;
              font-style: italic;
              text-transform: uppercase;
            }
            .motoluv-slogan-text {
              font-family: 'Montserrat', ui-sans-serif, system-ui, -apple-system, sans-serif;
              font-weight: 900;
              font-style: italic;
              text-transform: uppercase;
            }
          `}
        </style>
        {/* Subtle drop glow for the red badge */}
        <filter id="motoluv-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#E10600" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Main Row: MOTO + [LUV Badge] */}
      <g transform="translate(10, 15)">
        {/* Vectorized Custom Glyphs for MOTO */}
        {/* M */}
        <path
          d="M20 120 L48 20 L88 20 L108 80 L128 20 L168 20 L140 120 L108 120 L94 66 L78 120 Z"
          fill={inverted ? "#0a0a0a" : "#FFFFFF"}
        />
        {/* O */}
        <path
          d="M205 20 L275 20 C295 20 305 32 300 52 L285 105 C280 118 268 120 248 120 L180 120 C160 120 152 108 156 88 L170 38 C175 24 188 20 205 20 Z M215 94 L245 94 C255 94 259 90 261 82 L268 46 C270 38 266 36 256 36 L226 36 C216 36 211 40 209 48 L202 84 C200 92 205 94 215 94 Z"
          fill={inverted ? "#0a0a0a" : "#FFFFFF"}
        />
        {/* T */}
        <path
          d="M298 36 L302 20 L382 20 L378 36 L348 36 L328 120 L298 120 L318 36 Z"
          fill={inverted ? "#0a0a0a" : "#FFFFFF"}
        />
        {/* O */}
        <path
          d="M405 20 L475 20 C495 20 505 32 500 52 L485 105 C480 118 468 120 448 120 L380 120 C360 120 352 108 356 88 L370 38 C375 24 388 20 405 20 Z M415 94 L445 94 C455 94 459 90 461 82 L468 46 C470 38 466 36 456 36 L426 36 C416 36 411 40 409 48 L402 84 C400 92 405 94 415 94 Z"
          fill={inverted ? "#0a0a0a" : "#FFFFFF"}
        />

        {/* Red Pill / Rounded Container behind LUV */}
        <rect
          x="500"
          y="10"
          width="215"
          height="115"
          rx="18"
          ry="18"
          fill="#E10600"
          filter="url(#motoluv-glow)"
        />

        {/* LUV Glyphs inside the Red Badge */}
        {/* L */}
        <path
          d="M532 30 L558 30 L540 92 L585 92 L580 108 L516 108 Z"
          fill="#FFFFFF"
        />
        {/* U */}
        <path
          d="M592 30 L618 30 L607 76 C604 88 610 93 620 93 C630 93 638 88 641 76 L652 30 L678 30 L666 76 C660 100 644 110 622 110 C600 110 588 100 592 76 Z"
          fill="#FFFFFF"
        />
        {/* V */}
        <path
          d="M685 30 L712 30 L675 108 L648 108 Z"
          fill="#FFFFFF"
        />
      </g>

      {/* Slogan Row: SUBE CONECTA RUEDA in red angled display font */}
      {showSlogan && (
        <g transform="translate(10, 160)">
          <text
            x="485"
            y="35"
            fill="#E10600"
            className="motoluv-slogan-text"
            fontSize="32"
            letterSpacing="9"
            textAnchor="middle"
          >
            SUBE CONECTA RUEDA
          </text>
        </g>
      )}
    </svg>
  );
};

export default MotoluvLogo;
