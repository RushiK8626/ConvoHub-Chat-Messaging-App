import React, { useEffect, useState } from "react";
import "./AttachmentPreview.css";

const AttachmentPreview = ({ attachment }) => {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mimeType, setMimeType] = useState(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [error, setError] = useState(null);

  const base = (process.env.REACT_APP_API_URL || "http://localhost:3001").replace(/\/+$/, "");

  // Extract filename from various possible attachment properties
  const getFilename = () => {
    const fileUrl =
      attachment.file_url ||
      attachment.fileUrl ||
      attachment.url ||
      attachment.path ||
      attachment.file_name ||
      attachment.fileName ||
      attachment.name;
    if (!fileUrl) return "file";
    if (fileUrl.startsWith("http")) return fileUrl.split("/").pop();
    if (fileUrl.includes("/uploads/")) return fileUrl.split("/uploads/").pop();
    return fileUrl.split("/").pop();
  };

  const filename = getFilename();

  // Check if attachment is an image based on mime type or extension
  const isImage = () => {
    if (mimeType) return mimeType.startsWith("image/");
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename);
  };

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    const loadAttachment = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("accessToken");
        if (!token) {
          setError("No authentication token available");
          setLoading(false);
          return;
        }

        // Construct the proper fetch URL
        const fetchUrl = `${base}/uploads/${encodeURIComponent(filename)}`;

        const res = await fetch(fetchUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(
            `Failed to fetch attachment: ${res.status} ${res.statusText}`
          );
        }

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);

        if (!cancelled) {
          setSrc(objectUrl);
          setMimeType(
            blob.type || attachment.mime_type || attachment.type || null
          );
        }
      } catch (err) {
        console.error("Attachment load failed:", err);
        if (!cancelled) {
          setError(err.message || "Failed to load attachment");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAttachment();

    return () => {
      cancelled = true;
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (e) {
          console.error("Error revoking object URL:", e);
        }
      }
    };
  }, [filename, attachment.mime_type, attachment.type, base]);

  const downloadAttachment = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        alert("No authentication token available");
        return;
      }

      const fetchUrl = `${base}/uploads/${encodeURIComponent(filename)}`;

      const res = await fetch(fetchUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error("❌ Failed to download attachment");
        alert("Failed to download attachment");
        return;
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let downloadName = filename;

      if (contentDisposition) {
        const match = contentDisposition.match(
          /filename\*?=(?:UTF-8'')?\"?([^;"\\n]+)/i
        );
        if (match) {
          downloadName = decodeURIComponent(match[1]);
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Clean up after 10 seconds
      setTimeout(() => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (e) {
          console.error("Error revoking download URL:", e);
        }
      }, 10000);
    } catch (err) {
      console.error("❌ Download error:", err);
      alert("Error downloading attachment");
    }
  };

  const openAttachment = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        alert("No authentication token available");
        return;
      }

      const fetchUrl = `${base}/uploads/${encodeURIComponent(filename)}`;

      const res = await fetch(fetchUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to open attachment");
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank");

      // Clean up after 60 seconds
      setTimeout(() => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (e) {
          console.error("Error revoking open URL:", e);
        }
      }, 60 * 1000);
    } catch (err) {
      console.error("❌ Open attachment error:", err);
      alert("Failed to open attachment");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="attachment-preview loading">
        <div className="attachment-icon">⏳</div>
        <div>Loading attachment…</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="attachment-preview error">
        <div className="attachment-icon">❌</div>
        <div className="attachment-info">
          <div className="attachment-name">{filename}</div>
          <div style={{ fontSize: "12px", color: "#a00" }}>{error}</div>
        </div>
      </div>
    );
  }

  // No blob loaded yet but no error (shouldn't happen, but safety check)
  if (!src) {
    return (
      <div className="attachment-preview error">
        <div className="attachment-icon">📎</div>
        <div className="attachment-info">
          <div className="attachment-name">{filename}</div>
        </div>
      </div>
    );
  }

  // Image preview
  if (isImage()) {
    return (
      <>
        <div
          className="attachment-preview image"
          onClick={() => setShowFullscreen(true)}
          style={{ cursor: "pointer" }}
        >
          <img src={src} alt={filename} className="attachment-thumb" />
        </div>
        {showFullscreen && (
          <div
            className="attachment-fullscreen"
            onClick={() => setShowFullscreen(false)}
          >
            <div className="fullscreen-content">
              <img src={src} alt={filename} className="fullscreen-image" />
              <button
                className="close-fullscreen"
                onClick={() => setShowFullscreen(false)}
              >
                ×
              </button>
              <button
                className="download-fullscreen"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadAttachment();
                }}
                title="Download"
              >
                💾
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // File preview (non-image)
  return (
    <div
      className="attachment-preview file"
      onClick={openAttachment}
      style={{ cursor: "pointer" }}
    >
      <div className="attachment-icon">📎</div>
      <div className="attachment-info">
        <div className="attachment-name">{filename}</div>
      </div>
    </div>
  );
};

export default AttachmentPreview;
