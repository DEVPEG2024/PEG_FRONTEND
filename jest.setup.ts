/**
 * Setup jest global.
 *
 * jsdom n'expose pas TextEncoder/TextDecoder, dont react-dom/server a besoin.
 * On les fournit depuis le module `util` de Node quand ils manquent (no-op en
 * environnement node, qui les possède déjà).
 */
import { TextEncoder, TextDecoder } from 'util';

const g = global as unknown as {
  TextEncoder?: unknown;
  TextDecoder?: unknown;
};

if (typeof g.TextEncoder === 'undefined') g.TextEncoder = TextEncoder;
if (typeof g.TextDecoder === 'undefined') g.TextDecoder = TextDecoder;
