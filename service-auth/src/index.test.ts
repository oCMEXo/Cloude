import { authenticate, generateToken, hashPassword } from './index';

describe('hashPassword', () => {
  it('produces deterministic hash for same input', () => {
    expect(hashPassword('secret')).toBe(hashPassword('secret'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashPassword('a')).not.toBe(hashPassword('b'));
  });
});

describe('authenticate', () => {
  it('returns true for valid credentials', () => {
    expect(authenticate('alice', 'secret')).toBe(true);
  });

  it('returns false for wrong password', () => {
    expect(authenticate('alice', 'wrong')).toBe(false);
  });

  it('returns false for unknown user', () => {
    expect(authenticate('charlie', 'whatever')).toBe(false);
  });

  it('returns false for empty username', () => {
    expect(authenticate('', 'secret')).toBe(false);
  });

  it('returns false for empty password', () => {
    expect(authenticate('alice', '')).toBe(false);
  });
});

describe('generateToken', () => {
  it('returns a non-empty hex string', () => {
    const token = generateToken('alice');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns different tokens on subsequent calls', async () => {
    const t1 = generateToken('alice');
    await new Promise((r) => setTimeout(r, 5));
    const t2 = generateToken('alice');
    expect(t1).not.toBe(t2);
  });
});
