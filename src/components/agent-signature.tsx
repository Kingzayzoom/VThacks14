import type { RuntimeStatus } from "@/contracts";

/** Original, color-independent signatures; ambient presence is separate from execution. */
export function AgentSignature({
  id,
  status = "idle",
  selected = false,
}: {
  id: string;
  status?: RuntimeStatus;
  selected?: boolean;
}) {
  return (
    <svg
      className={`agent-signature signature-${id} signature-${status} ${selected ? "signature-selected" : ""}`}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <g
        className="signature-registration"
        stroke="currentColor"
        strokeWidth=".65"
      >
        <path d="M5 21V5h16M99 5h16v16M115 99v16H99M21 115H5V99" />
        <path d="M60 0v7m0 106v7M0 60h7m106 0h7" />
      </g>
      {id === "coordinator" ? (
        <>
          <g className="aperture-etch" stroke="currentColor" strokeWidth=".65">
            {Array.from({ length: 14 }, (_, i) => (
              <ellipse
                key={i}
                cx="60"
                cy="60"
                rx={41 - i * 0.65}
                ry={16 + i * 0.65}
                transform={`rotate(${i * 12.86} 60 60)`}
              />
            ))}
          </g>
          <circle
            className="signature-core"
            cx="60"
            cy="60"
            r="23"
            fill="var(--canvas)"
            stroke="currentColor"
            strokeWidth=".7"
          />
          <path
            d="M49 73V46h12c14 0 14 19 0 19H49"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            className="signature-orbit"
            d="M60 12a48 48 0 0 1 48 48"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <circle cx="60" cy="12" r="2" fill="currentColor" />
        </>
      ) : id === "scout" ? (
        <>
          <circle
            cx="60"
            cy="60"
            r="36"
            stroke="currentColor"
            strokeWidth=".65"
          />
          <circle
            cx="60"
            cy="60"
            r="43"
            stroke="currentColor"
            strokeWidth=".5"
            strokeDasharray="1 5"
          />
          <g stroke="currentColor" strokeWidth=".8">
            {Array.from({ length: 8 }, (_, i) => (
              <path
                key={i}
                d="M60 16v9m0 70v9"
                transform={`rotate(${i * 22.5} 60 60)`}
              />
            ))}
          </g>
          <path
            d="m76 39-8 30-27 12 9-31z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="m76 39-16 21-19 21m9-31 10 10 8 9"
            stroke="currentColor"
            strokeWidth=".7"
          />
          <circle cx="60" cy="60" r="3" fill="currentColor" />
        </>
      ) : id === "sage" ? (
        <>
          <g stroke="currentColor">
            {[0, 1, 2, 3].map((i) => (
              <path
                key={i}
                d={`M60 ${15 + i * 8} ${105 - i * 8} ${96 - i * 5}H${15 + i * 8}Z`}
                strokeWidth={i === 0 ? 1 : 0.5}
                opacity={1 - i * 0.18}
              />
            ))}
          </g>
          <path
            className="signature-wave"
            d="M12 67h20l6-10 8 23 11-37 9 33 7-18 8 9h27"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M8 101h104M60 7v5"
            stroke="currentColor"
            strokeWidth=".6"
            opacity=".45"
          />
        </>
      ) : id === "forge" ? (
        <>
          <g stroke="currentColor" strokeWidth=".7">
            <path
              d="M25 20h65v65H25zM34 29h65v65H34zM20 99h84V15"
              opacity=".55"
            />
            <path d="M42 38h38v38H42z" strokeWidth="1.4" />
            <path d="M42 51h38M55 38v38M80 38l10-10M80 76l10 10M42 76l-9 9" />
            <path d="M16 108h11m5 0h5m5 0h34" opacity=".65" />
          </g>
          <path
            className="signature-wave"
            d="M55 64h12V51"
            stroke="currentColor"
            strokeWidth="2"
          />
        </>
      ) : (
        <>
          <path
            d="M60 15 96 30v31c0 22-21 35-36 45-15-10-36-23-36-45V30Z"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="m60 28 25 10v23c0 16-16 28-25 34-9-6-25-18-25-34V38Z"
            stroke="currentColor"
            strokeWidth=".5"
          />
          <path
            d="M60 40v34M44 57h32"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </>
      )}
    </svg>
  );
}
