import { BAT_ACCEPT, isAcceptedBatFile } from '@/utils/batFiles';

// BAT (fiche produit et projet) : plus seulement le PDF (demande du 25/09/2026).

describe('formats de BAT', () => {
  it('accepte le PDF, les images courantes et les fichiers de travail', () => {
    for (const name of [
      'bat.pdf',
      'visuel.jpg',
      'visuel.jpeg',
      'maquette.png',
      'rendu.webp',
      'logo.ai',
      'montage.psd',
      'vecteur.eps',
      'livrables.zip',
    ]) {
      expect(isAcceptedBatFile(name)).toBe(true);
    }
  });

  it('ignore la casse de l’extension', () => {
    expect(isAcceptedBatFile('PHOTO.JPG')).toBe(true);
    expect(isAcceptedBatFile('Bat Final.PDF')).toBe(true);
  });

  it('refuse le reste, SVG compris (peut embarquer du script)', () => {
    for (const name of [
      'dessin.svg',
      'setup.exe',
      'bat.pdf.exe',
      'sans-extension',
      'texte.txt',
    ]) {
      expect(isAcceptedBatFile(name)).toBe(false);
    }
  });

  it('le champ de fichier propose exactement les mêmes formats', () => {
    expect(BAT_ACCEPT).toBe('.pdf,.jpg,.jpeg,.png,.webp,.ai,.psd,.eps,.zip');
  });
});
