import request from 'supertest';

jest.mock('./users', () => {
  const users = new Map<string, { id: number; username: string; passwordHash: string; createdAt: Date }>();
  let nextId = 1;
  const { hashPassword } = jest.requireActual('./auth');

  return {
    findByUsername: jest.fn(async (u: string) => users.get(u) || null),
    createUser: jest.fn(async (u: string, p: string) => {
      const user = {
        id: nextId++,
        username: u,
        passwordHash: hashPassword(p),
        createdAt: new Date()
      };
      users.set(u, user);
      return user;
    }),
    verifyCredentials: jest.fn(async (u: string, p: string) => {
      const user = users.get(u);
      if (!user) return null;
      return user.passwordHash === hashPassword(p) ? user : null;
    }),
    __reset: () => {
      users.clear();
      nextId = 1;
    }
  };
});

import { createApp } from './app';
const usersMock = jest.requireMock('./users');

const app = createApp();

beforeEach(() => {
  usersMock.__reset();
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /register', () => {
  it('registers a new user and returns a token', async () => {
    const res = await request(app)
      .post('/register')
      .send({ username: 'alice', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe('alice');
    expect(res.body.token).toBeTruthy();
  });

  it('rejects invalid username', async () => {
    const res = await request(app)
      .post('/register')
      .send({ username: 'a', password: 'secret123' });
    expect(res.status).toBe(400);
  });

  it('rejects short password', async () => {
    const res = await request(app)
      .post('/register')
      .send({ username: 'alice', password: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate username', async () => {
    await request(app).post('/register').send({ username: 'alice', password: 'secret123' });
    const res = await request(app)
      .post('/register')
      .send({ username: 'alice', password: 'secret123' });
    expect(res.status).toBe(409);
  });
});

describe('POST /login', () => {
  beforeEach(async () => {
    await request(app).post('/register').send({ username: 'alice', password: 'secret123' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'alice', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'alice', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown user', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'nobody', password: 'secret123' });
    expect(res.status).toBe(401);
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/login').send({ username: 'alice' });
    expect(res.status).toBe(400);
  });
});

describe('POST /verify', () => {
  it('verifies a freshly-issued token', async () => {
    const reg = await request(app)
      .post('/register')
      .send({ username: 'bob', password: 'secret123' });
    const res = await request(app).post('/verify').send({ token: reg.body.token });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.username).toBe('bob');
  });

  it('rejects a garbage token', async () => {
    const res = await request(app).post('/verify').send({ token: 'garbage' });
    expect(res.status).toBe(401);
  });

  it('rejects missing token', async () => {
    const res = await request(app).post('/verify').send({});
    expect(res.status).toBe(400);
  });
});
