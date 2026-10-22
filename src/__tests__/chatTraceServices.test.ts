/**
 * @jest-environment jsdom
 */

// Création d'un article avec sa conversation du chat : si le serveur ne connaît
// pas encore le champ (front déployé avant le back), la commande part quand même,
// sans lui — et on ne le renvoie plus de la session.

const mockCreate = jest.fn();
jest.mock('@/services/OrderItemServices', () => ({
  apiCreateOrderItem: (...args: unknown[]) => mockCreate(...args),
}));
jest.mock('@/services/ApiService', () => ({
  __esModule: true,
  default: { fetchData: jest.fn() },
}));

type Svc = typeof import('@/services/ChatTraceServices');
type Trace = typeof import('@/components/template/chat/chatTrace');

const CONV = '4f1e2d3c-aaaa-bbbb-cccc-1234567890ab';
const item = {
  product: { documentId: 'p1' },
  sizeAndColorSelections: [],
  formAnswer: null,
  price: 10,
  state: 'pending',
  customer: { documentId: 'c1' },
};
const created = (documentId = 'oi0000000001') => ({
  data: { data: { createOrderItem: { documentId, price: 10 } } },
});
const unknownField = {
  errors: [
    {
      message:
        'Variable "$data" got invalid value; Field "chatConversationId" is not defined by type "OrderItemInput".',
    },
  ],
};

let svc: Svc;
let trace: Trace;
beforeEach(() => {
  mockCreate.mockReset();
  // État « champ connu / inconnu » retenu par module : un module neuf par test.
  jest.isolateModules(() => {
    svc = require('@/services/ChatTraceServices');
    trace = require('@/components/template/chat/chatTrace');
  });
});

describe('createOrderItemWithTrace', () => {
  it('champ accepté → envoyé, article noté pour la clôture', async () => {
    mockCreate.mockResolvedValue(created());
    const res = await svc.createOrderItemWithTrace(item as never, CONV);
    expect(res).toEqual(created());
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0]).toEqual({
      ...item,
      chatConversationId: CONV,
    });
    expect(trace.tracedConversationOf('oi0000000001')).toBe(CONV);
  });

  it('sans conversation (ou invalide) → requête inchangée', async () => {
    mockCreate.mockResolvedValue(created());
    await svc.createOrderItemWithTrace(item as never, undefined);
    await svc.createOrderItemWithTrace(item as never, 'x');
    expect(mockCreate.mock.calls.map((c) => c[0])).toEqual([item, item]);
  });

  it('400 GraphQL « chatConversationId » → rejoué sans le champ, puis plus jamais envoyé', async () => {
    mockCreate
      .mockRejectedValueOnce({ response: { status: 400, data: unknownField } })
      .mockResolvedValue(created());
    const res = await svc.createOrderItemWithTrace(item as never, CONV);
    expect(res).toEqual(created());
    expect(mockCreate.mock.calls.map((c) => c[0])).toEqual([
      { ...item, chatConversationId: CONV },
      item,
    ]);
    expect(trace.tracedConversationOf('oi0000000001')).toBeNull();
    await svc.createOrderItemWithTrace(item as never, CONV);
    expect(mockCreate.mock.calls[2][0]).toEqual(item);
  });

  it('200 avec erreurs « chatConversationId » → rejoué sans le champ, puis plus jamais envoyé', async () => {
    mockCreate
      .mockResolvedValueOnce({ data: { data: null, ...unknownField } })
      .mockResolvedValue(created());
    await svc.createOrderItemWithTrace(item as never, CONV);
    await svc.createOrderItemWithTrace(item as never, CONV);
    expect(mockCreate.mock.calls.map((c) => c[0])).toEqual([
      { ...item, chatConversationId: CONV },
      item,
      item,
    ]);
  });

  it('autre erreur → propagée, sans rejouer', async () => {
    const boom = {
      response: {
        status: 400,
        data: { errors: [{ message: 'Forbidden access' }] },
      },
    };
    mockCreate.mockRejectedValue(boom);
    await expect(
      svc.createOrderItemWithTrace(item as never, CONV)
    ).rejects.toBe(boom);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
