import {
  hashPassword,
  validateUsername,
  validatePassword,
  issueToken,
  verifyToken
} from './auth';

describe('hashPassword', () => {
  it('produces a deterministic hex digest', () => {
    expect(hashPassword('secret')).toBe(hashPassword('secret'));
    expect(hashPassword('a')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hashes for different inputs', () => {
    expect(hashPassword('a')).not.toBe(hashPassword('b'));
  });
});

describe('validateUsername', () => {
  it('accepts a valid username', () => {
    expect(validateUsername('alice_99')).toEqual({ ok: true });
  });

  it('rejects empty username', () => {
    expect(validateUsername('')).toEqual({ ok: false, reason: 'username is required' });
  });

  it('rejects too short username', () => {
    const res = validateUsername('al');
    expect(res.ok).toBe(false);
  });

  it('rejects too long username', () => {
    const res = validateUsername('a'.repeat(33));
    expect(res.ok).toBe(false);
  });

  it('rejects username with special characters', () => {
    const res = validateUsername('alice!');
    expect(res.ok).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts a valid password', () => {
    expect(validatePassword('correcthorse')).toEqual({ ok: true });
  });

  it('rejects empty password', () => {
    expect(validatePassword('')).toEqual({ ok: false, reason: 'password is required' });
  });

  it('rejects too short password', () => {
    const res = validatePassword('short');
    expect(res.ok).toBe(false);
  });

  it('rejects too long password', () => {
    const res = validatePassword('x'.repeat(129));
    expect(res.ok).toBe(false);
  });
});

describe('issueToken / verifyToken', () => {
  it('issues a JWT for a given username', () => {
    const token = issueToken('alice');
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // header.payload.signature
  });

  it('verifies a valid token and returns the payload', () => {
    const token = issueToken('alice');
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.username).toBe('alice');
  });

  it('returns null for a malformed token', () => {
    expect(verifyToken('not-a-real-token')).toBeNull();
  });

  it('returns null for empty token', () => {
    expect(verifyToken('')).toBeNull();
  });
});
