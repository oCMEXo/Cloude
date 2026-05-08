import { validateRecipient, send, formatSubject } from './index';

describe('validateRecipient', () => {
  it('accepts a valid email', () => {
    expect(validateRecipient('email', 'alice@example.com')).toBe(true);
  });

  it('rejects malformed email', () => {
    expect(validateRecipient('email', 'not-an-email')).toBe(false);
  });

  it('accepts a valid phone number', () => {
    expect(validateRecipient('sms', '+37060012345')).toBe(true);
  });

  it('rejects non-numeric phone', () => {
    expect(validateRecipient('sms', 'abc')).toBe(false);
  });

  it('accepts any non-empty push token', () => {
    expect(validateRecipient('push', 'device-token-xyz')).toBe(true);
  });

  it('rejects empty recipient', () => {
    expect(validateRecipient('email', '')).toBe(false);
  });
});

describe('send', () => {
  it('returns ok with an id for a valid notification', async () => {
    const result = await send({
      to: 'alice@example.com',
      channel: 'email',
      subject: 'hi',
      body: 'hello'
    });
    expect(result.ok).toBe(true);
    expect(result.id).toMatch(/^msg_/);
  });

  it('refuses to send to an invalid recipient', async () => {
    const result = await send({
      to: 'bad-email',
      channel: 'email',
      body: 'hi'
    });
    expect(result.ok).toBe(false);
  });

  it('refuses to send empty body', async () => {
    const result = await send({
      to: 'alice@example.com',
      channel: 'email',
      body: ''
    });
    expect(result.ok).toBe(false);
  });
});

describe('formatSubject', () => {
  it('wraps prefix in brackets', () => {
    expect(formatSubject('ALERT', 'disk full')).toBe('[ALERT] disk full');
  });

  it('handles empty inputs gracefully', () => {
    expect(formatSubject('', '')).toBe('[]');
  });
});
