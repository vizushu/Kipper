import {isStagingTest} from "@/lib/staging-session";
import type { Metadata } from "next";
import Link from "next/link";
import SmsPolicyShell from "../SmsPolicyShell";
export const metadata: Metadata = { title: "Terms & Conditions — SMS support", description: "Prelaunch SMS terms for guest-initiated Casa Pacifica / Ask Kipper support.", robots: { index: false, follow: false } };
export default function SmsTermsPage() {
  if(isStagingTest())return <p>Synthetic staging only. External guest contact is disabled.</p>;
  return <SmsPolicyShell title="Terms & Conditions">
    <p>Casa Pacifica / Ask Kipper SMS support is operated by Renier De La Cruz. SMS support is not yet available. These terms describe the planned service, not an active subscription.</p>
    <h2>SMS Terms</h2>
    <p>Once activated, you may initiate a text conversation to ask about Casa Pacifica or request help with your stay. By sending that message, you request replies relevant to that conversation. This does not authorize marketing, recurring campaigns or unrelated messages. SMS participation is optional and is not required to make a purchase.</p>
    <h2>Frequency, charges and preferences</h2>
    <p>Message frequency varies with your request. Message and data rates may apply. When the service is active, reply STOP to stop SMS replies; one opt-out confirmation may be sent. Reply HELP for assistance. No keyword response is active through this website now.</p>
    <h2>Human assistance</h2>
    <p>For guest help, SMS assistance or privacy questions, email <a href="mailto:vizushu@gmail.com">vizushu@gmail.com</a>. Renier De La Cruz is the human backup for Casa Pacifica / Ask Kipper support. The planned HELP response will identify Casa Pacifica / Ask Kipper and provide this email.</p>
    <p>Messaging delivery and response times are not guaranteed. No round-the-clock coverage is promised. Do not use SMS for emergencies; contact local emergency services for immediate danger.</p>
    <h2>Safe use and privacy</h2>
    <p>Please do not send payment-card information, passwords or property access codes by SMS. Kipper AI is not currently answering messages. Any later automated responder will be disclosed before use.</p>
    <p>See our <Link href="/policies/sms-privacy">SMS Privacy Policy</Link> for planned data handling and retention. Messaging will remain unavailable until the monitored responder route, STOP/HELP behavior and retention controls are implemented and tested.</p>
  </SmsPolicyShell>;
}
