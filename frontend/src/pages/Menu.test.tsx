import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from './Menu';
import { vi } from 'vitest';

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(),
}));

import { jwtDecode } from 'jwt-decode';

describe('Dashboard', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@test.com',
    role: 'user',
    exp: 9999,
  };

  const mockAdminUser = {
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'admin',
    exp: 9999,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.confirm = vi.fn(() => true);
  });

  describe('Authentication', () => {
    it('shows not logged in if no token', () => {
      render(<Dashboard />);
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    it('renders user info when logged in', async () => {
      localStorage.setItem('token', 'fake.jwt.token');
      vi.mocked(jwtDecode).mockReturnValue(mockUser);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Hello Test User 👋')).toBeInTheDocument();
        expect(screen.getByText('Email: test@test.com')).toBeInTheDocument();
      });
    });

    it('shows admin badge for admin users', async () => {
      localStorage.setItem('token', 'fake.jwt.token');
      vi.mocked(jwtDecode).mockReturnValue(mockAdminUser);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('👑 Admin User')).toBeInTheDocument();
      });
    });

    it('logs out and clears token', async () => {
      localStorage.setItem('token', 'fake.jwt.token');
      vi.mocked(jwtDecode).mockReturnValue(mockUser);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      delete (window as any).location;
      (window as any).location = { href: '' };

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Logout'));

      expect(localStorage.getItem('token')).toBeNull();
      expect(window.location.href).toBe('/');
    });
  });

  describe('File Upload', () => {
    it('uploads files successfully', async () => {
      localStorage.setItem('token', 'fake.jwt.token');
      vi.mocked(jwtDecode).mockReturnValue(mockUser);

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('📁 Upload Files')).toBeInTheDocument();
      });

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/files/upload'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('prevents uploading more than 10 files', async () => {
      localStorage.setItem('token', 'fake.jwt.token');
      vi.mocked(jwtDecode).mockReturnValue(mockUser);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('📁 Upload Files')).toBeInTheDocument();
      });

      const files = Array.from({ length: 11 }, (_, i) =>
        new File(['content'], `test${i}.txt`, { type: 'text/plain' })
      );
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files } });

      await waitFor(() => {
        expect(screen.getByText(/Maximum 10 files per upload/)).toBeInTheDocument();
      });
    });

    it('shows error on upload failure', async () => {
      localStorage.setItem('token', 'fake.jwt.token');
      vi.mocked(jwtDecode).mockReturnValue(mockUser);

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ detail: 'Upload failed' }),
        } as Response);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('📁 Upload Files')).toBeInTheDocument();
      });

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Upload failed/)).toBeInTheDocument();
      });
    });
  });

  describe('File Operations', () => {
    const mockFiles = [
      { id: '1', name: 'file1.txt', type: 'text/plain', size: 1024, created_at: '2024-01-01' },
      { id: '2', name: 'file2.pdf', type: 'application/pdf', size: 2048, created_at: '2024-01-02' },
    ];

    it('fetches and displays files on mount', async () => {
      localStorage.setItem('token', 'fake.jwt.token');
      vi.mocked(jwtDecode).mockReturnValue(mockUser);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockFiles,
      } as Response);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('file1.txt')).toBeInTheDocument();
        expect(screen.getByText('file2.pdf')).toBeInTheDocument();
      });
    });

    it('deletes file after confirmation', async () => {
      localStorage.setItem('token', 'fake.jwt.token');
      vi.mocked(jwtDecode).mockReturnValue(mockUser);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockFiles,
      } as Response);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('file1.txt')).toBeInTheDocument();
      });

      vi.mocked(global.fetch).mockClear();
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: true } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => [mockFiles[1]] } as Response);

      const deleteButtons = screen.getAllByText('🗑️');
      fireEvent.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.queryByText('file1.txt')).not.toBeInTheDocument();
        expect(screen.getByText('file2.pdf')).toBeInTheDocument();
      });
    });

    it('does not delete if user cancels confirmation', async () => {
      vi.mocked(global.confirm).mockReturnValue(false);
      localStorage.setItem('token', 'fake.jwt.token');
      vi.mocked(jwtDecode).mockReturnValue(mockUser);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockFiles,
      } as Response);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('file1.txt')).toBeInTheDocument();
      });

      vi.mocked(global.fetch).mockClear();

      const deleteButtons = screen.getAllByText('🗑️');
      fireEvent.click(deleteButtons[0]);

      expect(vi.mocked(global.fetch)).not.toHaveBeenCalled();
    });
  });
});