import { LiveIntegrations } from "@/components/live-status";
import { Circle } from "lucide-react";
import { VoiceReadiness } from "@/components/voice/voice-readiness";
const integrations = [
  {
    name: "Gemini",
    role: "Planning & reasoning",
    variables: ["GEMINI_API_KEY", "GEMINI_MODEL"],
  },
  {
    name: "ElevenLabs",
    role: "Voice channel",
    variables: ["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID", "CORTEX_VOICE_ACCESS_CODE"],
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
      <h1>Settings</h1>
      <p className="secondary">
        Runtime mode selects demo or the live hub. CONTROL uses the same mission creation path as the composer.
      </p>
      <LiveIntegrations /><div className="integration-table">
        {integrations.map((i) => (
          <section key={i.name} className="integration-row">
            <div>
              <h2>{i.name}</h2>
              <p>{i.role}</p>
            </div>
            {i.name === "ElevenLabs" ? <VoiceReadiness /> : <span className="status">
              <Circle size={10} />
              Requires runtime check
            </span>}
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
        Provider keys are never displayed or entered in the browser. Voice uses
        a separate team access code; mission execution stays behind the shared API.
      </p>
      <section className="settings-notice">
        <h2>Local by design.</h2>
        <p>
          Demo missions and selection are saved on this device when browser
          storage is available. No private credentials belong in demo
          objectives. Voice requests microphone access only when you explicitly
          start a configured conversation.
        </p>
      </section>
    </div>
  );
}
