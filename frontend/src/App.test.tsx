import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Menu';
import GoogleLoginButton from './components/GoogleLoginButton';
import { vi } from 'vitest';

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(),
}));

import { jwtDecode } from 'jwt-decode';

describe('App Routing', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('shows login when not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<GoogleLoginButton />} />
          <Route path="/menu" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login with Google')).toBeInTheDocument();
  });

  it('shows menu when authenticated and navigating to /menu', async () => {
    localStorage.setItem('token', 'fake.jwt.token');
    vi.mocked(jwtDecode).mockReturnValue({
      name: 'Test User',
      email: 'test@test.com',
      role: 'user',
      exp: 9999,
    });
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    render(
      <MemoryRouter initialEntries={['/menu']}>
        <Routes>
          <Route path="/" element={<GoogleLoginButton />} />
          <Route path="/menu" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hello Test User 👋')).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated users from protected routes', () => {
    render(
      <MemoryRouter initialEntries={['/menu']}>
        <Routes>
          <Route path="/menu" element={<Dashboard />} />
          <Route path="/" element={<GoogleLoginButton />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Not logged in')).toBeInTheDocument();
  });
});