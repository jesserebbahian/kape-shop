import { useState } from 'react';

const BAG_COLORS = {
  'Single Origin': '#0e5a4a',
  Blend: '#2d3e63',
  Barako: '#6a2c2c',
  Robusta: '#3b3f45',
  Specialty: '#5d3a72'
};

const BEAN_COLORS = { light: '#e0b873', medium: '#a8743a', dark: '#4a2c1b' };

const wrapName = (name, max) => {
  const lines = [];
  let line = '';
  for (const word of name.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
};

export default function CoffeeImage({ product, size = 'card' }) {
  const [broken, setBroken] = useState(false);

  if (product.imageUrl && !broken) {
    return <img className={`coffee-img ${size}`} src={product.imageUrl} alt={`${product.name} coffee`} loading="lazy" onError={() => setBroken(true)} />;
  }

  const bag = BAG_COLORS[product.category] || '#0e5a4a';
  const bean = BEAN_COLORS[product.roastLevel] || BEAN_COLORS.medium;
  const lines = wrapName(product.name, 14);
  const fontSize = lines.length > 2 ? 11 : 13;
  const firstY = lines.length > 2 ? 146 : 150;

  return (
    <svg className={`coffee-img ${size}`} viewBox="0 0 200 240" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${product.name}, ${product.roastLevel} roast coffee bag`}>
      <rect width="200" height="240" style={{ fill: 'var(--tile)' }} />
      <ellipse cx="100" cy="228" rx="64" ry="6" fill="#000" fillOpacity="0.14" />
      <path d="M34 46 H166 L173 214 Q173 223 164 223 H36 Q27 223 27 214 Z" fill={bag} />
      <rect x="34" y="28" width="132" height="20" rx="3" fill={bag} />
      <rect x="34" y="28" width="132" height="20" rx="3" fill="#000" fillOpacity="0.22" />
      {Array.from({ length: 11 }, (_, i) => (
        <line key={i} x1={42 + i * 11.6} y1="31" x2={42 + i * 11.6} y2="45" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" />
      ))}
      <rect x="46" y="80" width="108" height="106" rx="6" fill="#f7f5ef" />
      <g transform="translate(100 104) rotate(-25)">
        <ellipse rx="11" ry="15" fill={bean} />
        <path d="M0 -14 C-5 -5 5 5 0 14" fill="none" stroke="#f7f5ef" strokeWidth="2" strokeLinecap="round" />
      </g>
      <text x="100" y="134" textAnchor="middle" fontSize="8" letterSpacing="1.4" fill="#5b6862" fontFamily="'Instrument Sans', sans-serif">
        {product.category.toUpperCase()}
      </text>
      {lines.map((line, i) => (
        <text key={line} x="100" y={firstY + i * (fontSize + 3)} textAnchor="middle" fontSize={fontSize} fontWeight="700" fill="#15211d" fontFamily="'Bricolage Grotesque', 'Instrument Sans', sans-serif">
          {line}
        </text>
      ))}
      <text x="100" y="208" textAnchor="middle" fontSize="9" letterSpacing="1.2" fill="#fff" fillOpacity="0.9" fontFamily="'Instrument Sans', sans-serif">
        {`${product.roastLevel.toUpperCase()} ROAST`}
      </text>
    </svg>
  );
}
