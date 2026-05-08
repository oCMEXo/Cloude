import { logger } from './logger';

export type Channel = 'email' | 'sms' | 'push';
export type NotificationStatus = 'queued' | 'sent' | 'failed';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const MAX_BODY_LENGTH = 5000;
const MAX_SUBJECT_LENGTH = 255;

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateRecipient(channel: Channel, to: string): ValidationResult {
  if (!to) return { ok: false, reason: 'recipient is required' };

  switch (channel) {
    case 'email':
      if (!EMAIL_REGEX.test(to)) return { ok: false, reason: 'invalid email format' };
      return { ok: true };
    case 'sms':
      if (!PHONE_REGEX.test(to)) return { ok: false, reason: 'invalid phone number' };
      return { ok: true };
    case 'push':
      if (to.length < 8) return { ok: false, reason: 'push token too short' };
      return { ok: true };
    default:
      return { ok: false, reason: `unsupported channel: ${channel}` };
  }
}

export function validateBody(body: string): ValidationResult {
  if (!body) return { ok: false, reason: 'body is required' };
  if (body.length > MAX_BODY_LENGTH) {
    return { ok: false, reason: `body exceeds ${MAX_BODY_LENGTH} characters` };
  }
  return { ok: true };
}

export function validateSubject(subject: string | undefined): ValidationResult {
  if (subject === undefined || subject === '') return { ok: true };
  if (subject.length > MAX_SUBJECT_LENGTH) {
    return { ok: false, reason: `subject exceeds ${MAX_SUBJECT_LENGTH} characters` };
  }
  return { ok: true };
}

export function formatSubject(prefix: string, topic: string): string {
  if (!prefix && !topic) return '';
  if (!prefix) return topic;
  if (!topic) return `[${prefix}]`;
  return `[${prefix}] ${topic}`;
}

export function templateBody(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(value));
  }
  // warn about unfilled placeholders
  const unfilled = result.match(/\{\{\s*\w+\s*\}\}/g);
  if (unfilled) {
    logger.warn('Template has unfilled placeholders', { unfilled });
  }
  return result;
}

export function shouldRetry(attempts: number, maxAttempts = 3): boolean {
  return attempts < maxAttempts;
}

export function backoffMs(attempts: number): number {
  // exponential backoff: 1s, 2s, 4s, 8s, ...
  return 1000 * Math.pow(2, attempts);
}
