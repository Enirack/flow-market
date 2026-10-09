import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMailMock = vi.fn();
const createTransportMock = vi.fn((options: unknown) => {
  void options;
  return { sendMail: sendMailMock };
});

vi.mock('nodemailer', () => ({ createTransport: (options: unknown) => createTransportMock(options) }));

import { MailService } from './mail.service';

describe('MailService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('logs instead of sending when SMTP_HOST is not configured', async () => {
    delete process.env.SMTP_HOST;
    const service = new MailService();

    await service.sendMail({ to: 'client@flowmarket.dev', subject: 'Test', html: '<p>hi</p>', text: 'hi' });

    expect(createTransportMock).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('sends through the SMTP transport when SMTP_HOST is configured', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '2525';
    process.env.MAIL_FROM = 'FlowMarket <no-reply@flowmarket.dev>';
    sendMailMock.mockResolvedValue(undefined);

    const service = new MailService();
    await service.sendMail({ to: 'client@flowmarket.dev', subject: 'Test', html: '<p>hi</p>', text: 'hi' });

    expect(createTransportMock).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.example.com', port: 2525 }));
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'client@flowmarket.dev', subject: 'Test' }),
    );
  });

  it('absorbs a send failure without throwing', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    sendMailMock.mockRejectedValue(new Error('connection refused'));

    const service = new MailService();
    await expect(
      service.sendMail({ to: 'client@flowmarket.dev', subject: 'Test', html: '<p>hi</p>', text: 'hi' }),
    ).resolves.toBeUndefined();
  });
});
