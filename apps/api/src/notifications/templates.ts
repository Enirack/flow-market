import type { NotificationType } from '@flowmarket/database';
import type { MailMessage } from './mail.service';

type EmailContent = Pick<MailMessage, 'subject' | 'html' | 'text'>;

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Les chaines interpolees dans les templates (noms, motifs, commentaires...) viennent de l'utilisateur. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/**
 * `greeting` et `lines` sont du texte brut fourni par l'appelant (jamais du
 * HTML) : ils sont echappes pour la version HTML et utilises tels quels pour
 * la version texte. `link`, s'il est fourni, est une URL construite par le
 * serveur (jamais de donnee utilisateur) et rendue telle quelle.
 */
function wrap(greeting: string, lines: string[], link?: string): { html: string; text: string } {
  const paragraphs = lines
    .map((line) => `<p style="margin:0 0 12px;color:#1f2937">${escapeHtml(line)}</p>`)
    .join('');
  const linkHtml = link
    ? `<p style="margin:0 0 12px;color:#1f2937"><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`
    : '';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <p style="font-size:18px;font-weight:600;color:#111827;margin:0 0 16px">FlowMarket</p>
      <p style="margin:0 0 16px;color:#1f2937">${escapeHtml(greeting)}</p>
      ${paragraphs}
      ${linkHtml}
    </div>
  `;
  const text = [greeting, '', ...lines, ...(link ? [link] : [])].join('\n');
  return { html, text };
}

export function emailVerificationTemplate(firstName: string, verifyUrl: string): EmailContent {
  const { html, text } = wrap(
    `Bonjour ${firstName},`,
    ['Merci de votre inscription sur FlowMarket. Confirmez votre adresse email en cliquant sur le lien ci-dessous :', 'Ce lien expire dans 24 heures.'],
    verifyUrl,
  );
  return { subject: 'Confirmez votre adresse email', html, text };
}

export function passwordResetTemplate(firstName: string, resetUrl: string): EmailContent {
  const { html, text } = wrap(
    `Bonjour ${firstName},`,
    [
      'Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour en choisir un nouveau :',
      "Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
    ],
    resetUrl,
  );
  return { subject: 'Réinitialisation de votre mot de passe', html, text };
}

export interface NotificationPayloads {
  BOOKING_CREATED: { serviceTitle: string; scheduledAt: string; counterpartName: string };
  BOOKING_CONFIRMED: { serviceTitle: string; scheduledAt: string; counterpartName: string };
  BOOKING_CANCELLED: { serviceTitle: string; scheduledAt: string; reason?: string };
  PAYMENT_RECEIVED: { serviceTitle: string; amount: number; currency: string };
  PAYMENT_FAILED: { serviceTitle: string; amount: number; currency: string };
  REFUND_PROCESSED: { serviceTitle: string; amount: number; currency: string };
  NEW_REVIEW: { serviceTitle: string; rating: number; comment: string | null; clientName: string };
  PAYOUT_PROCESSED: { amount: number; currency: string; status: 'PAID' | 'FAILED' | 'REJECTED'; reason?: string };
  DISPUTE_OPENED: { serviceTitle: string; reason: string };
  DISPUTE_RESOLVED: { serviceTitle: string; status: 'RESOLVED' | 'REJECTED'; resolution: string };
  NEW_MESSAGE: { senderName: string };
  SUBSCRIPTION_UPDATED: Record<string, never>;
}

function money(amount: number, currency: string): string {
  return `${amount.toLocaleString('fr-FR')} ${currency}`;
}

export function buildNotificationEmail<T extends keyof NotificationPayloads>(
  firstName: string,
  type: T,
  payload: NotificationPayloads[T],
): EmailContent {
  const greeting = `Bonjour ${firstName},`;

  switch (type) {
    case 'BOOKING_CREATED': {
      const p = payload as NotificationPayloads['BOOKING_CREATED'];
      return {
        subject: `Nouvelle réservation : ${p.serviceTitle}`,
        ...wrap(greeting, [
          `${p.counterpartName} vient de réserver « ${p.serviceTitle} » pour le ${new Date(p.scheduledAt).toLocaleString('fr-FR')}.`,
          'Connectez-vous à votre tableau de bord pour confirmer ou refuser cette réservation.',
        ]),
      };
    }
    case 'BOOKING_CONFIRMED': {
      const p = payload as NotificationPayloads['BOOKING_CONFIRMED'];
      return {
        subject: `Réservation confirmée : ${p.serviceTitle}`,
        ...wrap(greeting, [
          `${p.counterpartName} a confirmé votre réservation « ${p.serviceTitle} » pour le ${new Date(p.scheduledAt).toLocaleString('fr-FR')}.`,
        ]),
      };
    }
    case 'BOOKING_CANCELLED': {
      const p = payload as NotificationPayloads['BOOKING_CANCELLED'];
      return {
        subject: `Réservation annulée : ${p.serviceTitle}`,
        ...wrap(greeting, [
          `La réservation « ${p.serviceTitle} » prévue le ${new Date(p.scheduledAt).toLocaleString('fr-FR')} a été annulée.`,
          ...(p.reason ? [`Motif : ${p.reason}`] : []),
        ]),
      };
    }
    case 'PAYMENT_RECEIVED': {
      const p = payload as NotificationPayloads['PAYMENT_RECEIVED'];
      return {
        subject: `Paiement reçu : ${p.serviceTitle}`,
        ...wrap(greeting, [`Votre paiement de ${money(p.amount, p.currency)} pour « ${p.serviceTitle} » a bien été reçu.`]),
      };
    }
    case 'PAYMENT_FAILED': {
      const p = payload as NotificationPayloads['PAYMENT_FAILED'];
      return {
        subject: `Échec de paiement : ${p.serviceTitle}`,
        ...wrap(greeting, [
          `Votre paiement de ${money(p.amount, p.currency)} pour « ${p.serviceTitle} » a échoué. Veuillez réessayer depuis votre tableau de bord.`,
        ]),
      };
    }
    case 'REFUND_PROCESSED': {
      const p = payload as NotificationPayloads['REFUND_PROCESSED'];
      return {
        subject: `Remboursement traité : ${p.serviceTitle}`,
        ...wrap(greeting, [`Un remboursement de ${money(p.amount, p.currency)} pour « ${p.serviceTitle} » a été traité.`]),
      };
    }
    case 'NEW_REVIEW': {
      const p = payload as NotificationPayloads['NEW_REVIEW'];
      return {
        subject: `Nouvel avis sur ${p.serviceTitle}`,
        ...wrap(greeting, [
          `${p.clientName} a laissé un avis ${p.rating}/5 sur « ${p.serviceTitle} ».`,
          ...(p.comment ? [`« ${p.comment} »`] : []),
        ]),
      };
    }
    case 'PAYOUT_PROCESSED': {
      const p = payload as NotificationPayloads['PAYOUT_PROCESSED'];
      const statusLabel = p.status === 'PAID' ? 'effectué' : p.status === 'FAILED' ? 'échoué' : 'rejeté';
      return {
        subject: `Virement ${statusLabel} : ${money(p.amount, p.currency)}`,
        ...wrap(greeting, [
          `Votre demande de virement de ${money(p.amount, p.currency)} a été ${statusLabel}.`,
          ...(p.reason ? [`Motif : ${p.reason}`] : []),
        ]),
      };
    }
    case 'DISPUTE_OPENED': {
      const p = payload as NotificationPayloads['DISPUTE_OPENED'];
      return {
        subject: `Litige ouvert : ${p.serviceTitle}`,
        ...wrap(greeting, [
          `Un litige a été ouvert concernant « ${p.serviceTitle} ».`,
          `Motif : ${p.reason}`,
          'Notre équipe va examiner ce dossier.',
        ]),
      };
    }
    case 'DISPUTE_RESOLVED': {
      const p = payload as NotificationPayloads['DISPUTE_RESOLVED'];
      const statusLabel = p.status === 'RESOLVED' ? 'résolu en faveur du client' : 'rejeté';
      return {
        subject: `Litige ${p.status === 'RESOLVED' ? 'résolu' : 'rejeté'} : ${p.serviceTitle}`,
        ...wrap(greeting, [`Le litige concernant « ${p.serviceTitle} » a été ${statusLabel}.`, `Résolution : ${p.resolution}`]),
      };
    }
    default: {
      return { subject: 'Notification FlowMarket', ...wrap(greeting, ['Vous avez une nouvelle notification sur FlowMarket.']) };
    }
  }
}

export type { NotificationType };
