# Casa Pacifica guest contact foundation

The contact page presents Slack, Discord, SMS and Ask dot in a responsive card grid.
Disconnected options have honest status text, not dead buttons or simulated chat.
No guest details are collected on the page. Existing `/api/contact` preview blocking
is unchanged; the legacy email form is not mounted on the new channel page.

## Current state

No destinations, numbers, accounts or credentials have been configured. No guest
messages have been sent. Ask dot is **not live** and has no submit control, iframe,
SDK, web socket, fabricated reply, hidden public API or private conversation link.
Kipper remains the in-development concierge AI; the website brand is Casa Pacifica.

## Guest-facing links (future explicit configuration)

Only the server page reads `src/lib/guest-contact.ts`; it must not be imported by
client components. Runtime rendering prevents destinations being baked into a
static page at build time. `SITE_PREVIEW_MODE=true` strips all destinations even
when other flags or values are present. Unavailable cards never serialize them.

Outside preview, `GUEST_CONTACT_LINKS_APPROVED=true` also requires an approved value:
- `GUEST_CONTACT_SLACK_URL`: HTTPS `join.slack.com/t/<workspace>/shared_invite/<invite>`.
- `GUEST_CONTACT_DISCORD_URL`: HTTPS `discord.gg/<invite>` or `discord.com/invite/<invite>`.
- `GUEST_CONTACT_SMS_NUMBER`: guest-support E.164 number, `+` and 8–15 digits.

These are outbound invitation/SMS-app links, not integrations or automated answers.
There is no prefilled message, guest-data forwarding or provider call on render.
URL credentials, query strings, fragments, custom ports, internal channel paths,
unrecognized domains and malformed phone numbers are rejected. External links use
no-referrer and noreferrer/noopener. URL validation does not prove a destination is
guest-safe: the owner must verify intended audience, permissions, number ownership,
moderation and invite availability before approving publication. Do not configure
personal numbers or existing private team spaces. No Slack/Discord/SMS credentials
belong in these fields. The current preview stays closed even after link approval.

## Ask dot / future adapter boundary

No supported public dot guest API has been verified. Native dot texting is not
assumed to support arbitrary guest recipients. A private Slack automation is not a
secure guest chat product by itself. Do not build or enable a speculative relay.

A future integration requires an approved transport and clear guest identity/session
model, separate guest-safe knowledge from private assistant memory, ticket-to-thread
binding, per-visitor authorization on replies, rate limits/abuse handling, explicit
privacy/retention disclosures and escalation rules. Reject prompts requesting
private records, entry codes, payments or unauthorized changes. A human escalation
must not expose internal channels, personal contact details or another guest's
conversation. Test sender authenticity, replay/deduplication and isolation using
synthetic data before any real message flow. No credentials or provisioning are
part of this increment.

## Pending owner decisions and validation

Provide the dedicated guest Slack/Discord invitations and approved guest SMS number.
Choose whether guests talk to actual dot via a verified supported integration or a
separate, narrowly scoped Kipper FAQ assistant with human/dot escalation. Neither
has been activated or silently substituted. Browser/device outbound-app behavior,
provider permissions and guest-session security remain untested until configured.
