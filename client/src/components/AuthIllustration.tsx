/** Original illustration for the sign-in panel: a stylised neighbourhood with street light, road and service van. */
export function AuthIllustration() {
  return (
    <svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#11164A" /><stop offset="1" stopColor="#1e5a4a" /></linearGradient>
      </defs>
      <rect width="600" height="800" fill="url(#sky)" />
      <circle cx="470" cy="150" r="52" fill="#fef3c7" opacity=".9" />
      <g fill="#0b1038" opacity=".55"><rect x="30" y="360" width="90" height="300" /><rect x="130" y="300" width="70" height="360" /><rect x="210" y="400" width="100" height="260" /><rect x="330" y="330" width="80" height="330" /><rect x="420" y="390" width="110" height="270" /></g>
      <g fill="#fde68a" opacity=".8">{Array.from({ length: 22 }, (_, i) => <rect key={i} x={45 + (i % 5) * 98} y={400 + Math.floor(i / 5) * 48} width="10" height="14" rx="2" />)}</g>
      <rect y="660" width="600" height="140" fill="#0f172a" />
      <rect y="660" width="600" height="10" fill="#16A34A" />
      <g fill="#fff" opacity=".7">{Array.from({ length: 8 }, (_, i) => <rect key={i} x={20 + i * 76} y="735" width="40" height="6" rx="3" />)}</g>
      <g><rect x="150" y="470" width="8" height="190" fill="#94a3b8" /><path d="M154 470h60" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" /><rect x="200" y="466" width="30" height="12" rx="6" fill="#fde68a" />
        <path d="M205 478l-18 90h66l-18-90z" fill="#fde68a" opacity=".14" /></g>
      <g transform="translate(290 600)"><rect width="170" height="64" rx="12" fill="#16A34A" /><rect x="112" y="-24" width="58" height="40" rx="8" fill="#16A34A" /><rect x="122" y="-16" width="38" height="22" rx="4" fill="#bbf7d0" />
        <rect x="14" y="14" width="86" height="12" rx="6" fill="#fff" opacity=".85" /><circle cx="40" cy="68" r="16" fill="#0f172a" /><circle cx="40" cy="68" r="7" fill="#94a3b8" /><circle cx="132" cy="68" r="16" fill="#0f172a" /><circle cx="132" cy="68" r="7" fill="#94a3b8" /></g>
    </svg>
  );
}
