// src/components/Dashboard.tsx
import React from 'react';

interface Menu {
  user: { name: string; role?: string };
}

const Dashboard: React.FC<Menu> = ({ user }) => {
  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Hello {user.name}!</h1>
      <p>What would you like to do?</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li>
          <button>Upload Files</button>
        </li>
        <li>
          <button>See Your Files</button>
        </li>

      </ul>
    </div>
  );
};

export default Dashboard;
