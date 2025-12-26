// src/pages/Dashboard.tsx
import { decodeToken } from "../auth/auth";

const Dashboard = () => {
  const token = localStorage.getItem("token");
  if (!token) return <div>Not logged in</div>;

  const user = decodeToken(token);

  return (
    <div>
      <h2>Hello {user.name} 👋</h2>

      <ul>
        <li>Upload files</li>
        <li>See your files</li>

        {user.role === "admin" && (
          <li>See all files (admin)</li>
        )}
      </ul>
    </div>
  );
};

export default Dashboard;
