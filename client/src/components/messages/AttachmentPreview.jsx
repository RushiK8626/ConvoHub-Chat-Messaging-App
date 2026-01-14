import React, { useEffect, useState, useCallback } from "react";
import { getFileLogo, isImageFile, formatFileSize } from "../../utils/file";
import "./AttachmentPreview.css";

const AttachmentPreview = ({ attachment, isUploading = false, uploadProgress = 0 }) => {
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [blobSize, setBlobSize] = useState(null);
  const [mimeType, setMimeType] = useState(null);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const base = (process.env.REACT_APP_API_URL || "http://localhost:3001").replace(/\/+$/, "");

  // Helper function to extract filename from URL or path
  const getFilename = (fileUrl) => {
    if (!fileUrl) return "file";
    if (fileUrl.startsWith("http")) return fileUrl.split("/").pop();
    if (fileUrl.includes("/uploads/")) return fileUrl.split("/uploads/").pop();
    return fileUrl.split("/").pop();
  };

  // Build fetch URL - wrapped in useCallback to avoid recreating on every render
  const buildFetchUrl = useCallback((fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith("http")) return fileUrl;
    if (fileUrl.startsWith("/")) return `${base}${fileUrl}`;
    if (fileUrl.includes("/uploads/"))
      return `${base}/${fileUrl}`
        .replace("//", "/")
        .replace("http:/", "http://");
    const filename = getFilename(fileUrl);
    return `${base}/uploads/${filename}`;
  }, [base]);

  // Get display filename - prefer original_filename from server
  const displayFilename =
    attachment.original_filename ||
    attachment.originalname ||
    attachment.file_name ||
    attachment.fileName ||
    attachment.name ||
    getFilename(
      attachment.file_url ||
        attachment.fileUrl ||
        attachment.url ||
        attachment.path
    ) ||
    "file";

  useEffect(() => {
    let mounted = true;
    let localObjectUrl = null;

    const fetchFile = async () => {
      setLoading(true);
      let token = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");
      const url = buildFetchUrl(
        attachment.file_url ||
          attachment.fileUrl ||
          attachment.url ||
          attachment.path
      );
      if (!url) {
        setLoading(false);
        return;
      }
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        let res = await fetch(url, { headers });

        if (res.status === 401 && refreshToken) {
          try {
            const rRes = await fetch(`${base}/api/auth/refresh-token`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken: String(refreshToken) }),
            });
            if (rRes.ok) {
              const rData = await rRes.json();
              token = rData.accessToken;
              localStorage.setItem("accessToken", token);
              res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
              });
            }
          } catch (refreshErr) {
            console.error(
              "Token refresh failed while fetching attachment:",
              refreshErr
            );
          }
        }

        if (!res.ok) throw new Error("Failed to fetch attachment");
        const blob = await res.blob();
        localObjectUrl = URL.createObjectURL(blob);
        if (!mounted) {
          URL.revokeObjectURL(localObjectUrl);
          return;
        }
        setBlobUrl(localObjectUrl);
        setBlobSize(blob.size);
        setMimeType(
          blob.type || attachment.mime_type || attachment.type || null
        );
      } catch (err) {
        console.error("Error fetching attachment:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchFile();

    return () => {
      mounted = false;
      if (localObjectUrl)
        try {
          URL.revokeObjectURL(localObjectUrl);
        } catch (e) {}
    };
  }, [attachment, base, buildFetchUrl]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = displayFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleOpen = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (blobUrl) {
      window.open(blobUrl, "_blank");
      return;
    }
    const url = buildFetchUrl(
      attachment.file_url ||
        attachment.fileUrl ||
        attachment.url ||
        attachment.path
    );
    if (!url) return;
    let token = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      let res = await fetch(url, { headers });
      if (res.status === 401 && refreshToken) {
        const rRes = await fetch(`${base}/api/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: String(refreshToken) }),
        });
        if (rRes.ok) {
          const rData = await rRes.json();
          token = rData.accessToken;
          localStorage.setItem("accessToken", token);
          res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
      if (!res.ok) throw new Error("Failed to open attachment");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank");
      setTimeout(() => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (e) {}
      }, 60 * 1000);
    } catch (err) {
      console.error("Error opening attachment:", err);
      window.open(
        buildFetchUrl(
          attachment.file_url ||
            attachment.fileUrl ||
            attachment.url ||
            attachment.path
        ),
        "_blank"
      );
    }
  };

  if (loading)
    return (
      <div className="attachment-preview loading">Loading attachment…</div>
    );

  // Show uploading state with progress bar
  if (isUploading) {
    const fileSize = attachment.file_size || attachment.fileSize || 0;
    return (
      <div className="attachment-preview uploading">
        <div className="attachment-logo-wrapper">
          <img
            src={getFileLogo(displayFilename, attachment.file_type || attachment.fileType)}
            alt={displayFilename}
            className="attachment-logo"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
        <div className="attachment-info">
          <div className="attachment-name">{displayFilename}</div>
          <div className="attachment-size">{formatFileSize(fileSize)}</div>
          <div className="attachment-upload-progress">
            <div className="upload-progress-bar-container">
              <div 
                className="upload-progress-bar-fill" 
                style={{ width: `${Math.min(100, uploadProgress)}%` }}
              />
            </div>
            <span className="upload-progress-text">
              {uploadProgress < 100 
                ? `Uploading... ${Math.round(uploadProgress)}%`
                : 'Processing...'
              }
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!blobUrl)
    return (
      <div className="attachment-preview error">
        <div className="attachment-logo-wrapper">
          <img
            src={getFileLogo(displayFilename, null)}
            alt={displayFilename}
            className="attachment-logo"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
        <div className="attachment-info">
          <div className="attachment-name">{displayFilename}</div>
          <div className="attachment-size">
            {attachment.file_size || attachment.fileSize 
              ? formatFileSize(attachment.file_size || attachment.fileSize)
              : "Unknown size"
            }
          </div>
          <div className="attachment-actions">
            <button
              onClick={handleOpen}
              style={{ color: "var(--primary-color, #1976d2)" }}
            >
              Open
            </button>
            <button
              onClick={handleDownload}
              style={{ color: "var(--primary-color, #1976d2)" }}
            >
              Download
            </button>
          </div>
        </div>
      </div>
    );

  if (isImageFile(displayFilename, mimeType))
    return (
      <div className="attachment-preview image">
        <img
          src={blobUrl}
          alt={displayFilename}
          className="attachment-thumb"
          onClick={() => setShowFullscreen(true)}
        />
        <div className="attachment-info">
          <div className="attachment-name">{displayFilename}</div>
          <div className="attachment-actions">
            <button
              onClick={() => setShowFullscreen(true)}
              style={{ color: "var(--primary-color, #1976d2)" }}
            >
              View
            </button>
            <button
              onClick={handleDownload}
              style={{ color: "var(--primary-color, #1976d2)" }}
            >
              Download
            </button>
            <button
              onClick={handleOpen}
              style={{ color: "var(--primary-color, #1976d2)" }}
            >
              Open
            </button>
          </div>
        </div>
        {showFullscreen && (
          <div
            className="attachment-fullscreen"
            onClick={() => setShowFullscreen(false)}
          >
            <img src={blobUrl} alt={displayFilename} />
            <button
              className="close-fullscreen"
              onClick={() => setShowFullscreen(false)}
            >
              ×
            </button>
          </div>
        )}
      </div>
    );

  return (
    <div className="attachment-preview file">
      <div className="attachment-logo-wrapper">
        <img
          src={getFileLogo(displayFilename, mimeType)}
          alt={displayFilename}
          className="attachment-logo"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </div>
      <div className="attachment-info">
        <div className="attachment-name">{displayFilename}</div>
        <div className="attachment-size">
          {blobSize ? formatFileSize(blobSize) : "Unknown"}
        </div>
        <div className="attachment-actions">
          <button
            onClick={handleOpen}
            style={{ color: "var(--primary-color, #1976d2)" }}
          >
            Open
          </button>
          <button
            onClick={handleDownload}
            style={{ color: "var(--primary-color, #1976d2)" }}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttachmentPreview;
