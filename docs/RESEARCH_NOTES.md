# CORTEXAI — Evidence and research notes

Prepared September 18, 2026. This is a primary-source synthesis and design brief, not a recovered standalone Deep Research output.

## What was available

The user's brief and design decisions in the current conversation: frontend-first; VS Code/Codex as the main builder; team of Roheen, Zabish, and Ashraf; Gemini, ElevenLabs, ANS discovery/identity, dynamic recruitment, Guardian oversight, task organization; the move from NEXUS to CORTEXAI; rejection of planet-dominated visuals; four CORTEXAI image boards.

The shared conversation at https://chatgpt.com/share/6aad8a25-6fdc-83ea-ab89-8e102a7900af could not be fetched. A completed standalone Deep Research report was not found in the available file search. Do not claim unseen content is included. The new build brief explicitly separates supplied direction from verified platform details and original implementation recommendations.

## Verified primary sources

### S1 — APHELION visual/content reference
https://heroes.aphelion.center/

The retrieved page uses coordinates, sector/object numbering, an archive structure, and authored interaction descriptions. Its Caustic section explicitly labels a synthetic observation; its Cue adaptation emphasizes user-controlled interaction. These support editorial/instrument-like framing and honest labeling. The exact colors, typography sizes, and six-layer treatment in MASTER_PROMPT.md are proposed design decisions guided by the user's four boards, not measurements claimed from the website. A complete live-browser visual audit was not available in this pass.

### S2 — Linear product structure
https://linear.app/features

Linear organizes work around planning/projects, issue tracking, cycles, insights, and agent-assisted workflows. CORTEXAI borrows organized work and inspectable progress, not Linear branding. This does not require a real Linear API integration for the hackathon frontend.

### S3 — Agent observability
https://docs.langchain.com/langsmith/studio

LangSmith Studio provides graph visualization, agent interaction, and state inspection/debugging. The useful design lesson is that an agent graph must expose execution and results, not merely act as animation. No requirement to use LangChain is implied.

### S4 — ANS identity, possession, authorization distinction
https://www.godaddy.com/resources/news/dont-trust-verify-offline-sub-millisecond-agent-verification-with-ans

GoDaddy's September 15, 2026 engineering post separates identity, proof of possession, and authorization. The CORTEXAI spec preserves those boundaries. ANS identity is not itself a behavioral safety score or permission to write data. Guardian's deterministic gateway and scoped approvals are proposed application architecture, not claims that ANS supplies them automatically.

### S5 — ANS developer integration
https://www.godaddy.com/ans/developers
https://www.godaddy.com/hi-in/ans/developers
https://aboutus.godaddy.net/newsroom/news-releases/press-release-details/2025/GoDaddy-advances-trusted-AI-agent-identity-with-ANS-API-and-Standards-site/default.aspx

The developer material covers registration, registry access, SDK examples, domain/identity prerequisites, and key/secret authentication. Use the sponsor's actual environment and installed SDK documentation. The ANS_* environment names in our template are project-defined adapter inputs, not guaranteed names that every SDK recognizes.

### S6 — ElevenLabs React integration
https://elevenlabs.io/docs/eleven-agents/libraries/react
https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-webrtc-token

The current React documentation describes @elevenlabs/react, ConversationProvider/hooks, and session authentication. Private WebRTC sessions use a conversation token obtained server-side; signed URLs refer to the WebSocket path. The voice UI must not expose a long-lived key. Recheck the installed SDK version before copying method signatures.

### S7 — Gemini configuration and validated outputs
https://ai.google.dev/gemini-api/docs/api-key
https://ai.google.dev/gemini-api/docs/structured-output

Google documents GEMINI_API_KEY/GOOGLE_API_KEY environment-based authentication and keeping production keys off clients. Structured outputs can follow JSON Schema and still need application validation before action. Provider availability/model IDs/auth-key requirements should be confirmed in the team's actual account; the template intentionally does not invent them.

### S8 — Next.js environment handling
https://nextjs.org/docs/app/guides/environment-variables

Next.js loads .env files and exposes NEXT_PUBLIC_* variables to browser bundles. All provider credentials in this handoff remain unprefixed/server-only. The .env.local file belongs at the project root and must stay outside public/ and source control.

### S9 — Codex goal mode
https://developers.openai.com/codex/use-cases/follow-goals
https://learn.chatgpt.com/use-cases/follow-goals

OpenAI documents /goal for bounded, sustained work with a verifiable stopping condition and validation loop; it also documents pause/resume/clear and enabling the goals feature. Recommendation for this project: first approve one real design checkpoint, then use a bounded goal for the remaining frontend milestone. An indefinite goal such as “make it perfect” is not a useful acceptance condition.

### S10 — Event submission context
https://vthacks-14.devpost.com/
https://vthacks-14.devpost.com/rules

The retrieved Devpost page lists September 18–20, 2026, submission by Sunday September 20 at 8 AM ET, four-minute judging presentations, and disclosure of pre-existing components. It lists GoDaddy sponsor awards plus Gemini and ElevenLabs categories. The precise “best use of ANS” sponsor challenge is supplied by the user, not independently confirmed by the public prize text retrieved here. Confirm current sponsor instructions with organizers/mentors.

## Corrections to generated reference-board copy

Do not ship invented trust percentages, fictional on-chain credentials, the 2025 timestamps, unmeasured mission health, radiation readings, artificial agent counts, or “100% safe” claims. These are image-generation artifacts. Keep the aesthetic and rebuild the information with real state or explicitly labeled fixtures.

## What is still unverified

No repository, backend deployment, real ANS registration, provider credential, voice agent configuration, or actual runtime has been inspected or modified for this handoff. No API integration has been executed. The four images are concept references, not running application screenshots. This package is a build brief and empty configuration scaffold, not an implemented app.
