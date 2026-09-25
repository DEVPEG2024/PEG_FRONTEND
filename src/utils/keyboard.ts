// Champs qui n'ouvrent pas le clavier virtuel d'un téléphone
const NON_TEXT_INPUTS = new Set([
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'range',
  'color',
  'file',
  'image',
  'hidden',
]);

/** Ce champ ouvre-t-il le clavier virtuel ? (barre d'onglets, écran de rotation) */
export const opensKeyboard = (el: EventTarget | Element | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  return (
    el.tagName === 'INPUT' &&
    !NON_TEXT_INPUTS.has((el as HTMLInputElement).type)
  );
};
