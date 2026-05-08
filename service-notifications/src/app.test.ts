import request from 'supertest';

jest.mock('./repository', () => {
  let nextId = 1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = new Map<number, any>();

  return {
    enqueue: jest.fn(async (recipient: string, channel: string, body: string, subject?: string) => {
      const item = {
        id: nextId++,
        recipient,
        channel,
        subject: subject || null,
        body,
        status: 'queued',
        attempts: 0,
        createdAt: new Date(),
        sentAt: null
      };
      items.set(item.id, item);
      return item;
    }),
    get: jest.fn(async (id: number) => items.get(id) || null),
    markSent: jest.fn(async (id: number) => {
      const item = items.get(id);
      if (item) {
        item.status = 'sent';
        item.sentAt = new Date();
        item.attempts++;
      }
    }),
    markFailed: jest.fn(async (id: number) => {
      const item = items.get(id);
      if (item) {
        item.status = 'failed';
        item.attempts++;
      }
    }),
    __reset: () => {
      items.clear();
      nextId = 1;
    }
  };
});

import { createApp } from './app';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const repoMock = require('./repository');

const app = createApp();

beforeEach(() => {
  repoMock.__reset();
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});

describe('POST /notifications', () => {
  it('queues an email notification and marks sent', async () => {
    const res = await request(app).post('/notifications').send({
      recipient: 'alice@example.com',
      channel: 'email',
      subject: 'Hi',
      body: 'Hello'
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('sent');
    expect(res.body.attempts).toBe(1);
  });

  it('queues an SMS notification', async () => {
    const res = await request(app).post('/notifications').send({
      recipient: '+37060012345',
      channel: 'sms',
      body: 'Verification code: 1234'
    });
    expect(res.status).toBe(201);
  });

  it('renders a template body with vars', async () => {
    const res = await request(app)
      .post('/notifications')
      .send({
        recipient: 'alice@example.com',
        channel: 'email',
        template: 'Hello {{name}}, your order #{{orderId}} is ready.',
        vars: { name: 'Alice', orderId: 42 }
      });
    expect(res.status).toBe(201);
    expect(res.body.body).toBe('Hello Alice, your order #42 is ready.');
  });

  it('rejects missing channel', async () => {
    const res = await request(app)
      .post('/notifications')
      .send({ recipient: 'a@b.com', body: 'hi' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post('/notifications')
      .send({ recipient: 'not-an-email', channel: 'email', body: 'hi' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid phone', async () => {
    const res = await request(app)
      .post('/notifications')
      .send({ recipient: 'abc', channel: 'sms', body: 'hi' });
    expect(res.status).toBe(400);
  });

  it('rejects empty body', async () => {
    const res = await request(app)
      .post('/notifications')
      .send({ recipient: 'a@b.com', channel: 'email', body: '' });
    expect(res.status).toBe(400);
  });

  it('rejects oversized subject', async () => {
    const res = await request(app)
      .post('/notifications')
      .send({
        recipient: 'a@b.com',
        channel: 'email',
        subject: 'x'.repeat(256),
        body: 'hi'
      });
    expect(res.status).toBe(400);
  });
});

describe('GET /notifications/:id', () => {
  it('retrieves a notification', async () => {
    const created = await request(app).post('/notifications').send({
      recipient: 'a@b.com',
      channel: 'email',
      body: 'hi'
    });
    const res = await request(app).get(`/notifications/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/notifications/9999');
    expect(res.status).toBe(404);
  });

  it('returns 400 for non-numeric id', async () => {
    const res = await request(app).get('/notifications/abc');
    expect(res.status).toBe(400);
  });
});
