import React from 'react';

interface XLNCLogoProps {
  className?: string;
  size?: number;
}

export default function XLNCLogo({ className = 'w-20 h-20', size }: XLNCLogoProps) {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <svg
      viewBox="0 0 500 500"
      className={`${className} shrink-0 drop-shadow-md`}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Luxury Metallic Gold Gradients */}
        <linearGradient id="xlncGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F7E28B" />
          <stop offset="35%" stopColor="#D4AF37" />
          <stop offset="70%" stopColor="#9B7811" />
          <stop offset="100%" stopColor="#E5C158" />
        </linearGradient>

        <linearGradient id="xlncGoldLight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E5C158" />
          <stop offset="50%" stopColor="#FFF5C2" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>

        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Gold Ring */}
      <circle
        cx="250"
        cy="250"
        r="240"
        fill="#050505"
        stroke="url(#xlncGold)"
        strokeWidth="14"
      />

      {/* Solid Black Inner Disc */}
      <circle cx="250" cy="250" r="230" fill="#080808" />

      <g transform="translate(0, -10)">
        {/* Custom XLNC Logo Text with Integrated Tick on 'X' */}
        {/* Stylized Checkmark stroke overriding top right leg of 'X' */}
        <path
          d="M 98 238 L 138 238 L 196 122 L 160 122 Z"
          fill="url(#xlncGold)"
        />
        <path
          d="M 125 180 L 158 238 L 225 105 L 195 105 L 145 195 Z"
          fill="url(#xlncGoldLight)"
          filter="url(#goldGlow)"
        />

        {/* XLNC Primary Brand Text */}
        <text
          x="262"
          y="238"
          textAnchor="middle"
          fill="url(#xlncGold)"
          fontSize="118"
          fontWeight="900"
          fontFamily="'Arial Black', 'Impact', sans-serif"
          letterSpacing="2"
        >
          XLNC
        </text>

        {/* EXOTIC HOMES Subtitle */}
        <text
          x="250"
          y="286"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="36"
          fontWeight="800"
          fontFamily="'Montserrat', 'Helvetica Neue', 'Arial', sans-serif"
          letterSpacing="4"
        >
          EXOTIC HOMES
        </text>

        {/* Top White Framing Line */}
        <line x1="72" y1="305" x2="428" y2="305" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />

        {/* DREAMS TO REALITY Slogan */}
        <text
          x="250"
          y="336"
          textAnchor="middle"
          fill="url(#xlncGold)"
          fontSize="25"
          fontWeight="800"
          fontFamily="'Cinzel', 'Trajan Pro', 'Georgia', serif"
          letterSpacing="4"
        >
          DREAMS TO REALITY
        </text>

        {/* Bottom White Framing Line */}
        <line x1="72" y1="354" x2="428" y2="354" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
