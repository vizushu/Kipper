/** Server-only configuration reader. Never import this module from a client component.
 * Public-preview projection intentionally strips all destinations, even if configured.
 * Only explicitly approved guest-facing destinations may be configured, never team channels.
 */
import { isPublicPreview } from './booking-launch';

export type GuestContactChannel = {
  id: 'slack' | 'discord' | 'sms' | 'dot';
  name: string;
  description: string;
  status: 'available' | 'preview' | 'not_connected' | 'in_development';
  href?: string;
  action?: string;
};

function approvedInvite(value: string | undefined, provider: 'slack' | 'discord'): string | undefined {
  if (!value || value.length > 1000) return;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return;
    const valid = provider === 'slack'
      ? url.hostname === 'join.slack.com' && /^\/t\/[a-zA-Z0-9_-]+\/shared_invite\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)
      : (url.hostname === 'discord.gg' && /^\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) ||
        (url.hostname === 'discord.com' && /^\/invite\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname));
    return valid ? url.href : undefined;
  } catch { return; }
}

export function getGuestContactChannels(): GuestContactChannel[] {
  const preview = isPublicPreview();
  const approved = !preview && process.env.GUEST_CONTACT_LINKS_APPROVED === 'true';
  const sms = process.env.GUEST_CONTACT_SMS_NUMBER;
  const destinations = approved ? {
    slack: approvedInvite(process.env.GUEST_CONTACT_SLACK_URL, 'slack'),
    discord: approvedInvite(process.env.GUEST_CONTACT_DISCORD_URL, 'discord'),
    sms: sms && /^\+[1-9]\d{7,14}$/.test(sms) ? `sms:${sms}` : undefined,
  } : {};
  const channels: Omit<GuestContactChannel, 'status' | 'href'>[] = [
    { id: 'slack', name: 'Slack', description: 'A dedicated guest space, separate from private team conversations.', action: 'Open guest Slack' },
    { id: 'discord', name: 'Discord', description: 'A guest community for stay questions, once a dedicated invitation is connected.', action: 'Open guest Discord' },
    { id: 'sms', name: 'SMS', description: 'Text a designated guest-support number from your messaging app. Carrier rates may apply.', action: 'Open text message' },
  ];
  return [
    ...channels.map(channel => {
      const href = destinations[channel.id as keyof typeof destinations];
      return { ...channel, status: preview ? 'preview' as const : href ? 'available' as const : 'not_connected' as const,
        ...(href ? { href } : {}) };
    }),
    { id: 'dot', name: 'Ask dot', description: 'A planned way to ask questions about Casa Pacifica. The guest-facing connection is not available yet.', status: 'in_development' },
  ];
}
