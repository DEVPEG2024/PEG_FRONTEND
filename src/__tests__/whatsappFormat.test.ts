import { agentIsTyping, authorLabel, errorText, eurFr, initials, isBackendMissing, listTime, sortConversations, stateInfo, statusLabel, timeLeftLabel } from '@/views/app/admin/whatsapp/whatsappFormat';
import type { WhatsappConversation, WhatsappMessage } from '@/@types/whatsapp';

const conv = (over: Partial<WhatsappConversation>): WhatsappConversation => ({
  id: 1, phone: '+33 6', name: 'X', state: 'agent', isTest: false, consent: null, unread: 0, preview: '', lastInboundAt: null, lastOutboundAt: null,
  updatedAt: null, windowOpen: true, windowClosesAt: null, handoffReason: null, handoffSummary: null, handoffAt: null, offerTotalTTC: null,
  leadDocumentId: null, customerDocumentId: null, pendingReply: null, ...over,
});

describe('conversations WhatsApp', () => {
  test('ceux qui attendent passent devant, le plus ancien en tête', () => {
    const sorted = sortConversations([
      conv({ id: 1, updatedAt: '2026-11-07T10:00:00Z' }),
      conv({ id: 2, state: 'waiting_human', handoffAt: '2026-11-07T09:00:00Z' }),
      conv({ id: 3, state: 'waiting_human', handoffAt: '2026-11-06T09:00:00Z' }),
      conv({ id: 4, updatedAt: '2026-11-07T11:00:00Z' }),
    ]);
    expect(sorted.map((c) => c.id)).toEqual([3, 2, 4, 1]);
  });

  test('temps restant avant la fermeture des 24 h', () => {
    const now = Date.parse('2026-11-07T12:00:00Z');
    expect(timeLeftLabel('2026-11-07T15:30:00Z', now)).toBe('Plus que 4 h');
    expect(timeLeftLabel('2026-11-07T12:20:00Z', now)).toBe('Plus que 20 min');
    expect(timeLeftLabel('2026-11-07T11:00:00Z', now)).toBe('24 h dépassées');
    expect(timeLeftLabel(null, now)).toBeNull();
    expect(timeLeftLabel('nimporte', now)).toBeNull();
  });

  test('libellés d’état, d’auteur et d’envoi', () => {
    expect(stateInfo({ state: 'waiting_human' }).label).toBe('À vous de répondre');
    expect(stateInfo({ state: 'human' }).label).toBe('Vous avez repris');
    expect(stateInfo({ state: 'agent' }).label).toBe('Agent');
    expect(authorLabel({ author: 'admin' })).toBe('Équipe PEG');
    expect(authorLabel({ author: 'contact' })).toBe('');
    expect(statusLabel('failed')).toBe('Non remis');
    expect(statusLabel('received')).toBeNull();
  });

  test('heure dans la liste', () => {
    const now = new Date(2026, 10, 7, 12, 0);
    expect(listTime(new Date(2026, 10, 7, 9, 5).toISOString(), now)).toBe('09:05');
    expect(listTime(new Date(2026, 10, 6, 9, 5).toISOString(), now)).toBe('Hier');
    expect(listTime(new Date(2026, 10, 1, 9, 5).toISOString(), now)).toBe('01/11');
    expect(listTime(null, now)).toBe('');
  });

  test('l’agent écrit seulement juste après un message du contact', () => {
    const now = Date.parse('2026-11-07T12:00:00Z');
    const msg = (direction: 'in' | 'out', createdAt: string) => ({ direction, createdAt }) as WhatsappMessage;
    expect(agentIsTyping({ state: 'agent' }, [msg('in', '2026-11-07T11:59:50Z')], now)).toBe(true);
    expect(agentIsTyping({ state: 'human' }, [msg('in', '2026-11-07T11:59:50Z')], now)).toBe(false);
    expect(agentIsTyping({ state: 'agent' }, [msg('out', '2026-11-07T11:59:50Z')], now)).toBe(false);
    expect(agentIsTyping({ state: 'agent' }, [msg('in', '2026-11-07T11:00:00Z')], now)).toBe(false);
    expect(agentIsTyping(null, [], now)).toBe(false);
  });

  test('divers', () => {
    expect(initials('Club Essai Annecy')).toBe('CE');
    expect(initials('+33 6 12')).toBe('36');
    expect(initials('')).toBe('?');
    expect(isBackendMissing({ response: { status: 405 } })).toBe(true);
    expect(isBackendMissing({ response: { status: 500 } })).toBe(false);
    expect(errorText({ response: { data: { error: 'Refusé' } } }, 'x')).toBe('Refusé');
    expect(errorText({ response: { data: { error: { message: 'technique' } } } }, 'x')).toBe('x');
    expect(eurFr(251.88).replace(/\s/g, ' ')).toBe('251,88 €');
    expect(eurFr(null)).toBe('');
  });
});
