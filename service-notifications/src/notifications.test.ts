import {
  validateRecipient,
  validateBody,
  validateSubject,
  formatSubject,
  templateBody,
  shouldRetry,
  backoffMs
} from './notifications';

describe('validateRecipient', () => {
  it('accepts valid email', () => {
    expect(validateRecipient('email', 'alice@example.com').ok).toBe(true);
  });

  it('rejects malformed email', () => {
    expect(validateRecipient('email', 'not-an-email').ok).toBe(false);
  });

  it('accepts valid international phone', () => {
    expect(validateRecipient('sms', '+37060012345').ok).toBe(true);
  });

  it('accepts phone without leading +', () => {
    expect(validateRecipient('sms', '37060012345').ok).toBe(true);
  });

  it('rejects too short phone', () => {
    expect(validateRecipient('sms', '12345').ok).toBe(false);
  });

  it('rejects non-numeric phone', () => {
    expect(validateRecipient('sms', '+abc-def').ok).toBe(false);
  });

  it('accepts long push token', () => {
    expect(validateRecipient('push', 'device-token-xyz-1234').ok).toBe(true);
  });

  it('rejects too short push token', () => {
    expect(validateRecipient('push', 'short').ok).toBe(false);
  });

  it('rejects empty recipient', () => {
    expect(validateRecipient('email', '').ok).toBe(false);
  });

  it('rejects unsupported channel', () => {
    const r = validateRecipient('fax' as never, 'anything');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/unsupported channel/);
  });
});

describe('validateBody', () => {
  it('accepts a normal body', () => {
    expect(validateBody('Hello world').ok).toBe(true);
  });

  it('rejects empty body', () => {
    expect(validateBody('').ok).toBe(false);
  });

  it('rejects body over 5000 chars', () => {
    expect(validateBody('x'.repeat(5001)).ok).toBe(false);
  });

  it('accepts body of exactly 5000 chars', () => {
    expect(validateBody('x'.repeat(5000)).ok).toBe(true);
  });
});

describe('validateSubject', () => {
  it('accepts undefined subject', () => {
    expect(validateSubject(undefined).ok).toBe(true);
  });

  it('accepts empty subject', () => {
    expect(validateSubject('').ok).toBe(true);
  });

  it('accepts a normal subject', () => {
    expect(validateSubject('Order confirmation').ok).toBe(true);
  });

  it('rejects subject over 255 chars', () => {
    expect(validateSubject('x'.repeat(256)).ok).toBe(false);
  });
});

describe('formatSubject', () => {
  it('wraps prefix in brackets', () => {
    expect(formatSubject('ALERT', 'disk full')).toBe('[ALERT] disk full');
  });

  it('returns just topic when no prefix', () => {
    expect(formatSubject('', 'topic')).toBe('topic');
  });

  it('returns just bracketed prefix when no topic', () => {
    expect(formatSubject('PRE', '')).toBe('[PRE]');
  });

  it('returns empty when both empty', () => {
    expect(formatSubject('', '')).toBe('');
  });
});

describe('templateBody', () => {
  it('substitutes simple placeholders', () => {
    expect(templateBody('Hello {{name}}', { name: 'Alice' })).toBe('Hello Alice');
  });

  it('handles whitespace inside placeholders', () => {
    expect(templateBody('Hello {{ name }}', { name: 'Alice' })).toBe('Hello Alice');
  });

  it('substitutes numeric values', () => {
    expect(templateBody('You owe ${{amount}}', { amount: 100 })).toBe('You owe $100');
  });

  it('replaces all occurrences of the same placeholder', () => {
    expect(templateBody('{{x}} and {{x}}', { x: 'hi' })).toBe('hi and hi');
  });

  it('leaves unfilled placeholders alone', () => {
    expect(templateBody('Hello {{name}}', {})).toBe('Hello {{name}}');
  });

  it('substitutes multiple different vars in one pass', () => {
    expect(templateBody('{{greeting}} {{name}}, order #{{id}}', { greeting: 'Hi', name: 'Bob', id: 7 }))
      .toBe('Hi Bob, order #7');
  });
});

describe('shouldRetry', () => {
  it('allows retry when under max', () => {
    expect(shouldRetry(0)).toBe(true);
    expect(shouldRetry(2)).toBe(true);
  });

  it('stops at max attempts', () => {
    expect(shouldRetry(3)).toBe(false);
    expect(shouldRetry(5)).toBe(false);
  });

  it('respects custom max', () => {
    expect(shouldRetry(4, 5)).toBe(true);
    expect(shouldRetry(5, 5)).toBe(false);
  });
});

describe('backoffMs', () => {
  it('returns exponential delays', () => {
    expect(backoffMs(0)).toBe(1000);
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(2)).toBe(4000);
    expect(backoffMs(3)).toBe(8000);
  });
});
