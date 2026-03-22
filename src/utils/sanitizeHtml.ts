import DOMPurify from 'dompurify';
import parse from 'html-react-parser';

/**
 * Sanitize HTML with DOMPurify before parsing with html-react-parser.
 * Use this everywhere instead of calling ReactHtmlParser directly.
 */
export function safeHtmlParse(html: string) {
  const clean = DOMPurify.sanitize(html);
  return parse(clean);
}
