# Unified Ask Kipper contact experience

`/contact` is the single Ask Kipper entry linked from the header and footer. It uses
one narrow column: “Questions about your stay?”, a prominent Message us action,
a quiet email alternative, and a directly visible booked-guest urgent-help section.
No search, multi-field form or automated question sequence is required.

## Current state — not connected

No verified monitored guest channel, guest email or urgent-support contact has
been configured. Message us is explicitly disabled with an associated explanation.
Email and urgent website contact have short unavailable statuses, not large cards
or invented links. Booked guests are directed to the verified host contact in their
original confirmation; immediate danger is directed to local emergency services.
This is guidance, not an operational emergency channel or response-time promise.

Kipper AI is not answering. The page accepts no guest details, sends no messages,
and makes no provider calls. It does not expose personal numbers, private emails,
Slack invitations, Discord communities or private assistant conversations. Slack
is an internal team implementation concern, not a competing public contact option.

The historical `guest-contact.ts` invitation validator remains unused by this page;
even its old approved-link flags cannot activate the new contact experience. Its
unit validation is retained, but it is not a supported public messaging integration.
The existing `/api/contact` and public-preview guards remain unchanged. The legacy
email form is not mounted. No credentials, destination values, provider accounts or
service configuration were changed in this increment.

## Before activation

The owner must choose and verify one monitored guest-facing conversation channel,
a dedicated guest email alternative and an urgent human route, including ownership,
coverage, permissions and privacy disclosures. Only then should the corresponding
controls be wired and tested. The urgent route must bypass automated questions.
No response-time SLA is approved.

Future Kipper AI must identify itself clearly and escalate into that same conversation,
not another competing system. No supported public dot API or Muse guest relay is
assumed. A future adapter needs guest/session isolation, authenticated replies,
ticket-to-thread binding, abuse limits, deduplication, retention and human escalation.
Internal Slack history, private assistant memory, another guest’s data and access
codes must never be exposed. Test with synthetic data before approving real messages.

This update changes presentation only; it does not implement or activate messaging.
