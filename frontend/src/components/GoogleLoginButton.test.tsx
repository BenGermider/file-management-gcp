import { render, screen, fireEvent } from '@testing-library/react';
import GoogleLoginButton from './GoogleLoginButton';

describe('GoogleLoginButton', () => {
  it('renders the button with correct text', () => {
    render(<GoogleLoginButton />);
    expect(screen.getByText('Login with Google')).toBeInTheDocument();
  });

  it('redirects to Google login on click', () => {
    delete (window as any).location;
    (window as any).location = { href: '' };

    render(<GoogleLoginButton />);
    fireEvent.click(screen.getByText('Login with Google'));
    expect(window.location.href).toBe('http://localhost:8000/api/auth/google');
  });
});
