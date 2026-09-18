import { Circle } from "lucide-react";
const integrations = [
  {
    name: "Gemini",
    role: "Planning & reasoning",
    variables: ["GEMINI_API_KEY", "GEMINI_MODEL"],
  },
  {
    name: "ElevenLabs",
    role: "Voice channel",
    variables: ["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID"],
  },
  {
    name: "Agent Name Service",
    role: "Discovery & identity",
    variables: [
      "ANS_REGISTRY_BASE_URL",
      "GODADDY_API_KEY",
      "GODADDY_API_SECRET",
    ],
  },
  {
    name: "Hosted runtime",
    role: "Agent execution",
    variables: ["AGENT_RUNTIME_BASE_URL", "AGENT_RUNTIME_API_TOKEN"],
  },
];
export default function SettingsPage() {
  return (
    <div className="simple-page">
      <div className="eyebrow muted">WORKSPACE / CONNECTIONS</div>
      <h1>Integration readiness.</h1>
      <p className="secondary">
        The field is in demo mode. All agent activity uses local fixtures. Live
        adapters have not been connected in this checkpoint.
      </p>
      <div className="integration-table">
        {integrations.map((i) => (
          <section key={i.name} className="integration-row">
            <div>
              <h2>{i.name}</h2>
              <p>{i.role}</p>
            </div>
            <span className="status">
              <Circle size={10} />
              Not connected
            </span>
            <div className="env-names">
              {i.variables.map((v) => (
                <code key={v}>{v}</code>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="settings-note">
        Variable names are integration requirements, not a credential check.
        Values are never displayed or entered in the browser. Zabish and Ashraf
        will connect server-side adapters after the frontend checkpoint is
        approved.
      </p>
      <section className="settings-notice">
        <h2>Local by design.</h2>
        <p>
          Demo missions and selection are saved on this device when browser
          storage is available. No private credentials belong in demo
          objectives. Voice is inactive and no microphone permission is
          requested.
        </p>
      </section>
    </div>
  );
}
