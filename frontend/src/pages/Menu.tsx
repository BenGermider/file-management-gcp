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

interface FileResponse {
  id: string;
  name: string;
  type: string;
  size: number;
  created_at: string;
  owner?: string;
}

const Dashboard = () => {
  const token = localStorage.getItem("token");
  const [files, setFiles] = useState<FileResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Search filters
  const [filenameSearch, setFilenameSearch] = useState("");
  const [textSearch, setTextSearch] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "size">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewingAllFiles, setViewingAllFiles] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  if (!token) return <div>Not logged in</div>;

  const user = decodeToken(token);

  const fetchFiles = async (fnSearch = "", txtSearch = "", viewAll = false) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();

      // Use text search for content search, filename search for file names
      if (txtSearch) {
        params.append("search", txtSearch);
      } else if (fnSearch) {
        params.append("search", fnSearch);
      }

      if (fileTypeFilter) params.append("file_type", fileTypeFilter);

      const endpoint = viewAll ? "/api/admin/files" : "/api/files";
      const res = await fetch(`http://localhost:8000${endpoint}?${params.toString()}`, {
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
      console.log(err);
      setError("Failed to fetch files");
      setFiles([]);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (selectedFiles.length > 10) {
      setError("Maximum 10 files per upload");
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("files", selectedFiles[i]);
    }

    setUploading(true);
    setError("");
    setUploadProgress(0);

    try {
      const res = await fetch("http://localhost:8000/api/files/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Upload failed");
        return;
      }

      setUploadProgress(100);
      await fetchFiles(filenameSearch, textSearch);
      e.target.value = "";
    } catch (err) {
      console.log(err);
      setError("Failed to upload files");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`http://localhost:8000/api/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError("Failed to delete file");
        return;
      }

      await fetchFiles(filenameSearch, textSearch);
    } catch (err) {
      console.log(err);
      setError("Failed to delete file");
    } finally {
      setLoading(false);
    }
  };

const handleDownload = async (fileId: string, fileName: string) => {
  try {
    const res = await fetch(`http://localhost:8000/api/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      setError("Failed to download file");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.log(err);
    setError("Failed to download file");
  }
};

  const handleFilenameSearch = () => {
    setTextSearch("");
    fetchFiles(filenameSearch, "", viewingAllFiles);
  };

  const handleTextSearch = () => {
    setFilenameSearch("");
    fetchFiles("", textSearch, viewingAllFiles);
  };

  const handleToggleAllFiles = () => {
    const newViewAll = !viewingAllFiles;
    setViewingAllFiles(newViewAll);
    fetchFiles(filenameSearch, textSearch, newViewAll);
  };

  const getSortedFiles = () => {
    const sorted = [...files].sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === "desc" ? b.size - a.size : a.size - b.size;
      }
    });
    return sorted;
  };

  const getUniqueFileTypes = () => {
    const types = new Set(files.map((f) => f.type));
    return Array.from(types).sort();
  };

  const sortedFiles = getSortedFiles();

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Hello {user.name} 👋</h1>
          <p style={{ color: "#666" }}>Email: {user.email}</p>
          {user.role === "admin" && <p style={{ color: "#4285F4", fontWeight: "bold" }}>👑 Admin User</p>}
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: "10px 20px",
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "4px" }}>
        <label style={{ display: "block" }}>
          <input
            type="file"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: "none" }}
            id="file-input"
          />
          <button
            onClick={() => document.getElementById("file-input")?.click()}
            disabled={uploading}
            style={{
              padding: "10px 20px",
              backgroundColor: uploading ? "#ccc" : "#4285F4",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: uploading ? "not-allowed" : "pointer",
              fontSize: "16px",
            }}
          >
            {uploading ? "Uploading..." : "📁 Upload Files"}
          </button>
        </label>
        {uploading && (
          <div style={{ marginTop: "10px" }}>
            <div style={{ backgroundColor: "#ddd", borderRadius: "4px", height: "8px", width: "200px" }}>
              <div
                style={{
                  backgroundColor: "#4285F4",
                  height: "100%",
                  width: `${uploadProgress}%`,
                  borderRadius: "4px",
                  transition: "width 0.3s",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Search Controls */}
      <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f0f0f0", borderRadius: "4px" }}>
        <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "white", borderRadius: "4px", border: "1px solid #ddd" }}>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px" }}>🔍 Search by Filename:</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              placeholder="Search files by name..."
              value={filenameSearch}
              onChange={(e) => setFilenameSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleFilenameSearch()}
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                flex: 1,
              }}
            />
            <button
              onClick={handleFilenameSearch}
              style={{
                padding: "8px 16px",
                backgroundColor: "#4285F4",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Search
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "white", borderRadius: "4px", border: "1px solid #ddd" }}>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px" }}>📄 Search by Content:</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              placeholder="Search inside files (text, PDF, JSON)..."
              value={textSearch}
              onChange={(e) => setTextSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleTextSearch()}
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                flex: 1,
              }}
            />
            <button
              onClick={handleTextSearch}
              style={{
                padding: "8px 16px",
                backgroundColor: "#ff9800",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Search
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #ddd",
            }}
          >
            <option value="">All File Types</option>
            {getUniqueFileTypes().map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "size")}
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #ddd",
            }}
          >
            <option value="date">Sort by Date</option>
            <option value="size">Sort by Size</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            style={{
              padding: "8px 12px",
              backgroundColor: "#666",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {sortOrder === "desc" ? "↓" : "↑"}
          </button>

          {user.role === "admin" && (
            <button
              onClick={handleToggleAllFiles}
              style={{
                padding: "8px 16px",
                backgroundColor: viewingAllFiles ? "#ff9800" : "#4285F4",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                marginLeft: "auto",
              }}
            >
              {viewingAllFiles ? "👥 Hide Others" : "👥 Show All Files"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ color: "#d32f2f", marginBottom: "10px", padding: "10px", backgroundColor: "#ffebee", borderRadius: "4px" }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: "center", color: "#666" }}>Loading files...</p>
      ) : sortedFiles.length === 0 ? (
        <p style={{ textAlign: "center", color: "#666" }}>No files found.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Name</th>
              {viewingAllFiles && <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Owner</th>}
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Type</th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Size</th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Uploaded</th>
              {!viewingAllFiles && <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #ddd" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedFiles.map((file) => (
              <tr key={file.id} style={{ borderBottom: "1px solid #ddd", backgroundColor: "white" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9f9f9")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}>
                <td style={{ padding: "12px" }}>{file.name}</td>
                {viewingAllFiles && <td style={{ padding: "12px", fontSize: "14px", color: "#666" }}>{file.owner}</td>}
                <td style={{ padding: "12px", fontSize: "14px", color: "#666" }}>{file.type}</td>
                <td style={{ padding: "12px", fontSize: "14px", color: "#666" }}>{(file.size / 1024).toFixed(2)} KB</td>
                <td style={{ padding: "12px", fontSize: "14px", color: "#666" }}>{new Date(file.created_at).toLocaleDateString()}</td>
                {!viewingAllFiles && (
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <button
                      onClick={() => handleDownload(file.id, file.name)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#2196F3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        marginRight: "8px",
                      }}
                    >
                      ⬇️
                    </button>
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
                      🗑️
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Dashboard;