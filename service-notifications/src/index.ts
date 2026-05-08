import { logger } from './logger';

export type Channel = 'email' | 'sms' | 'push';

export interface Notification {
  to: string;
  channel: Channel;
  subject?: string;
  body: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

export function validateRecipient(channel: Channel, to: string): boolean {
  logger.debug('Validating recipient', { channel, to });

  if (!to) {
    logger.warn('Empty recipient', { channel });
    return false;
  }

  switch (channel) {
    case 'email':
      return EMAIL_REGEX.test(to);
    case 'sms':
      return PHONE_REGEX.test(to);
    case 'push':
      return to.length > 0;
    default:
      logger.error('Unknown channel', { channel });
      return false;
  }
}

export async function send(notification: Notification): Promise<{ ok: boolean; id?: string }> {
  logger.info('Dispatching notification', {
    channel: notification.channel,
    to: notification.to
  });

  if (!validateRecipient(notification.channel, notification.to)) {
    logger.error('Invalid recipient, skipping send', {
      channel: notification.channel,
      to: notification.to
    });
    return { ok: false };
  }

  if (!notification.body) {
    logger.error('Empty body, skipping send', { channel: notification.channel });
    return { ok: false };
  }

  // Simulate provider call
  try {
    await new Promise((r) => setTimeout(r, 1));
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    logger.info('Notification sent', {
      id,
      channel: notification.channel,
      to: notification.to
    });
    return { ok: true, id };
  } catch (err) {
    logger.error('Notification provider error', {
      err: (err as Error).message,
      channel: notification.channel
    });
    return { ok: false };
  }
}

export function formatSubject(prefix: string, topic: string): string {
  if (!prefix || !topic) {
    logger.warn('formatSubject called with empty prefix or topic', { prefix, topic });
  }
  return `[${prefix}] ${topic}`.trim();
}

if (require.main === module) {
  logger.info('service-notifications starting up', { pid: process.pid });
}
