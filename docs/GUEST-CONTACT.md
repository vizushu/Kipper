# Unified Ask Kipper contact experience

`/contact` is the single Ask Kipper entry linked from the header and footer. It uses
one narrow column: “Questions about your stay?”, a prominent Message us action,
a quiet email alternative, and a directly visible booked-guest urgent-help section.
No search, multi-field form or automated question sequence is required.

## Original foundation state — superseded for email by approved SMS disclosures below

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

## Messaging activation requirements

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

## Approved prelaunch SMS disclosures — October 31, 2026
The owner approved public SMS policy attribution to Renier De La Cruz, the help/privacy
email vizushu@gmail.com, and a human-backup role. The personal escalation phone is
not public and is not stored in this repository. The public email alternative is now
a mailto link; the website itself still receives no contact submissions in preview.

Dedicated /policies/sms-privacy and /policies/sms-terms pages describe the approved
planned guest-initiated support service, not an active campaign. Existing draft lodging
terms remain separate. Message us stays disabled in every mode, without any SMS number
or link. No keyword, responder, webhook, API credential or provider setting is activated.
The policies state frequency/rates, STOP/HELP, no marketing enrollment, approved human
backup/email, and no guaranteed response time or currently answering AI.

Own-system ordinary message/delivery retention is planned for up to 90 days after
conversation closure, with documented exceptions and minimal consent/opt-out records.
This is not implemented yet. Launch must define closure/reopening semantics, durable
provider SID inventory, purge scheduling/retry/audit and provider deletion handling.
Do not infer a 90-day global erase guarantee. Provider archives/backups differ:
- https://help.twilio.com/articles/223181008-Twilio-SMS-message-and-traffic-storage
- https://www.twilio.com/docs/messaging/api/message-resource (Delete: message-body
  backups may persist up to 30 days after HTTP DELETE).

These pages alone are not evidence of working opt-in or two-way messaging. A truthful
prelaunch campaign-review demonstration requires separately approved complete flow
evidence; do not invent a web form or keyword enrollment. No campaign submission occurs
from this code change.

## Useful self-service while messaging is pending
The primary contact action is now Email us, a blank mailto to the approved support
address; it does not submit data to the website or claim delivery. Six optional,
initially closed native disclosures provide a clearly labeled verified stay guide,
not live AI/chat. Current occupancy, date-transition limitations, arrival facts and
cancellation text use canonical property/policy sources. No private address, access
code, live availability, quote, invented amenity or guest context is returned.
SMS prelaunch disclosures remain available in a secondary expandable section with a
disabled SMS control and links to approved policies. Human contact is never gated on
answering questions. See CURRENT-BOOKING-READINESS.md for actual remaining launch gates.
