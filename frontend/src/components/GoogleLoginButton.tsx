import React from 'react';

const GoogleLoginButton: React.FC = () => {

  const handleLogin = () => {

  const backendUrl = import.meta.env.REACT_APP_API_URL;
  window.location.href = `${backendUrl}/api/auth/google`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '60px 50px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: '450px',
        width: '100%',
        textAlign: 'center',
        animation: 'slideUp 0.6s ease-out'
      }}>
        {/* Logo/Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 30px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)'
        }}>
          📁
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#1a202c',
          marginBottom: '12px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
          Welcome Back
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#718096',
          marginBottom: '40px',
          lineHeight: '1.6'
        }}>
          Secure file management made simple.<br />
          Sign in to access your files.
        </p>

        {/* Google Login Button */}
        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1a202c',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'all 0.3s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.borderColor = '#667eea';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.8 10.2273C19.8 9.51821 19.7364 8.83639 19.6182 8.18182H10.2V12.0491H15.5818C15.3364 13.2946 14.6182 14.3582 13.5545 15.0673V17.5764H16.8182C18.7091 15.8364 19.8 13.2727 19.8 10.2273Z" fill="#4285F4"/>
            <path d="M10.2 20C12.9 20 15.1727 19.1045 16.8182 17.5764L13.5545 15.0673C12.6682 15.6682 11.5364 16.0227 10.2 16.0227C7.59545 16.0227 5.37273 14.2636 4.58636 11.9H1.21818V14.4909C2.85455 17.7591 6.27273 20 10.2 20Z" fill="#34A853"/>
            <path d="M4.58636 11.9C4.37273 11.2991 4.25 10.6591 4.25 10C4.25 9.34091 4.37273 8.70091 4.58636 8.1V5.50909H1.21818C0.540909 6.85909 0.15 8.38636 0.15 10C0.15 11.6136 0.540909 13.1409 1.21818 14.4909L4.58636 11.9Z" fill="#FBBC04"/>
            <path d="M10.2 3.97727C11.6591 3.97727 12.9682 4.48182 13.9909 5.45455L16.8909 2.55455C15.1682 0.940909 12.8955 0 10.2 0C6.27273 0 2.85455 2.24091 1.21818 5.50909L4.58636 8.1C5.37273 5.73636 7.59545 3.97727 10.2 3.97727Z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Features */}
        <div style={{
          marginTop: '40px',
          paddingTop: '30px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-around',
          gap: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</div>
            <div style={{ fontSize: '12px', color: '#718096', fontWeight: '500' }}>Secure</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
            <div style={{ fontSize: '12px', color: '#718096', fontWeight: '500' }}>Fast</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>☁️</div>
            <div style={{ fontSize: '12px', color: '#718096', fontWeight: '500' }}>Cloud</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default GoogleLoginButton;