// src/App.tsx
import React from 'react';
import GoogleLoginButton from './components/GoogleLoginButton';

const App: React.FC = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
      <GoogleLoginButton />
    </div>
  );
};

export default App;
