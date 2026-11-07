/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { toast } from 'react-toastify';
import Password from '@/views/app/account/components/Password';
import PublicRoute from '@/components/route/PublicRoute';
import { passwordErrorMessage } from '@/utils/passwordErrors';

// Signalé le 07/11/2026 : « les clients n'arrivent pas à modifier leur mot de
// passe ». L'écran envoyait PUT /users/:id, droit retiré aux clients depuis le
// 11/07/2026 : 403, erreur avalée, retour à l'onglet Profil comme si c'était fait.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockChange = jest.fn();
jest.mock('@/services/AuthService', () => ({
  apiChangePassword: (data: unknown) => mockChange(data),
}));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn() } }));
let mockAuthenticated = false;
jest.mock('@/utils/hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({ authenticated: mockAuthenticated }),
}));

const strapiError = (status: number, message: string) => ({
  response: { status, data: { data: null, error: { status, name: 'ValidationError', message } } },
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  jest.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const type = (id: string, value: string) => {
  const input = container.querySelector(`#${id}`) as HTMLInputElement;
  expect(input).not.toBeNull();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const fillAndSubmit = async (current: string, next: string, confirm = next) => {
  await act(async () => {
    type('define-currentPassword', current);
    type('define-newPassword', next);
    type('define-confirmNewPassword', confirm);
  });
  await act(async () => {
    (container.querySelector('button[type="submit"]') as HTMLButtonElement).click();
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

const renderPassword = async () => {
  const onTabChange = jest.fn();
  await act(async () => root.render(<Password onTabChange={onTabChange} />));
  return onTabChange;
};

describe('compte — changer son mot de passe', () => {
  it('passe par la route native, mot de passe actuel compris, et annonce le succès', async () => {
    mockChange.mockResolvedValue({ data: { jwt: 'x' } });
    const onTabChange = await renderPassword();
    expect(container.querySelector('#define-currentPassword')?.getAttribute('autocomplete')).toBe('current-password');
    await fillAndSubmit('Ancien123', 'Nouveau123');
    expect(mockChange).toHaveBeenCalledWith({
      currentPassword: 'Ancien123',
      password: 'Nouveau123',
      passwordConfirmation: 'Nouveau123',
    });
    expect(toast.success).toHaveBeenCalledWith('Mot de passe modifié');
    expect(onTabChange).toHaveBeenCalledWith('profile');
  });

  it('refus du serveur : erreur affichée, formulaire conservé, jamais de faux succès', async () => {
    mockChange.mockRejectedValue(strapiError(400, 'The provided current password is invalid'));
    const onTabChange = await renderPassword();
    await fillAndSubmit('Faux999', 'Nouveau123');
    expect(container.textContent).toContain('Mot de passe actuel incorrect');
    expect(toast.success).not.toHaveBeenCalled();
    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('5 caractères (minimum Strapi = 6) ou mot de passe actuel vide : rien n’est envoyé', async () => {
    await renderPassword();
    await fillAndSubmit('Ancien123', 'Ab123');
    expect(container.textContent).toContain('6 caractères min');
    await fillAndSubmit('', 'Nouveau123');
    expect(container.textContent).toContain('Mot de passe actuel requis');
    expect(mockChange).not.toHaveBeenCalled();
  });
});

describe('messages d’erreur', () => {
  const fallback = 'Repli';
  it.each([
    ['Your new password must be different than your current password', 'différent'],
    ['Passwords do not match', 'ne correspondent pas'],
    ['password must be at least 6 characters', '6 caractères'],
    ['Password must be less than 73 bytes', '72 caractères'],
    ['This email does not exist', 'Aucun compte'],
    ['Code invalide ou expiré', 'Ce lien a expiré'],
    ['Too many requests, please try again later.', 'Trop de tentatives'],
  ])('%s', (message, expected) => {
    expect(passwordErrorMessage(strapiError(400, message), fallback)).toContain(expected);
  });

  it('limiteur de requêtes (error = texte)', () => {
    const err = { response: { status: 429, data: { error: 'Trop de requêtes. Réessayez dans une minute.' } } };
    expect(passwordErrorMessage(err, fallback)).toContain('Trop de tentatives');
  });

  it('erreur inconnue ou réseau : le repli, jamais le texte technique', () => {
    expect(passwordErrorMessage(strapiError(403, 'Forbidden'), fallback)).toBe(fallback);
    expect(passwordErrorMessage(new Error('Network Error'), fallback)).toBe(fallback);
    expect(passwordErrorMessage(undefined, fallback)).toBe(fallback);
  });
});

describe('lien « réinitialiser » de l’e-mail', () => {
  const renderRoutes = (path: string) =>
    act(async () =>
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<PublicRoute />}>
              <Route path="sign-in" element={<p>connexion</p>} />
              <Route path="reset-password" element={<p>formulaire</p>} />
            </Route>
            <Route path="*" element={<p>accueil</p>} />
          </Routes>
        </MemoryRouter>
      )
    );

  it('déjà connecté sur cet appareil : le formulaire s’ouvre quand même', async () => {
    mockAuthenticated = true;
    await renderRoutes('/reset-password?code=abc');
    expect(container.textContent).toBe('formulaire');
  });

  it('les autres pages publiques renvoient toujours un compte connecté vers l’accueil', async () => {
    mockAuthenticated = true;
    await renderRoutes('/sign-in');
    expect(container.textContent).not.toBe('connexion');
  });

  it('non connecté : pages publiques accessibles', async () => {
    mockAuthenticated = false;
    await renderRoutes('/sign-in');
    expect(container.textContent).toBe('connexion');
  });
});
