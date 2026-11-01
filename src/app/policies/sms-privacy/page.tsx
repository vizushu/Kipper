import {isStagingTest} from "@/lib/staging-session";
import type { Metadata } from "next";
import SmsPolicyShell from "../SmsPolicyShell";
export const metadata: Metadata = { title: "Privacy Policy — SMS support", description: "Prelaunch SMS privacy disclosures for Casa Pacifica / Ask Kipper.", robots: { index: false, follow: false } };
export default function SmsPrivacyPage() {
  if(isStagingTest())return <p>Synthetic staging only. External guest contact is disabled.</p>;
  return <SmsPolicyShell title="Privacy Policy">
    <p>Casa Pacifica / Ask Kipper SMS support is operated by Renier De La Cruz. The service has not launched. These disclosures describe the planned service; this website is not collecting SMS messages or enrolling anyone in SMS support.</p>
    <h2>Information and purpose</h2>
    <p>When activated, the service will process your phone number, the messages you choose to send, and message-delivery, consent and opt-out records to respond to your request, operate the messaging service and honor your communication preferences. Twilio will process messages as our messaging service provider. Authorized support personnel will receive only the information needed to handle your request.</p>
    <p>We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.</p>
    <h2>Your messaging choices</h2>
    <p>A support conversation is not consent to marketing or recurring notifications. Message frequency varies with the conversation you initiate. Message and data rates may apply. When the service is active, reply STOP to stop SMS replies or HELP for assistance.</p>
    <h2>Retention</h2>
    <p>The planned service will retain ordinary message history and delivery records in our own support system for up to 90 days after a conversation closes. Records needed to resolve an active dispute, investigate abuse or meet legal obligations may be kept longer. Minimal consent evidence will be retained while we rely on that consent, and minimal opt-out records for as long as needed to prevent further messages without renewed permission. Exceptions will be reviewed and records removed when their purpose ends.</p>
    <p>This is not a promise that every provider copy will be erased within 90 days. Twilio maintains separate provider records, archives and backups under its own retention processes. Its default message archives may be retained indefinitely unless deletion is configured or requested; deleted message-body backups may remain for up to 30 days. Provider compliance records and retention periods may differ.</p>
    <p>Our retention scheduler and provider deletion process are not configured yet. SMS support will remain unavailable until retention controls and the monitored reply route have been implemented and tested.</p>
    <h2>Privacy requests</h2>
    <p>For questions or requests concerning SMS privacy, email <a href="mailto:vizushu@gmail.com">vizushu@gmail.com</a>. We will review requests under applicable requirements. Records needed to honor opt-outs, maintain required consent evidence or meet legal obligations may need to be retained.</p>
  </SmsPolicyShell>;
}
