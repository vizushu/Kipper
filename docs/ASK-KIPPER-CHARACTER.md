# Ask Kipper character — implementation review

## Source of truth
- [Character research hub](https://app.notion.com/p/40b1a005d0d0817487a8fd09fe6f1945)
- [Visual identity](https://app.notion.com/p/40b1a005d0d081779c0df6c41af4031f)
- [Conversation behavior](https://app.notion.com/p/40b1a005d0d0817db295e3d497c2fb7e)
- [Motion](https://app.notion.com/p/40b1a005d0d08166bfc2cfd505956de5)
- [Accessibility and placement](https://app.notion.com/p/40b1a005d0d0816d8727f590cb2a28cc)
- [Model/asset source](https://app.notion.com/p/40b1a005d0d08108a7dcd3201bf50175)

Read November 1, 2026. Study v0.1 is **for review**, not an approved production rig. Original rounded green k direction is founder-selected. Do not claim validated recognition, conversion uplift, or a final master.

## Delivery
Existing Ask Kipper links still open `/contact`. First visit per tab/session opens a dismissible welcome with a short greeting and one useful question. `Meet Kipper` reopens it. Back, Escape, backdrop dismissal, direct email and urgent help remain available without finishing an animation. Stay-guide action closes and focuses the existing verified guide.

Real 3D enhancement: lazy Three.js + GLTFLoader renders the source neutral GLB, three meshes (body/two eyes), no external model textures/resources. A restrained 1.67-second whole-body greeting tilt/lift returns exactly to neutral. No continuous idle loop, rig, branch animation, costume or morph target is claimed. The three Notion models have incompatible topology; do not treat them as blend shapes. No research ray marcher is shipped.

Fallback: original transparent mascot artwork, also used when reduced motion is requested. All help content remains real HTML. Canvas is decorative. Render stops after greeting and on hidden tab; resources are released on close/unmount. No audio, microphone, IP/localization inference, guest tracking or guest data.

The question is proposed implementation copy, derived from documented clear/warm/practical tone, not represented as a verbatim approved script. Public name is Kipper, not the internal nickname Kip.

## Honesty boundary
This is a character-led help introduction, **not a connected AI conversation**. There is no text input, model request, simulated thinking, message submission, dispatch or payment action. Status explicitly says the AI concierge is in development. Existing human email and stay-guide functions remain intact. Booking, payment, pricing, environment and security modules are unchanged.

## Assets / status
- `public/kipper/original-mascot.png`: original Notion selected visual, unchanged PNG bytes.
- `public/kipper/neutral-concept.glb`: original Notion static concept mesh, unchanged bytes, 578,660 bytes. For-review approximation of the raster silhouette, not an approved master or production rig.
- No ChatGPT pet atlas or private workflow/QA archive is published.

## Release gates
Local code/asset review and browser testing do not authorize public publication. Parent coordinates repository/deploy approval. Real-device iOS/Android performance and assistive-technology review remain separate from headless-browser checks. Live AI backend and human inbox routing remain separate work.

## Verification checkpoint
- Original PNG SHA-256 matches the Notion handoff provenance manifest: `b0e3e6afe616ac2644f08e52c73f956cada93bcde38646971181f235c798bb21`.
- Neutral GLB SHA-256: `d953579aaa08e5d11a5683a037d05de1cca9a069119fc3f3e6c9ef611c1d198a`.
- Original PNG pixels and Notion procedural geometry board inspected. This is asset inspection, **not** a successful live-render screenshot.
- Initial complete unit suite: 805 tests passed. Typecheck and production build passed; rerun required after any review changes.
- Local browser run blocked: Chromium could not create a Unix socket under sandbox. Escalated execution failed at environment setup. No browser visual/interaction pass is claimed. A prepared browser test script is an internal QA artifact, not proof it ran.
- Pending: independent code review, actual browser render/focus/dismissal/reduced-motion/no-WebGL checks on an approved reachable preview, and founder visual review. No release performed.
