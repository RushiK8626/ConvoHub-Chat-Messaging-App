import React, { useState, useEffect } from "react";
import { X, Upload, Image as ImageIcon, Loader } from "lucide-react";
import "./UpdateGroupInfoModal.css";

const UpdateGroupInfoModal = ({
  isOpen,
  onClose,
  chatId,
  currentChatInfo,
  onUpdateSuccess,
}) => {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  // Initialize form with current chat info
  useEffect(() => {
    if (isOpen && currentChatInfo) {
      setGroupName(currentChatInfo.name || "");
      setGroupDescription(currentChatInfo.description || "");
      setCurrentImage(currentChatInfo.chat_image || null);
      setSelectedImage(null);
      setImagePreview(null);
      setError("");
    }
  }, [isOpen, currentChatInfo]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setError("Image size must be less than 10MB");
        return;
      }

      setSelectedImage(file);
      setError("");

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleUpdateGroup = async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }

    try {
      setUpdating(true);
      setError("");
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");
      let token = localStorage.getItem("accessToken");

      // Prepare form data
      const formData = new FormData();
      formData.append("chat_name", groupName.trim());
      formData.append("description", groupDescription.trim());

      if (selectedImage) {
        formData.append("group_image", selectedImage);
      }

      let updateRes = await fetch(`${API_URL}/api/chats/${chatId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      // If unauthorized, try to refresh token
      if (updateRes.status === 401) {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          try {
            const refreshRes = await fetch(
              `${API_URL}/api/auth/refresh-token`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: String(refreshToken) }),
              }
            );
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              localStorage.setItem("accessToken", refreshData.accessToken);
              token = refreshData.accessToken;

              // Retry with new token
              updateRes = await fetch(`${API_URL}/api/chats/${chatId}`, {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
              });
            }
          } catch (refreshErr) {
            console.error("Token refresh failed:", refreshErr);
            setError("Session expired. Please try again.");
            setUpdating(false);
            return;
          }
        }
      }

      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => ({}));
        console.error("Update group error:", {
          status: updateRes.status,
          error: errorData,
        });
        throw new Error(
          errorData.message ||
            `Failed to update group (Status: ${updateRes.status})`
        );
      }

      const updatedData = await updateRes.json();

      // Call success callback with updated chat info
      if (onUpdateSuccess) {
        onUpdateSuccess(updatedData.chat);
      }

      onClose();
    } catch (err) {
      console.error("Error updating group:", err);
      setError(err.message || "Failed to update group");
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="update-group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Update Group Info</h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            disabled={updating}
          >
            ×
          </button>
        </div>

        <div className="modal-content">
          {/* Image Upload Section */}
          <div className="image-upload-section">
            <div className="image-upload-container">
              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="Group preview" />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={handleRemoveImage}
                    disabled={updating}
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              ) : currentImage ? (
                <div className="image-preview">
                  <img src={currentImage} alt="Group current" />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={handleRemoveImage}
                    disabled={updating}
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="image-placeholder">
                  <ImageIcon size={40} />
                </div>
              )}
              <label className="image-upload-label" title="Upload group image">
                <Upload size={20} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={updating}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}

          {/* Group Name Input */}
          <div className="form-group">
            <label htmlFor="groupName">Group Name</label>
            <input
              type="text"
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              disabled={updating}
              className="form-input"
            />
          </div>

          {/* Group Description Input */}
          <div className="form-group">
            <label htmlFor="groupDescription">Description (Optional)</label>
            <textarea
              id="groupDescription"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Enter group description"
              disabled={updating}
              className="form-textarea"
              rows="4"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={updating}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUpdateGroup}
            disabled={updating || !groupName.trim()}
          >
            {updating ? (
              <>
                <Loader
                  size={16}
                  style={{
                    animation: "spin 1s linear infinite",
                    marginRight: "8px",
                  }}
                />
                Updating...
              </>
            ) : (
              "Update"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateGroupInfoModal;
