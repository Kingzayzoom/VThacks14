export function SignalField({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`atmosphere ${compact ? "compact" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient
            id={compact ? "field-warm" : "entry-warm"}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop stopColor="#FFB65B" stopOpacity=".04" />
            <stop offset=".48" stopColor="#FFB65B" stopOpacity=".6" />
            <stop offset="1" stopColor="#EB8A48" stopOpacity=".02" />
          </linearGradient>
          <linearGradient id={compact ? "field-cool" : "entry-cool"}>
            <stop stopColor="#83D9E8" stopOpacity=".3" />
            <stop offset="1" stopColor="#83D9E8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g
          fill="none"
          stroke={`url(#${compact ? "field" : "entry"}-warm)`}
          strokeWidth=".65"
        >
          {Array.from({ length: 52 }, (_, i) => (
            <path
              key={i}
              d={`M ${870 + i * 7} -80 C ${770 + i * 7} ${100 + i * 2}, ${1445 - i * 5} ${84 + i * 4}, ${1170 + i * 5} ${318 + i * 3} S ${980 + i * 12} ${605 - i * 2}, ${1640 + i * 4} ${760 + i * 3}`}
            />
          ))}
        </g>
        <g
          fill="none"
          stroke={`url(#${compact ? "field" : "entry"}-cool)`}
          strokeWidth=".65"
        >
          {Array.from({ length: 36 }, (_, i) => (
            <path
              key={i}
              d={`M ${-260 + i * 14} -100 C ${400 + i * 6} ${190 + i * 4}, ${-470 + i * 10} ${360 + i * 4}, ${80 + i * 10} ${610 + i * 4} S ${810 + i * 8} ${740 + i * 8}, ${1440 + i * 7} ${1050 + i * 4}`}
            />
          ))}
        </g>
        <g stroke="#a6adb3" strokeWidth=".7" opacity=".25">
          <path d="M32 123h20m-10-10v20M1385 650h20m-10-10v20M44 735h20m-10-10v20" />
        </g>
      </svg>
    </div>
  );
}

export function ContourSheet() {
  return (
    <svg
      className="contour-sheet"
      viewBox="0 0 800 460"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g fill="none" stroke="currentColor" strokeWidth=".6">
        {Array.from({ length: 24 }, (_, i) => (
          <path
            key={i}
            d={`M -30 ${70 + i * 14} C ${170 + i * 4} ${-80 + i * 13}, ${80 + i * 13} ${360 - i * 7}, 400 ${210 + i * 4} S ${700 + i * 4} ${110 + i * 14}, 840 ${240 + i * 10}`}
          />
        ))}
      </g>
    </svg>
  );
}
