import { pool } from './db';
import { logger } from './logger';
import { Channel, NotificationStatus } from './notifications';

export interface Notification {
  id: number;
  recipient: string;
  channel: Channel;
  subject: string | null;
  body: string;
  status: NotificationStatus;
  attempts: number;
  createdAt: Date;
  sentAt: Date | null;
}

function rowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as number,
    recipient: row.recipient as string,
    channel: row.channel as Channel,
    subject: (row.subject as string) || null,
    body: row.body as string,
    status: row.status as NotificationStatus,
    attempts: row.attempts as number,
    createdAt: row.created_at as Date,
    sentAt: (row.sent_at as Date) || null
  };
}

export async function enqueue(
  recipient: string,
  channel: Channel,
  body: string,
  subject?: string
): Promise<Notification> {
  logger.info('Enqueueing notification', { recipient, channel });
  const result = await pool.query(
    `INSERT INTO notifications (recipient, channel, subject, body)
     VALUES ($1, $2, $3, $4)
     RETURNING id, recipient, channel, subject, body, status, attempts, created_at, sent_at`,
    [recipient, channel, subject || null, body]
  );
  return rowToNotification(result.rows[0]);
}

export async function get(id: number): Promise<Notification | null> {
  const result = await pool.query(
    'SELECT id, recipient, channel, subject, body, status, attempts, created_at, sent_at FROM notifications WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) return null;
  return rowToNotification(result.rows[0]);
}

export async function markSent(id: number): Promise<void> {
  await pool.query(
    `UPDATE notifications SET status = 'sent', sent_at = NOW(), attempts = attempts + 1
     WHERE id = $1`,
    [id]
  );
  logger.info('Notification marked sent', { id });
}

export async function markFailed(id: number): Promise<void> {
  await pool.query(
    `UPDATE notifications SET status = 'failed', attempts = attempts + 1 WHERE id = $1`,
    [id]
  );
  logger.warn('Notification marked failed', { id });
}
