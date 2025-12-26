import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

interface UserPayload {
  email: string;
  name: string;
  role: string;
  exp: number;
}

function decodeToken(token: string): UserPayload {
  return jwtDecode<UserPayload>(token);
}

interface File {
  id: string;
  name: string;
  owner: string;
  created_at: string;
  size: number;
}

const Dashboard = () => {
  const token = localStorage.getItem("token");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"my-files" | "all-files">("my-files");

  if (!token) return <div>Not logged in</div>;

  const user = decodeToken(token);
  const isAdmin = user.role === "admin";

const fetchMyFiles = async () => {
  setLoading(true);
  setError("");
  try {
    const res = await fetch("http://localhost:8000/api/files", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setError(`Error: ${res.status}`);
      setFiles([]);
      return;
    }
    const data = await res.json();
    setFiles(Array.isArray(data) ? data : []);
  } catch (err) {
    setError("Failed to fetch files");
    setFiles([]);
  }
  setLoading(false);
};

  const fetchAllFiles = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:8000/api/files/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      setError("Failed to fetch files");
    }
    setLoading(false);
  };

  const handleTabChange = (tab: "my-files" | "all-files") => {
    setActiveTab(tab);
    if (tab === "my-files") {
      fetchMyFiles();
    } else {
      fetchAllFiles();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setError("");
    try {
      await fetch("http://localhost:8000/api/files/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      fetchMyFiles();
    } catch (err) {
      setError("Failed to upload file");
    }
    setLoading(false);
  };

  const handleDelete = async (fileId: string) => {
    setLoading(true);
    setError("");
    try {
      await fetch(`http://localhost:8000/api/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (activeTab === "my-files") {
        fetchMyFiles();
      } else {
        fetchAllFiles();
      }
    } catch (err) {
      setError("Failed to delete file");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMyFiles();
  }, []);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1>Hello {user.name} 👋</h1>
        <p style={{ color: "#666" }}>Email: {user.email}</p>
        {isAdmin && <p style={{ color: "#4285F4", fontWeight: "bold" }}>Admin User</p>}
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "inline-block", marginRight: "10px" }}>
          <input
            type="file"
            onChange={handleUpload}
            style={{ cursor: "pointer" }}
          />
        </label>
        <button
          onClick={() => document.querySelector('input[type="file"]')?.click()}
          style={{
            padding: "8px 16px",
            backgroundColor: "#4285F4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Upload File
        </button>
      </div>

      {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => handleTabChange("my-files")}
          style={{
            padding: "10px 15px",
            backgroundColor: activeTab === "my-files" ? "#4285F4" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "10px",
          }}
        >
          My Files
        </button>
        {isAdmin && (
          <button
            onClick={() => handleTabChange("all-files")}
            style={{
              padding: "10px 15px",
              backgroundColor: activeTab === "all-files" ? "#4285F4" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            All Files (Admin)
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : files.length === 0 ? (
        <p>No files found</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                Name
              </th>
              <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                Owner
              </th>
              <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                Size
              </th>
              <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                Created
              </th>
              <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "10px" }}>{file.name}</td>
                <td style={{ padding: "10px" }}>{file.owner}</td>
                <td style={{ padding: "10px" }}>{(file.size / 1024).toFixed(2)} KB</td>
                <td style={{ padding: "10px" }}>
                  {new Date(file.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "10px" }}>
                  <button
                    onClick={() => handleDelete(file.id)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Dashboard;