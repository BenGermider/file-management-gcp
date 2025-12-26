// src/components/GoogleLoginButton.tsx
import React from 'react';

const GoogleLoginButton: React.FC = () => {
  console.log("GoogleLoginButton rendered");

  const handleLogin = () => {
    window.location.href = "http://localhost:8000/api/auth/google";
  };



  return (
    <button
      onClick={handleLogin}
      style={{
        padding: '10px 20px',
        backgroundColor: '#4285F4',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
      }}
    >
      Login with Google
    </button>
  );
};

export default GoogleLoginButton;
