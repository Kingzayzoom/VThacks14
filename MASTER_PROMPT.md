# PERIHELION — Master Frontend Build Brief

## 0. Assignment and scope

You are the lead frontend engineer and interaction designer building PERIHELION in VS Code. Codex is the main builder; the owner will select the Astra model/reasoning setting available in their environment. Do not invent model identifiers, change the owner's coding-agent configuration, or request paid API access to build the frontend.

Build a distinctive, usable agentic operations control center, not a slide deck, screenshot replica, static landing page, or generic AI chat dashboard.

FRONTEND FIRST. The interface must be complete and interactive with EMPTY API keys. Design the screens, interactions, shared state, deterministic demonstration, and integration contracts before attempting real agent orchestration. Do not stall waiting for credentials.

Team:
- Roheen: product direction, frontend, visual design, layout, interaction, and final visual approval.
- Zabish and Ashraf: hosted agents, backend, provider credentials, and integration. Suggested division: Zabish owns runtime/delegation; Ashraf owns ANS, policy enforcement, and persistence. Confirm their actual division in the repository handoff rather than assuming it is already agreed.

Context: VTHacks 14, September 18–20, 2026. The team plans its main build Friday night/Saturday, with final polish before Sunday submission. Optimize for a coherent product and a repeatable short demo, not the largest feature count. Check the event's current instructions before submission. Disclose pre-existing components and AI-generated reference assets.

Do not touch STEAL-A-MONKEY, Roblox assets, unrelated APHELION deployments, client websites, or other repositories. Confirm the working directory before installing or writing anything. Preserve existing uncommitted work; no destructive resets, force-pushes, or deployment without permission.

## 1. Source hierarchy and honest interpretation

Use this priority order:
1. The owner's latest requirements in this brief.
2. The four PERIHELION reference images below for composition and art direction.
3. The existing repository's valid architecture and team-owned contracts.
4. Official documentation for the specific SDK versions installed.

The separate shared-chat URL was not readable during preparation, and no completed standalone Deep Research report was available. Do not claim to have read either. This brief consolidates the actual conversation, supplied reference boards, and separately verified primary-source documentation. See docs/RESEARCH_NOTES.md.

Earlier NEXUS imagery is superseded. The product is PERIHELION, not NEXUS or APHELION CONTROL. APHELION is the creative reference, not a claim that this project is an existing commercial platform.

Key research translation:
- APHELION: authored visual worlds, numbered objects, editorial framing, purposeful interactive mechanisms. Translate that sensibility; do not copy protected assets or assume source-package access.
- Linear: projects, issues, status clarity, and organized work. Borrow operational clarity, not its branding or layout wholesale.
- Agent observability interfaces such as LangSmith Studio: graph execution and inspectable state should make the system understandable. Do not add LangGraph just to copy its graph.
- GoDaddy ANS: agent identity/discovery is separate from permission to act. Do not portray ANS as a warehouse of executable agents, a payment service, or a guarantee of trustworthy behavior.
- ElevenLabs: the product's voice channel, not the owner of mission state or the security authority.
- Gemini: a planned server-side reasoning/structured-output provider, not a browser-side secret.

## 2. Product definition

PERIHELION / AGENTIC OPERATIONS SYSTEM

Primary headline: Intelligence, coordinated.
Supporting line: Give one objective. Coordinate the right agents. Stay in control.
Brand principle: Autonomous systems. Human authority.

PERIHELION combines Linear-like work management with a calm JARVIS-like voice interface. A user gives an objective; an orchestrator decomposes it, delegates work, identifies missing capabilities, discovers a specialist through ANS, verifies its identity, and requests narrowly scoped authorization. Guardian supervises proposed actions, holds or blocks actions that violate policy, and creates an understandable audit trail. Results return as useful artifacts, not just chat messages.

The defining interaction is dynamic recruitment during a mission, followed by a visible identity-versus-authority distinction.

End-to-end story:
Objective → plan → parallel tasks → missing capability → directory discovery → identity verification → scope/budget approval → specialist admission → attempted out-of-scope action held or blocked → permitted work continues → artifact delivered.

“Hires an agent” means discovers, admits, and delegates to an existing hosted specialist for this version. No payments, marketplace checkout, arbitrary code downloads, or unbounded self-replication.

## 3. The four visual references

Read these files visually before implementing:

public/references/perihelion_intelligence_operations_dashboard.png
public/references/perihelion_agentic_operations_dashboard.png
public/references/perihelion_mission_orchestration_dashboard.png
public/references/perihelion_guardian_operations_console.png

Mapping:
1. Intelligence operations: entry/landing composition, wordmark, atmospheric layering, objective input.
2. Agentic operations: FIELD workspace, agent topology, activity rail, mission strip, voice dock.
3. Mission orchestration: task graph, capability-deficit recruitment surface, timeline, side inspector.
4. Guardian operations: directory, identity dossier, action intervention, approval controls.

These are generated art-direction boards, NOT exact product data or proof of integrations. Correct misspellings and fabricated dates, metrics, trust scores, agent counts, and technical claims. Remove irrelevant solar measurements, invented customers, fake signatures, “100% secure,” and blanket “ANS verified” branding. Do not implement placeholder science readings as operational telemetry.

Do not place a full reference screenshot behind clickable hotspots. Build real DOM text, controls, tables, SVG/graph elements, panels, and responsive layout. Do not crop artwork containing tiny embedded labels into the finished UI. Create clean abstract assets instead.

If filenames differ, inspect public/ and map the actual files. Do not fabricate file presence. Missing artwork should get an intentional SVG/CSS fallback, not broken-image icons.

## 4. Visual thesis: an authored instrument, not a spaceship

The owner rejected giant planets, Earth horizons, starfield wallpaper, holographic humans, blue-purple sci-fi bubbles, and generic “AI startup concept art.” Space can be an ingredient; it must not become the entire interface.

Think experimental control institution, optical instrument, scientific archive, magnetic field, dark editorial publication, and precise modern software.

Strangeness comes from composition: an off-axis contour field, a cropped signal aperture, an asymmetric annotation rail, precise typesetting, and stateful connections. Not from making the product unreadable.

The agent network is the hero imagery. Show intelligence coordinating through actual product state. No literal planets as agent avatars.

Maintain two visual densities:
- Entry experience: expressive, atmospheric, large typography, deliberate whitespace.
- Working application: calmer backgrounds, legible text, clear controls, efficient task density.

A judge should know within five seconds where to enter an objective, what is running, and what needs their decision.

## 5. Design tokens and typography

Centralize tokens in one theme file. Suggested starting values, to be visually tested:

Canvas: #050607
Surface: #0C1012
Raised surface: #141A1D
Primary text: #EFECE4
Secondary text: #A6ADB3
Decorative metadata only: #768189
Subtle border: rgba(220, 230, 235, 0.14)
Strong border: rgba(220, 230, 235, 0.28)
Solar amber: #FFB65B
Warm energy: #EB8A48
Execution cyan: #83D9E8
Verified/complete mint: #71E2AF
Review warning: #E7B864
Blocked/error: #F17B78

Amber identifies the brand and selected emphasis. Cyan identifies current execution. Mint represents verified/completed states. Warning/blocked states require text and an icon as well as color. Do not use a green overall health indicator when action is required.

Use an expressive editorial serif for the wordmark and major headings; a legible sans-serif for interface text; restrained monospace for IDs, timestamps, shortcuts, and technical metadata. Suggested available/open-license families: Cormorant Garamond, Geist, and IBM Plex Mono. Reuse suitable installed fonts if present. Limit loaded weights and supply fallbacks; a font fetch failure must not break builds.

Typography targets:
- Hero wordmark: clamp approximately 64–120 px; avoid clipping on narrow screens.
- Hero statement: 38–56 px.
- Workspace heading: 28–40 px.
- Body and important controls: 14–16 px.
- Tables: 13–14 px.
- Metadata: 11–12 px, not essential instructions.
- Uppercase tracking on short labels only. Do not letter-space whole paragraphs.

Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64.
Working panel radius: 4–8 px. Dialog radius: 10–12 px. Use pills only for compact statuses/chips. Avoid 24 px rounded cards everywhere.
Use thin dividers, subtle inner highlights, and restrained shadows. Avoid large blurry glows around every panel. Reuse one icon family with consistent stroke widths and original simple agent glyphs.

## 6. Layering system

Implement deliberate depth without expensive clutter:

Layer 0: nearly black base and static, extremely subtle grain.
Layer 1: sparse, custom contour/flow-field artwork at the edges, with a warm off-axis energy fold and occasional cool filaments.
Layer 2: sparse alignment marks, panel indices, registration ticks, and small institutional annotations.
Layer 3: readable application surfaces with enough opacity to separate text from artwork.
Layer 4: stateful graph edges, selection, verification transitions, and live waveform.
Layer 5: recruitment drawer, contextual inspector, Guardian intervention, command palette, and restrained notices.

Mask busy fields away from paragraphs and tables. Decorative layers have pointer-events: none and are hidden from assistive technology. Establish an explicit z-index scale; no overlay accidentally behind the canvas or covering the command dock.

Application artwork should be significantly quieter than the landing page. No full-screen animated blur, cursor trails, scroll hijacking, continuous RGB cycling, or layers that obscure data.

Create reusable assets such as signal-field.svg, contour-sheet.svg, and perihelion-mark.svg. Use CSS/SVG first; add Canvas/WebGL only for a measurable benefit, with a static fallback and lazy loading. Do not make a 3D engine a prerequisite for the product.

## 7. Information architecture

Implement these real routes and working navigation:

/                  Entry: objective composer and product introduction
/field             Primary operations workspace
/missions          Mission list and board view
/missions/[id]     Execution detail and artifacts
/agents            Active workforce and agent detail
/directory         ANS discovery/directory
/guardian          Incidents, approvals, and policy overview
/voice             Conversation history and voice controls
/events            Filterable audit/activity log
/settings          Integration readiness, preferences, limits

Workspace sidebar: FIELD 01, MISSIONS 02, AGENTS 03, ANS DIRECTORY 04, GUARDIAN 05, VOICE 06, EVENTS 07. Settings and mode status sit at the bottom. Add plain-language subtitles/tooltips where the brand language might be unclear.

Retain a persistent bottom command/voice dock across workspace routes. Navigation must preserve the current mission and selected-agent context. No fake navigation items leading nowhere.

## 8. Entry screen

Build the first board as an actual interactive product entrance, not a long marketing site.

Compact top navigation: PERIHELION, product/workspace links, connection mode, Enter workspace.
Main area: restrained large wordmark; Intelligence, coordinated.; one clear supporting sentence; an objective input with Run and an optional voice action.

Use three useful examples, such as Prepare a launch brief, Analyze this dataset, and Plan a research project. Selecting an example fills the input; it does not silently start paid work.

Submitting creates a mission through the current data adapter and navigates to its detail screen. Blank submissions show an inline validation message. Double-clicking does not create duplicate missions.

Below: a small agent-field preview and three honest summaries of coordination, identity, and oversight. Sample data must be marked Demo. Do not show unmeasured uptime, total users, savings, or fabricated trust scores.

No fake sign-in success. Demo entry is explicit. Authentication becomes a live integration concern, not a blocker for browsing the prototype.

## 9. FIELD — primary workspace

At roughly 1440×900, use a 208–224 px sidebar, a compact 56–64 px top bar, a flexible central canvas, and an optional 300–340 px inspector/activity rail. Reserve layout space for the bottom dock instead of covering content with it.

Top row: FIELD / OPERATIONS, active mission selector, New mission, actual demo/live status, and pending decisions.
Main canvas: a central abstract coordinator glyph with Scout, Sage, Forge, and an optional validator; Guardian observes as a separate control boundary rather than an ordinary worker the orchestrator can disable.
Right rail: recent execution events and selected-agent/selected-task inspector. Prefer tabs to stacking ten tiny boxes.
Lower strip: current mission progress, outstanding decisions, and recent artifacts. Derive counts from shared state.

A compact mission task preview should answer: what is being done, by whom, what is waiting, and what happens next. The graph is not the only way to read this information; provide a list alternative.

## 10. Agent representation and behavior

Agent glyph vocabulary: aperture/compass for Scout, triangle/wave for Sage, square/chisel for Forge, shield for Guardian, and a distinct geometric motif for a recruited specialist. Glyphs must be distinguishable without color.

Show name, role, current task, runtime status, identity status, and scoped authorization separately. States include idle, planning, running, waiting for approval, blocked, completed, disconnected, and failed.

Only active execution edges move. Completed edges settle; blocked edges stop at the boundary. New nodes appear only after the recruitment state changes, never because an arbitrary animation timer elapsed.

Click/keyboard-activate a node to inspect capabilities, public identity details, parent assignment, task, tool requests, outputs, allowed scopes, and execution history. Display concise decision summaries and evidence, not private chain-of-thought or secrets.

Keep layout stable while streaming: fixed or deliberate positions for the small initial network, fit-to-view, reset view, and no constantly rearranging force simulation. Newly admitted agents should enter without throwing existing nodes around.

## 11. Missions and task management

Provide list/board views, search, filters, status, priority, assignee, and mission grouping. Board columns: Planned, Running, Needs approval, Done, Failed. Do not let dragging an execution task to Done fabricate completion; limit manual edits to legitimate planning fields, or clearly distinguish human-completed tasks.

Mission detail:
- Objective, constraints, success criteria, and budget.
- Plan and dependencies.
- Execution graph and accessible list view.
- Current agents and required capabilities.
- Timeline of real or labeled-demo events.
- Approval inbox.
- Artifacts/results with provenance.
- Pause, resume, cancel, and retry where the adapter supports them.

Pause should request a pause and display Pausing until acknowledged. Cancel should not erase events or claim already-sent actions were undone. Retrying creates a new attempt linked to the original, preserving the audit history.

Progress derives from task states and documented weighting; where it cannot be measured, show the current stage rather than a fake percentage. Money values use integer minor units and explicit currency, with measured/estimated labels; unknown costs remain unknown.

## 12. Dynamic recruitment — the signature interaction

Demonstrate a mission that initially lacks one capability. A worker or orchestrator may request that capability, but a central broker controls admission.

Flow:
Capability missing → discover candidates → inspect identity/evidence → compare capability fit and requested scope → admit for this mission → specialist joins the field → assigned work begins.

Use a beautifully composed drawer/overlay inspired by reference 3. Header: Something is missing. Subheader states the actual capability needed. Show current mission, candidate roles, capabilities, publisher/domain when provided, identity status, availability, estimated cost when known, requested permissions, and verification evidence.

Do not use invented “96% fit” or trust percentages. Explain why a candidate matches using matched capability tags and missing requirements. Unknown values display Not provided.

ADMIT TO FIELD is the primary action. Show narrow scope and expiry/budget before confirmation. When admitted, the node joins the network and the mission resumes. Duplicate clicks reuse an idempotency key. Handle no candidates, no valid identity, stale evidence, rejection, timeout, cancellation, and worker unavailability.

Allowlist and bounds in the planned live runtime: finite delegation depth, finite steps, bounded concurrency, run timeout, and budget. Suggested code defaults: 2 delegation levels, 12 task/tool steps, 4 concurrent workers, and a 5-minute run timeout. These are project defaults, not provider rules. Live paid execution also needs an explicit configured budget. Stop/replan at limits.

Do not install software, grant credentials, initiate payment, or call arbitrary discovered endpoints merely because an agent requested recruitment.

## 13. ANS directory and identity dossier

ANS means Agent Name Service. Use provider-returned identifiers in live mode; do not manufacture valid-looking registrations.

Directory: search by capability/name, filters for protocol and identity status, useful empty/error states, selected-agent dossier, and recruitment action tied to a mission.

Identity dossier: display name, ANS identifier, publisher/domain, supported transport/protocol, declared capabilities, verification result, checked-at time, and evidence fields actually returned by the integration. Show certificate/version/status information only when available. Link to safe public evidence where supported.

Separate three questions:
1. Who is this agent? Identity verification.
2. Is this endpoint proving possession of the expected credentials? Transport/authentication check.
3. May it perform this action on this resource? Application authorization.

An identity-verified agent may still be blocked. No “identity verified therefore safe,” invented blockchain registration, synthetic cryptographic seals, or fake numerical trust ratings. A fingerprint is not automatically proof that verification succeeded.

Frontend-only evidence is a fixture labeled Demo verification. In live mode, absent or failed verification stays unverified and cannot silently pass. Do not upload credentials or register domains/agents automatically during the frontend task.

## 14. Guardian — oversight with actual boundaries

Guardian includes a security-monitoring agent/interface plus a deterministic pre-action policy gate owned by the backend. An LLM may explain risk or flag suspicious intent; it must not be the only mechanism preventing unauthorized actions.

Show requests with actor, mission, action/tool, resource/destination, requested scope, current grant, policy result, reason, and time. Separate approved, needs-review, denied, blocked-before-execution, and execution-failed states.

For an intervention, spotlight the affected node with a restrained amber perimeter and open the incident inspector. Keep the rest of the workspace usable. Do not rely on a dramatic animation as proof of enforcement.

Actions: Inspect, Deny, and Authorize once only for a request classified as human-reviewable. Hard-denied destinations, secret extraction, and invalid identity cannot be approved by this button.

A one-time approval must be scoped to the exact immutable action payload, actor, resource, run, and expiry; changed inputs require a fresh check. A duplicate decision must not execute twice. The browser sends a decision request; the server authorizes and records it before execution.

The live action gateway must mediate tool calls and enforce tenant/mission scopes, endpoint allowlists, request limits, secret redaction, and timeouts. External instructions and agent manifests are untrusted input. Do not let agents call providers directly with unrestricted credentials.

For the demo, an external specialist requests data outside its allowed scope. Use a synthetic dataset and a stubbed forbidden destination; never send real private data anywhere. Record attempted versus actually executed network actions. Continue useful work through a safe approved dataset.

## 15. ElevenLabs voice layer

One outward-facing assistant: PERIHELION. Reuse the existing ElevenLabs agent named CONTROL if that is the configured ID; changing the frontend brand does not require creating more voice agents.

Frontend controls: connect/disconnect, microphone permission, mute, interrupt, transcript, text fallback, concise status, and a restrained waveform. States: disabled, not configured, requesting permission, connecting, listening, thinking, speaking, muted, interrupted, disconnected, error.

No microphone capture on load. Start only after a user gesture. Stop tracks/audio and unsubscribe when ending a session. Do not show Listening when no capture is active. Demo voice is explicitly simulated and does not capture a microphone or claim ElevenLabs is connected.

Use the current installed @elevenlabs/react SDK correctly. For a private voice session, mint a WebRTC conversation token on the server; a signed WebSocket URL is a different transport path. Do not expose the long-lived API key or interchange the two methods.

Voice submits structured intents through the same mission adapter as typing. It does not become a second orchestration database. Speech is not sufficient authorization for sensitive actions: display the exact action in the approval UI.

Agent speech must follow confirmed events: Objective received; Specialist identity verified; Action held for your approval; Mission complete. Do not narrate fictional successes. Queue only meaningful status announcements; avoid speaking over the user or reading every log line.

Treat contextual updates as context, not a guarantee of immediate speech. Use the chosen SDK's documented mechanism for responses and test it separately. Do not route Gemini audio and ElevenLabs audio simultaneously.

## 16. Gemini and other provider adapters

Gemini is the planned primary provider for mission planning/analysis. Define typed plan outputs and validate structure and semantics before accepting dependencies or tool requests. Invalid model output should cause a bounded retry or an actionable error, never direct execution.

Model selection is configuration-driven. Do not hardcode a fabricated “latest” model name or assume a paid editor subscription supplies an application API key.

Keep optional OpenAI/Anthropic adapters replaceable, not dependencies required for startup. Research-provider and Linear adapters are optional. Use the SDK and auth method documented for the version actually installed.

Build integration seams now; Zabish/Ashraf supply real credentials and runtime endpoints later. No external model call is required to render, build, test, or demonstrate the frontend.

## 17. Events, results, and integration settings

Events route: filter by mission, agent, severity, action, and time. Expand an event to inspect sanitized inputs, public evidence, policy decision, output reference, and correlation ID. Support copying safe IDs and exporting redacted logs.

Artifacts: render a useful brief, task checklist, Markdown document, or data table/chart. Show source references, generating agent, task, timestamp, and version. Sanitize rich text; never execute model-generated HTML/scripts.

Settings: integration tiles for Gemini, ElevenLabs, ANS, agent runtime, and optional persistence/Linear. Distinguish Not configured, Configured but untested, Connected, Degraded, and Error. API-key presence alone is not connection success.

Do not create a browser form that stores private API keys. Tell teammates the required ENV VARIABLE NAMES; return only sanitized readiness from the server. Keep preferences for reduced motion, effects intensity, sound, and graph/list mode.

The product needs an honest stop control: Stop mission requests cancellation of that run. In live mode it must await runtime acknowledgment; if the runtime cannot stop already-issued work, show that limitation.

## 18. Demo state engine

Build a deterministic, restartable demo with no paid APIs and no external side effects. Mark the shell DEMO and label fixture evidence/results consistently. Never silently switch a failed live run to a successful simulation.

Use a central state machine/reducer, not disconnected setTimeout decorations in each component. Keep agent, mission, task, incident, and artifact records shared across all pages.

Canonical demo: “Prepare a launch brief for our student-built product, including an audience summary, execution plan, and data visualization. Use only the provided public sample data. Do not publish or contact anyone.”

Sequence:
1. User submits by text, or via real voice only when explicitly configured.
2. Coordinator creates research, analysis, and artifact tasks.
3. Scout and Sage make progress with visible output references.
4. Forge requests missing data-visualization capability.
5. Broker discovers a small curated set of specialist fixtures; identity state progresses through checking to demo-verified.
6. Human admits one specialist with dataset.read:public-demo and artifact.write:mission scopes.
7. Specialist appears in the field and begins its task.
8. A seeded test proposes an out-of-scope private export; Guardian records a block before any external action.
9. Safe work resumes; an optional reviewable action can demonstrate Authorize once separately.
10. A useful launch brief/checklist/chart appears. Summary counts are derived from events.

Add Pause, Resume, Reset demo, and Advance demonstration step controls in an explicit presenter mode. Never force the user through a long cinematic. No app progress while paused. Resume does not burst queued timers. Reset cancels subscriptions/timers and clears only demo data after confirmation.

The same controls must handle legitimate alternate branches: no candidate, verification fails, user denies admission, approval expires, provider disconnects, and task fails. Do not loop forever on failure.

Demo persistence may use versioned localStorage for fixtures/preferences only, labeled Saved on this device. No secrets or live auth tokens in it. Reloaded state must rehydrate safely and not repeat completed side effects.

## 19. Shared data contracts

Put shared TypeScript types and runtime validation under src/contracts/. These are PERIHELION application contracts, not claims about provider response formats.

Required entities:
- Agent: id, name, role, capabilities, runtimeStatus, source, optional public endpoint/protocol, identityStatus, authorizationSummary, currentTaskId, parentAgentId, public verificationEvidence.
- Mission: id, title, objective, constraints, status, taskIds, agentIds, artifactIds, createdAt, updatedAt, budget, currentStage.
- Task: id, missionId, title, description, requiredCapabilities, dependencies, assignedAgentId, status, attempt, timestamps, resultRef, error.
- Recruitment: id, missionId, missingCapability, candidateIds, selectedCandidateId, status, requestedScopes, grantedScopes, decisionId.
- ActionRequest: id, missionId, agentId, tool, resource, sanitizedInputSummary, payloadDigest, requestedScopes, policyOutcome, executionStatus.
- Approval: id, actionRequestId, immutablePayloadDigest, reviewable, status, grantedScope, expiresAt, decidedBy, decidedAt.
- Incident: id, actionRequestId, severity, reason, policyId, status, interventionResult.
- Artifact: id, missionId, taskId, type, title, contentRef, sourceRefs, version, createdAt.
- IntegrationStatus: provider, mode, readiness, checkedAt, safeError, missingVariableNames.

Event envelope:
schemaVersion: 1
id: unique event identifier
sequence: monotonic within the documented stream
occurredAt: ISO timestamp
source: demo | live
missionId: optional
agentId: optional
taskId: optional
correlationId: optional
type: discriminated event type
payload: validated payload for that type

Suggested event types:
mission.created, mission.planned, mission.state_changed,
task.started, task.progress, task.completed, task.failed,
capability.missing, discovery.started, discovery.completed,
identity.checked, recruitment.requested, agent.admitted,
action.requested, policy.evaluated, approval.requested,
approval.decided, action.blocked, action.completed,
artifact.created, voice.state_changed, integration.disconnected.

Handle duplicate IDs, out-of-order events, stale snapshots, reconnect cursors, and canceled runs. Preserve scope boundaries when a mission changes. Use stable IDs for React keys. Unknown fields/values must not crash the UI.

Keep verified, authorized, executing, and completed distinct. Never collapse them into one green flag.

## 20. API boundary and backend handoff

UI components call a typed application adapter. Supply MockControlApi now and a server-backed implementation boundary for later. Do not put fetch/provider calls throughout components.

Proposed application endpoints, to agree with teammates:
GET    /api/bootstrap
GET    /api/agents
GET    /api/agents/:id
GET    /api/missions
POST   /api/missions
GET    /api/missions/:id
POST   /api/missions/:id/commands
PATCH  /api/tasks/:id
POST   /api/discovery
POST   /api/recruitments
GET    /api/guardian/incidents
POST   /api/guardian/incidents/:id/decisions
GET    /api/events
GET    /api/events/stream
GET    /api/artifacts/:id
POST   /api/voice/session
GET    /api/integrations/status

Specify request/response examples, validation, correlation IDs, idempotency, error codes, and snapshot/stream reconciliation in docs/API_CONTRACT.md. Distinguish NOT_CONFIGURED, UNAUTHORIZED, FORBIDDEN, INVALID_REQUEST, RATE_LIMITED, UPSTREAM_UNAVAILABLE, and TIMEOUT.

Use SSE for backend-to-browser updates if compatible with deployment; requests go through HTTP. Keep transport behind an adapter. Do not promise durable jobs or infinite streams inside a serverless route. The hosted runtime owns long-running orchestration; persistent job storage/replay belongs to the backend team.

Every real mutation checks authenticated actor and workspace ownership server-side. Derive actor identity from the session, not user-provided IDs. Add request limits, origin/CSRF controls appropriate to auth, and allowlisted outgoing destinations. Do not create a generic proxy accepting arbitrary URLs.

Live mode missing credentials must fail closed with a typed setup error. Demo mode must remain usable. A server route that is not implemented should say so, not return fake operational success.

## 21. Implementation structure

Use the existing compatible stack if present. For a new project, recommended foundation: Next.js App Router, React, strict TypeScript, CSS/Tailwind tokens, accessible primitive components, one motion library, and Zod contracts. Use React Flow (@xyflow/react) only when it materially accelerates the graph; style it completely and provide a list alternative. Do not install two state libraries for the same job.

Suggested organization:

src/app/
  page.tsx
  (workspace)/layout.tsx
  (workspace)/field/page.tsx
  (workspace)/missions/page.tsx
  (workspace)/missions/[id]/page.tsx
  (workspace)/agents/page.tsx
  (workspace)/directory/page.tsx
  (workspace)/guardian/page.tsx
  (workspace)/voice/page.tsx
  (workspace)/events/page.tsx
  (workspace)/settings/page.tsx
  api/...
src/components/
  shell/       Sidebar, Topbar, ModeBadge, CommandDock
  atmosphere/  SignalField, ContourLayer, RegistrationMarks
  agents/      AgentGlyph, AgentNode, AgentInspector, WorkforceTable
  missions/    MissionComposer, TaskBoard, ExecutionGraph, Timeline
  recruitment/ CapabilityDeficit, CandidateList, AdmissionReview
  identity/    IdentityBadge, IdentityDossier, EvidencePanel
  guardian/    IncidentList, PolicyResult, ApprovalPanel
  voice/       VoiceDock, Waveform, Transcript
  artifacts/   ArtifactViewer, SourceList
  ui/          Buttons, dialogs, tables, inputs, empty states
src/contracts/
src/lib/api/        ControlApi, MockControlApi, HttpControlApi
src/lib/demo/       fixtures, reducer, scenario, persistence
src/lib/env/        server schema, public configuration
src/server/         server-only adapters, auth/policy boundaries
src/styles/         tokens, typography, layers, motion
public/references/  input images, never application secrets
public/assets/      clean original decorative assets

tests/              reducer/contract/component tests
 e2e/               main browser flows
 docs/              design, API, handoff, demo, verification

Keep providers/keys server-only. Do not import server env modules into client components. Instantiate external SDKs lazily, only in configured live requests; empty keys must not cause module-import or build failures.

## 22. Environment files — required

Create .env.local and .env.example in the project ROOT using the exact empty template provided with this brief. If .env.local already exists, do not overwrite values, print secrets, or copy its contents into documentation. Add missing names without destroying existing configuration.

All newly created values remain empty. No sample secrets, invented IDs, fake domains, placeholder “YOUR_KEY” strings, or automatic credential discovery from unrelated projects.

Do not put .env.local in public/. Never commit it. Merge ignore rules for .env and .env.* while explicitly permitting only .env.example. Keep private certificate/key files outside public and source control.

With blank values, server config defaults PERIHELION_RUNTIME_MODE to demo. App name defaults to PERIHELION and local URL to the dev server. Blank optional variables normalize to undefined before validation. Do not turn empty numeric strings into zero accidentally.

Only NEXT_PUBLIC_APP_NAME and NEXT_PUBLIC_APP_URL in this template are intended for browser exposure. All provider secrets, runtime tokens, DB credentials, and certificate locations stay server-side. Frontend receives a safe readiness summary, never the env object.

The ANS variable names are our application configuration. Do not assume a provider SDK reads them automatically. Use documented registry auth and the sponsor-provided environment. Certificate paths are optional hooks, not evidence that mTLS or identity verification has been implemented.

Gemini and ElevenLabs credentials enable their respective adapters later. OPENAI_API_KEY and ANTHROPIC_API_KEY are optional application-runtime keys, not the user's VS Code subscription/login. No Stripe, billing system, or paid-agent purchase is required.

## 23. Motion, accessibility, and responsive behavior

Motion serves state transitions:
- Hover/press: approximately 120–180 ms.
- Panel/selection changes: approximately 180–260 ms.
- Recruitment admission: approximately 400–600 ms with skip/reduced-motion behavior.
- A verification scan occurs during an actual check; completion waits for its result.
- Idle contours are almost still; do not animate everything forever.

Prefer transform/opacity and a shared scheduler where a canvas needs one. No per-row or per-agent infinite animation timers. Pause decorative motion off-screen or when the document is hidden; operational state still reconciles correctly when visible again.

Support reduced motion, text scaling, visible focus, labeled icon controls, semantic headings, keyboard-operable tables/dialogs, focus return, and Escape dismissals. Do not announce every streamed token to screen readers. Test text contrast and status distinction; do not assume dark-theme colors are automatically accessible.

Desktop targets: 1440×900, 1920×1080, 1280×800. Tablet: collapsed rail and stacked inspectors. Mobile around 390 px: full-width mission list, sheet-based detail/approvals, compact voice dock, accessible list alternative to the graph. No microscopic desktop graph squeezed onto a phone. Keep touch controls comfortable and body scrolling predictable.

Command palette: Ctrl+K on Windows, Cmd+K on macOS. Commands include New mission, Find agent, Open directory, Review pending approvals, Toggle graph/list, Start/stop voice when available, and Reset demo. Do not intercept shortcuts inside text editing incorrectly.

## 24. Performance and reliability

Measure the actual implementation. Suggested targets are goals, not automatic PASS:
- Main interaction controls respond immediately to input.
- No animation-driven React re-render of the entire workspace every frame.
- Normal laptop operation aims for fluid rendering without sustained long tasks.
- Lazy-load graph/voice SDK when appropriate.
- Bound event-history memory and virtualize long tables if needed.
- No full-resolution reference-board images in the initial runtime payload.
- Clean up microphones, streams, observers, timers, object URLs, and graph subscriptions.
- Content remains usable when decorative assets or fonts fail.

Report hardware/browser and actual traces when citing performance. Do not equate successful compilation with smoothness.

## 25. Test matrix

Unit/contract tests:
- Blank env selects demo; no external SDK/network initialization.
- Invalid live configuration produces a clear error.
- One mission per idempotent submission.
- Valid state transitions; no completion before dependencies.
- Duplicate/out-of-order event handling.
- Recruitment is scoped and bounded.
- Identity verification does not imply authorization.
- Hard-denied action cannot be approved.
- One-time approval cannot be replayed or reused for changed input.
- Cancel/reset cleans up demo timers and state.

Browser tests:
- Landing → objective → mission → FIELD.
- Search/filter/open agents and directory dossiers.
- Detect capability deficit → admit specialist → observe graph update.
- Guardian blocks the synthetic out-of-scope action.
- Reviewable request can be approved once and reflected in logs.
- Final artifact opens and can be exported safely.
- Pause/resume/retry/cancel reflect correct status.
- Command palette, dialogs, keyboard focus, and mobile navigation work.
- Voice not-configured, microphone denied, connection failure, and text fallback.
- Refresh preserves demo state without duplicating work.
- Simulated stream disconnect shows stale/offline state, not false live status.

Capture actual browser screenshots of the four principal scenes. Compare against the boards for hierarchy, spacing, typography, atmosphere, readability, and composition. Fix generic card-wall layouts, over-bright contours, tiny text, dead controls, and ambiguous status before completion.

Never mark real ANS, voice, authorization enforcement, database persistence, or mobile performance PASS from fixtures. Report Implemented/demo-tested, Live-tested, Not configured, and Not tested separately.

## 26. Execution phases and design gate

Phase A — frontend foundation:
Inspect repository and references; write a short plan; establish contracts, tokens, reusable shell, empty env files, landing, and a strong FIELD screen with shared fixture state. Launch the app and take real screenshots. If this invocation is Phase A only, stop at the visual checkpoint for Roheen's review; do not disappear into backend work.

Phase B — complete frontend demo:
After the visual direction is accepted, implement remaining routes, functional controls, mission state engine, recruitment, Guardian, artifacts, command palette, and voice states. Keep the same visual system. Do not redo the design on every screen.

Phase C — handoff and testing:
Complete adapters/stubs, API contract examples, responsive behavior, tests, error states, no-key startup, integration checklist, and presenter flow. This is a complete frontend milestone even when real credentials are absent.

Phase D — separately authorized live integration:
Zabish/Ashraf connect real Gemini planning, a real ANS identity/discovery path, hosted specialists, policy gateway, persistence, and ElevenLabs. Connect one vertical slice at a time. Keep frontend layout untouched unless actual data demands adjustment. Do not claim the hackathon's sponsor integration is complete before the real path works.

Do not spend the weekend implementing production billing, marketplace payments, arbitrary autonomous code execution, SSO, enterprise compliance, a custom database, or a universal agent framework.

## 27. Team and account handoff

Create concise durable files so switching Codex accounts or using Claude/Antigravity does not restart the project:
- AGENTS.md: project constraints, commands, architecture, ownership boundaries.
- PLAN.md: phases and acceptance criteria.
- docs/DESIGN_SYSTEM.md: tokens, typography, layering, component decisions.
- docs/API_CONTRACT.md: versioned types, endpoint examples, events, errors.
- docs/INTEGRATION_HANDOFF.md: required env names, adapter status, teammate wiring instructions.
- docs/DEMO_SCRIPT.md: sequence, presenter controls, fallback disclosure.
- docs/TEST_RESULTS.md: tests actually run and limitations.
- docs/BUILD_STATUS.md: last working checkpoint, current blockers, exact next step.
- ATTRIBUTIONS.md: frameworks, assets, reference images, pre-existing/AI-assisted work.

Do not overwrite teammate code. Use separate branches/worktrees for parallel edits and assign ownership of shared contracts/package files. Only one agent should edit shared schema or lockfiles at a time.

## 28. Demo and completion bar

Suggested four-minute presentation:
0:00–0:25: explain the problem and give one objective.
0:25–1:00: show plan, tasks, and useful early output.
1:00–1:45: detect a missing capability, inspect identity, and admit a specialist.
1:45–2:35: show that verified identity still cannot bypass an unauthorized action.
2:35–3:15: deliver a useful artifact and concise voice summary when connected.
3:15–4:00: explain architecture, real versus simulated integrations, and team contribution.

This is a suggested demo script, not a claim that the application has done these actions yet. Keep a labeled deterministic replay available for network failure; disclose it instead of presenting it as a live execution.

Final handoff must report:
- Files changed and how to run locally in Windows PowerShell.
- Routes and features implemented.
- Reference images actually inspected.
- Screenshots of the running app.
- Demo sequence and alternate failure branches tested.
- Build/typecheck/lint/test results.
- Integration matrix: demo, configured, live-tested, blocked.
- Empty environment templates and missing variable names only.
- Exact remaining work for Zabish/Ashraf.
- Accessibility/performance observations and untested items.
- Confirmation that no production deployment or paid provider operation was performed without authorization.

Do not stop at “the dashboard renders.” The completed frontend must let a person submit an objective, inspect work, recruit a specialist, understand a Guardian intervention, and read a useful result—all with empty keys and honest demo labels.

The aesthetic should feel authored and unmistakably PERIHELION. The interaction should feel clear and fast. The architecture should make it easy for the backend team to replace simulation with real execution without rebuilding the UI.

## Appendix A — Exact empty .env.local / .env.example template

Create both files from this template. For an existing .env.local, preserve existing values; add only missing names. The optional sections do not authorize adding scope or dependencies before the frontend is ready.

```dotenv
# PERIHELION - local configuration template
# All values are intentionally empty. Never commit a populated .env.local.
# Place this file at the project ROOT, never under public/.
# Empty mode -> demo; no external API calls and no microphone capture.
# Provider/model IDs must be confirmed by the teammate wiring that adapter.

# Public, non-secret application metadata only
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_APP_URL=

# Server-side application mode: demo | live (blank defaults to demo)
PERIHELION_RUNTIME_MODE=

# Gemini: primary planning/analysis provider; server only
GEMINI_API_KEY=
GEMINI_MODEL=

# ElevenLabs: one Perihelion voice interface; server only
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
ELEVENLABS_VOICE_ID=
ELEVENLABS_TTS_MODEL_ID=
ELEVENLABS_WEBHOOK_SECRET=

# GoDaddy ANS: project adapter configuration, not universal SDK env names
# Verify the sponsor's actual API environment and authentication instructions.
ANS_REGISTRY_BASE_URL=
GODADDY_API_KEY=
GODADDY_API_SECRET=
ANS_AGENT_HOST=
ANS_AGENT_VERSION=
# Optional certificate-based verification/transport configuration.
# Paths must point to private server files, never public assets.
ANS_TRUST_BUNDLE_PATH=
ANS_CLIENT_CERT_PATH=
ANS_CLIENT_KEY_PATH=

# Team-hosted orchestrator/workers and server-to-server access
AGENT_RUNTIME_BASE_URL=
AGENT_RUNTIME_API_TOKEN=
AGENT_ALLOWED_ORIGINS=
INTERNAL_WEBHOOK_SECRET=
SESSION_SECRET=

# Optional live execution limits; code supplies conservative demo defaults
AGENT_MAX_CONCURRENT_RUNS=
AGENT_MAX_DELEGATION_DEPTH=
AGENT_MAX_STEPS=
AGENT_RUN_TIMEOUT_MS=
AGENT_MAX_ESTIMATED_COST_USD=

# Optional alternate runtime model providers. Not required for the UI.
# These are NOT Codex/Claude editor login credentials.
OPENAI_API_KEY=
OPENAI_MODEL=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=

# Optional research provider; no dependency until the adapter is selected
TAVILY_API_KEY=

# Optional persistence. Use the team's chosen adapter, not two databases.
DATABASE_URL=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# Optional real Linear connector; Linear-like UX does not require these
LINEAR_API_KEY=
LINEAR_TEAM_ID=
LINEAR_WEBHOOK_SECRET=

# Optional observability
SENTRY_DSN=

```
