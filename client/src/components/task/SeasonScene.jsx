// Cảnh động 12 giây lặp: thu (cô gái đạp xe dưới hàng cây, lá rơi) -> mờ dần -> đông (tuyết, người tuyết, ông già Noel) -> mờ dần về thu.
// Chỉ trang trí nên aria-hidden. Mọi chuyển động là CSS (transform/opacity), tắt khi người dùng chọn giảm chuyển động.
const TREES = [[50, "#ea580c", "#f59e0b", "#dc2626"], [170, "#f59e0b", "#ea580c", "#b45309"], [290, "#dc2626", "#f59e0b", "#ea580c"], [410, "#ea580c", "#dc2626", "#f59e0b"], [525, "#f59e0b", "#ea580c", "#dc2626"]];
const LEAVES = [[30, 0, 4.2, 18, "#ea580c"], [95, 1.3, 5, -22, "#f59e0b"], [150, 0.6, 4.6, 16, "#dc2626"], [215, 2.1, 5.2, -14, "#f59e0b"], [270, 0.2, 4.4, 24, "#ea580c"], [335, 1.7, 4.8, -20, "#dc2626"], [390, 0.9, 5.4, 12, "#f59e0b"], [455, 2.5, 4.3, -18, "#ea580c"], [505, 1.1, 5, 20, "#dc2626"]];
const FLAKES = [[20, 0, 5.5, 10, 2.4], [70, 2.2, 6.5, -12, 1.8], [120, 0.7, 5, 14, 2.8], [175, 3.4, 6, -10, 2], [230, 1.5, 7, 12, 1.6], [285, 4, 5.2, -14, 2.6], [340, 0.3, 6.2, 10, 2], [395, 2.8, 5.8, -12, 2.4], [450, 1.1, 6.8, 14, 1.8], [500, 3.7, 5.4, -10, 2.8], [545, 0.5, 6.4, 12, 2.2], [45, 4.6, 6.1, -8, 1.6], [205, 5.2, 5.7, 9, 2.2], [370, 4.4, 6.6, -9, 1.8]];

export default function SeasonScene() {
  return (
    <svg className="cn-scene" viewBox="0 0 560 190" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
      <g className="cn-aut">
        <rect x="0" y="150" width="560" height="40" fill="#f59e0b" opacity=".35" />
        <rect x="0" y="164" width="560" height="26" fill="#92400e" opacity=".22" />
        <path d="M0 177h560" stroke="#fff" strokeWidth="2" strokeDasharray="16 14" opacity=".7" />
        {TREES.map(([x, a, b, c]) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <rect x="-5" y="100" width="10" height="54" rx="4" fill="#7c2d12" />
            <circle cx="0" cy="86" r="30" fill={a} />
            <circle cx="-19" cy="104" r="20" fill={b} />
            <circle cx="19" cy="104" r="20" fill={c} />
          </g>
        ))}
        {LEAVES.map(([x, delay, dur, dx, fill]) => (
          <ellipse key={x} className="cn-leaf" cx={x} cy="20" rx="4" ry="2.4" fill={fill} style={{ "--dx": `${dx}px`, animationDelay: `${delay}s`, animationDuration: `${dur}s` }} />
        ))}
        <g className="cn-rider">
          <g transform="translate(0 150)">
            <g className="cn-ponytail"><ellipse cx="17" cy="-58" rx="4" ry="7" fill="#78350f" transform="rotate(30 17 -58)" /></g>
            <g className="cn-leg cn-leg-a"><line x1="13" y1="-30" x2="22" y2="-2" stroke="#4c1d95" strokeWidth="5" strokeLinecap="round" /></g>
            <g className="cn-leg cn-leg-b"><line x1="13" y1="-30" x2="22" y2="-2" stroke="#6d28d9" strokeWidth="5" strokeLinecap="round" /></g>
            <g fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M0 0 L14 -24 L22 0 M14 -24 L36 -26 L22 0 M36 -26 L46 0 M36 -26 L40 -34 L46 -35" />
            </g>
            {[0, 46].map((x) => (
              <g key={x} transform={`translate(${x} 0)`}>
                <circle r="16" fill="none" stroke="#4c1d95" strokeWidth="2.5" />
                <g className="cn-spin"><path d="M-16 0H16M0 -16V16M-11 -11L11 11M-11 11L11 -11" stroke="#7c3aed" strokeWidth="1" /></g>
              </g>
            ))}
            <rect x="8" y="-28" width="12" height="3.5" rx="1.5" fill="#1f2937" />
            <line x1="14" y1="-30" x2="25" y2="-52" stroke="#7c3aed" strokeWidth="11" strokeLinecap="round" />
            <line x1="25" y1="-50" x2="40" y2="-34" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" />
            <path className="cn-scarf" d="M23 -53 q-10 1 -17 9" fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
            <circle cx="25" cy="-62" r="8.5" fill="#78350f" />
            <circle cx="28.5" cy="-61" r="7" fill="#fcd9b6" />
            <circle cx="31" cy="-62" r="1" fill="#1e1b4b" />
          </g>
        </g>
      </g>

      <g className="cn-win">
        <ellipse cx="140" cy="192" rx="270" ry="44" fill="#fff" />
        <ellipse cx="440" cy="198" rx="240" ry="44" fill="#f1f5f9" />
        {[60, 505].map((x) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <rect x="-4" y="130" width="8" height="26" fill="#7c2d12" />
            <polygon points="-27,134 0,98 27,134" fill="#0f766e" />
            <polygon points="-22,112 0,78 22,112" fill="#0f766e" />
            <polygon points="-17,92 0,58 17,92" fill="#115e59" />
            <path d="M-27 134q8-6 14 0q6-6 12 0q8-6 14 0q6-6 12 0M-22 112q6-5 11 0q6-5 11 0q6-5 11 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          </g>
        ))}
        <g transform="translate(175 0)">
          <circle cy="136" r="22" fill="#fff" stroke="#93c5fd" strokeWidth="2" />
          <circle cy="106" r="16" fill="#fff" stroke="#93c5fd" strokeWidth="2" />
          <line x1="-15" y1="104" x2="-34" y2="92" stroke="#7c2d12" strokeWidth="2.5" strokeLinecap="round" />
          <g className="cn-wave"><line x1="15" y1="104" x2="34" y2="90" stroke="#7c2d12" strokeWidth="2.5" strokeLinecap="round" /><line x1="30" y1="92" x2="36" y2="84" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" /></g>
          <circle cy="80" r="12" fill="#fff" stroke="#93c5fd" strokeWidth="2" />
          <circle cx="-4" cy="78" r="1.8" fill="#1e1b4b" /><circle cx="4" cy="78" r="1.8" fill="#1e1b4b" />
          <polygon points="0,82 14,85 0,87" fill="#f97316" />
          <circle cy="102" r="2" fill="#1e1b4b" /><circle cy="110" r="2" fill="#1e1b4b" />
          <path d="M-12 91q12 7 24 0M6 94l4 15" fill="none" stroke="#e11d48" strokeWidth="5" strokeLinecap="round" />
          <ellipse cy="68" rx="14" ry="3" fill="#4c1d95" /><rect x="-8" y="52" width="16" height="16" rx="2" fill="#4c1d95" /><rect x="-8" y="62" width="16" height="3.5" fill="#f59e0b" />
        </g>
        <g transform="translate(330 0)">
          <g className="cn-santa">
            <ellipse cx="46" cy="142" rx="16" ry="18" fill="#a16207" /><rect x="38" y="110" width="16" height="14" rx="2" fill="#38bdf8" /><path d="M46 110v14M38 117h16" stroke="#fbbf24" strokeWidth="2.5" />
            <rect x="-12" y="150" width="10" height="8" rx="3" fill="#1f2937" /><rect x="2" y="150" width="10" height="8" rx="3" fill="#1f2937" />
            <rect x="-10" y="134" width="8" height="17" fill="#b91c1c" /><rect x="2" y="134" width="8" height="17" fill="#b91c1c" />
            <rect x="-17" y="96" width="34" height="44" rx="14" fill="#dc2626" />
            <rect x="-17" y="132" width="34" height="7" rx="3" fill="#fff" /><rect x="-2.5" y="98" width="5" height="20" fill="#fff" />
            <rect x="-17" y="118" width="34" height="6" fill="#1f2937" /><rect x="-4" y="117" width="8" height="8" rx="1.5" fill="#fbbf24" />
            <line x1="-15" y1="102" x2="-26" y2="118" stroke="#dc2626" strokeWidth="8" strokeLinecap="round" />
            <line x1="15" y1="102" x2="32" y2="114" stroke="#dc2626" strokeWidth="8" strokeLinecap="round" />
            <circle cx="-26" cy="119" r="4" fill="#1f2937" /><circle cx="33" cy="115" r="4" fill="#1f2937" />
            <circle cy="88" r="13" fill="#fcd9b6" />
            <path d="M-13 90q0 26 13 26q13 0 13-26q-6 8-13 8q-7 0-13-8z" fill="#fff" />
            <circle cx="-5" cy="87" r="1.6" fill="#1e1b4b" /><circle cx="5" cy="87" r="1.6" fill="#1e1b4b" />
            <circle cy="92" r="2.6" fill="#fb7185" /><ellipse cy="96" rx="9" ry="4" fill="#fff" stroke="#e2e8f0" />
            <path d="M-14 78C-12 58-2 46 12 48C14 58 14 68 14 78Z" fill="#dc2626" /><circle cx="14" cy="50" r="5" fill="#fff" /><rect x="-16" y="74" width="32" height="9" rx="4.5" fill="#fff" />
          </g>
          <g className="cn-bubble"><rect x="14" y="14" width="68" height="26" rx="13" fill="#fff" stroke="#7c3aed" strokeWidth="2" /><text x="48" y="32" textAnchor="middle" fontSize="13" fontWeight="800" fill="#4c1d95" fontFamily="Nunito Variable, Nunito, sans-serif">Ho ho ho!</text></g>
        </g>
        {FLAKES.map(([x, delay, dur, dx, r], i) => (
          <circle key={i} className="cn-flake" cx={x} cy="-6" r={r} fill="#fff" style={{ "--dx": `${dx}px`, animationDelay: `${delay}s`, animationDuration: `${dur}s` }} />
        ))}
      </g>
    </svg>
  );
}
