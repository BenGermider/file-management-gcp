import { render } from '@testing-library/react';
import OAuthCallback from './OAuthCallback';
import * as auth from '../auth/auth';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../auth/auth');

describe('OAuthCallback', () => {
  it('stores token and navigates', () => {
    vi.mocked(auth.decodeToken).mockReturnValue({
      name: 'Test',
      email: 'test@test.com',
      role: 'user',
      exp: 9999,
    });

    window.history.pushState({}, '', '/oauth/callback?token=testtoken');
    render(
      <MemoryRouter initialEntries={['/oauth/callback?token=testtoken']}>
        <OAuthCallback />
      </MemoryRouter>
    );

    expect(localStorage.getItem('token')).toBe('testtoken');
    expect(auth.decodeToken).toHaveBeenCalledWith('testtoken');
  });
});