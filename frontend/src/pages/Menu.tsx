import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

interface UserPayload {
  user_id: string;
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

  const [filenameSearch, setFilenameSearch] = useState("");
  const [textSearch, setTextSearch] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "size">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewingAllFiles, setViewingAllFiles] = useState(false);

  const fetchFiles = async (fnSearch = "", txtSearch = "", viewAll = false) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (txtSearch) {
        params.append("search", txtSearch);
      } else if (fnSearch) {
        params.append("search", fnSearch);
      }
      if (fileTypeFilter) params.append("file_type", fileTypeFilter);

      const endpoint = viewAll ? "/api/admin/files" : "/api/files";
      const host = import.meta.env.VITE_API_URL;
      const res = await fetch(`${host}/${endpoint}?${params.toString()}`, {
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

  useEffect(() => {
    fetchFiles();
  }, []);

  if (!token) return <div>Not logged in</div>;

  const user = decodeToken(token);

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
      const host = import.meta.env.VITE_API_URL;
      const res = await fetch(`${host}/api/files/upload`, {
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
      const host = import.meta.env.VITE_API_URL;
      const res = await fetch(`${host}/api/files/${fileId}`, {
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
      const host = import.meta.env.VITE_API_URL;
      const res = await fetch(`${host}/api/files/${fileId}/download`, {
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

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('video')) return '🎥';
    if (type.includes('audio')) return '🎵';
    if (type.includes('zip') || type.includes('compressed')) return '📦';
    if (type.includes('text')) return '📝';
    if (type.includes('json')) return '📋';
    return '📁';
  };

  const sortedFiles = getSortedFiles();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '20px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              📁
            </div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '700',
                color: '#1a202c'
              }}>
                Hello, {user.name.split(' ')[0]} 👋
              </h1>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '14px',
                color: '#718096'
              }}>
                {user.email} {user.role === "admin" && <span style={{ color: '#667eea', fontWeight: '600' }}>• Admin</span>}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '12px 24px',
              background: 'white',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              color: '#1a202c',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ef4444';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#1a202c';
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px'
      }}>
        {/* Upload Section */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '30px',
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
          color: 'white'
        }}>
          <h2 style={{
            margin: '0 0 10px 0',
            fontSize: '28px',
            fontWeight: '700'
          }}>
            Upload Files
          </h2>
          <p style={{
            margin: '0 0 25px 0',
            opacity: 0.9,
            fontSize: '15px'
          }}>
            Drag and drop or click to upload up to 10 files
          </p>

          <label style={{ display: 'block' }}>
            <input
              type="file"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: 'none' }}
              id="file-input"
            />
            <button
              onClick={() => document.getElementById("file-input")?.click()}
              disabled={uploading}
              style={{
                padding: '16px 32px',
                background: 'white',
                color: '#667eea',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.7 : 1,
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => !uploading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => !uploading && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {uploading ? '⏳ Uploading...' : '📤 Choose Files'}
            </button>
          </label>

          {uploading && (
            <div style={{ marginTop: '20px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                height: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: 'white',
                  height: '100%',
                  width: `${uploadProgress}%`,
                  borderRadius: '10px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#64748b',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                🔍 Search by Filename
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter filename..."
                  value={filenameSearch}
                  onChange={(e) => setFilenameSearch(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleFilenameSearch()}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
                <button
                  onClick={handleFilenameSearch}
                  style={{
                    padding: '12px 20px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#5568d3'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
                >
                  Search
                </button>
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#64748b',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📄 Search by Content
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Search inside files..."
                  value={textSearch}
                  onChange={(e) => setTextSearch(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleTextSearch()}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#f59e0b'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
                <button
                  onClick={handleTextSearch}
                  style={{
                    padding: '12px 20px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#d97706'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f59e0b'}
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '15px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '150px'
              }}
            >
              <option value="">All File Types</option>
              {getUniqueFileTypes().map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "date" | "size")}
              style={{
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="date">Sort by Date</option>
              <option value="size">Sort by Size</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              style={{
                padding: '12px 16px',
                background: '#64748b',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '18px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#475569'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#64748b'}
            >
              {sortOrder === "desc" ? "↓" : "↑"}
            </button>

            {user.role === "admin" && (
              <button
                onClick={handleToggleAllFiles}
                style={{
                  padding: '12px 24px',
                  background: viewingAllFiles ? '#f59e0b' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {viewingAllFiles ? "👤 My Files" : "👥 All Files"}
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '2px solid #fecaca',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            color: '#991b1b',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Files Grid */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#64748b',
            fontSize: '16px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #e2e8f0',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 1s linear infinite'
            }} />
            Loading files...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : sortedFiles.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>📂</div>
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1a202c'
            }}>
              No files found
            </h3>
            <p style={{
              margin: 0,
              color: '#718096',
              fontSize: '15px'
            }}>
              Upload some files to get started
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {sortedFiles.map((file) => (
              <div
                key={file.id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  border: '2px solid transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.borderColor = '#667eea';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <div style={{
                  fontSize: '48px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  {getFileIcon(file.type)}
                </div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1a202c',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }} title={file.name}>
                  {file.name}
                </h3>
                {viewingAllFiles && file.owner && (
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '13px',
                    color: '#64748b'
                  }}>
                    👤 {file.owner}
                  </p>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#64748b'
                }}>
                  <span>{(file.size / 1024).toFixed(1)} KB</span>
                  <span>{new Date(file.created_at).toLocaleDateString()}</span>
                </div>
                {!viewingAllFiles && (
                  <div style={{
                    display: 'flex',
                    gap: '10px'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file.id, file.name);
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#5568d3'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
                    >
                      ⬇️ Download
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.id);
                      }}
                      style={{
                        padding: '10px 16px',
                        background: '#fee2e2',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#ef4444';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fee2e2';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;