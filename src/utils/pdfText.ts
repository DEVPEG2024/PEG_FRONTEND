// Extraction du texte d'un PDF côté navigateur.
// pdfjs est chargé à la demande (dynamic import) pour ne pas alourdir le bundle
// principal — seul l'admin qui importe un questionnaire télécharge la lib.
import { loadPdfjs } from './pdfPages';

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ('str' in it ? (it as { str: string }).str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (line) pages.push(line);
  }

  return pages.join('\n').trim();
}
