import React, { useState, useEffect } from "react";
import { X, Search, Upload, Image as ImageIcon } from "lucide-react";
import "./CreateGroupModal.css";

const CreateGroupModal = ({
  isOpen,
  onClose,
  onGroupCreated,
  currentUserId,
}) => {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [searchMembers, setSearchMembers] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [allChatUsers, setAllChatUsers] = useState([]);

  // Fetch all users from chats (to populate members list)
  useEffect(() => {
    if (!isOpen) return;

    const fetchChatUsers = async () => {
      try {
        const API_URL = (
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        ).replace(/\/+$/, "");
        const token = localStorage.getItem("accessToken");
        const res = await fetch(
          `${API_URL}/api/chats/user/${currentUserId}/preview`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.ok) {
          const data = await res.json();

          // Extract unique users from all chats
          const usersMap = {};

          data.chats?.forEach((chat) => {
            if (chat.chat_type === "private" && Array.isArray(chat.members)) {
              chat.members.forEach((member) => {
                if (
                  member.user_id !== currentUserId &&
                  !usersMap[member.user_id]
                ) {
                  usersMap[member.user_id] = {
                    user_id: member.user_id,
                    username:
                      member.user?.username || member.username || "Unknown",
                    full_name:
                      member.user?.full_name || member.full_name || "Unknown",
                    profile_pic:
                      member.user?.profile_pic || member.profile_pic || null,
                  };

                  // Convert profile pic to full URL if needed
                  if (
                    usersMap[member.user_id].profile_pic &&
                    !usersMap[member.user_id].profile_pic.startsWith("http")
                  ) {
                    const filename = usersMap[member.user_id].profile_pic
                      .split("/uploads/")
                      .pop();
                    usersMap[
                      member.user_id
                    ].profile_pic = `${API_URL}/uploads/profiles/${filename}`;
                  }
                }
              });
            }
          });

          setAllChatUsers(Object.values(usersMap));
        }
      } catch (err) {
        console.error("Error fetching chat users:", err);
      }
    };

    fetchChatUsers();
  }, [isOpen, currentUserId]);

  // Search members
  useEffect(() => {
    if (!searchMembers.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = allChatUsers.filter((user) => {
      const query = searchMembers.toLowerCase();
      return (
        (user.username.toLowerCase().includes(query) ||
          user.full_name.toLowerCase().includes(query)) &&
        !selectedMembers.some((m) => m.user_id === user.user_id)
      );
    });

    setSearchResults(filtered);
  }, [searchMembers, allChatUsers, selectedMembers]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMember = (user) => {
    if (!selectedMembers.some((m) => m.user_id === user.user_id)) {
      setSelectedMembers([...selectedMembers, user]);
      setSearchMembers("");
    }
  };

  const handleRemoveMember = (userId) => {
    setSelectedMembers(selectedMembers.filter((m) => m.user_id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    try {
      setCreating(true);
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");
      let token = localStorage.getItem("accessToken");

      // Prepare member IDs (include current user as admin)
      const memberIds = [
        currentUserId,
        ...selectedMembers.map((m) => m.user_id),
      ];

      // Validate member_ids is not empty
      if (memberIds.length === 0) {
        alert("Please select at least one member");
        setCreating(false);
        return;
      }

      // Prepare form data for multipart request
      const formData = new FormData();
      formData.append("chat_type", "group");
      formData.append("chat_name", groupName);
      formData.append("admin_id", currentUserId);
      formData.append("member_ids", JSON.stringify(memberIds));

      if (groupDescription.trim()) {
        formData.append("description", groupDescription);
      }

      if (selectedImage) {
        formData.append("group_image", selectedImage);
      }

      let createRes = await fetch(`${API_URL}/api/chats/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      // If unauthorized, try to refresh token
      if (createRes.status === 401) {
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

              // Retry creating group with new token
              createRes = await fetch(`${API_URL}/api/chats/`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
              });
            }
          } catch (refreshErr) {
            console.error("Token refresh failed:", refreshErr);
          }
        }
      }

      if (!createRes.ok) {
        const errorText = await createRes.text();
        console.error("Create group error:", errorText);
        throw new Error("Failed to create group");
      }

      const chatData = await createRes.json();
      const newChatId = chatData.chat?.chat_id;

      if (newChatId) {
        onGroupCreated(newChatId);
        // Reset form
        setGroupName("");
        setGroupDescription("");
        setSelectedImage(null);
        setImagePreview(null);
        setSelectedMembers([]);
        setSearchMembers("");
      } else {
        alert("Error creating group. Please try again.");
      }
    } catch (err) {
      console.error("Error creating group:", err);
      alert("Failed to create group. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Group</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-content">
          {/* Group Image */}
          <div className="image-upload-section">
            <div className="image-upload-container">
              {imagePreview ? (
                <img src={imagePreview} alt="group" className="image-preview" />
              ) : (
                <div className="image-placeholder">
                  <ImageIcon size={32} />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="image-input"
                id="group-image-input"
              />
              <label htmlFor="group-image-input" className="image-upload-label">
                <Upload size={16} />
              </label>
            </div>
          </div>

          {/* Group Details */}
          <div className="input-group">
            <label htmlFor="group-name">Group Name</label>
            <input
              id="group-name"
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="input-field"
              maxLength={50}
            />
            <span className="char-count">{groupName.length}/50</span>
          </div>

          <div className="input-group">
            <label htmlFor="group-description">Description (Optional)</label>
            <textarea
              id="group-description"
              placeholder="Enter group description"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              className="input-field textarea-field"
              maxLength={200}
              rows={3}
            />
            <span className="char-count">{groupDescription.length}/200</span>
          </div>

          {/* Members Selection */}
          <div className="members-section">
            <label>Members</label>
            <div className="search-container">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                placeholder="Search and add members..."
                value={searchMembers}
                onChange={(e) => setSearchMembers(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div className="selected-members">
                {selectedMembers.map((member) => (
                  <div key={member.user_id} className="member-chip">
                    <span>{member.full_name || member.username}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="remove-member-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Member Search Results */}
            {searchMembers && (
              <div className="search-results">
                {searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <div
                      key={user.user_id}
                      className="member-item"
                      onClick={() => handleAddMember(user)}
                    >
                      <div className="member-avatar">
                        {user.profile_pic ? (
                          <img src={user.profile_pic} alt="profile" />
                        ) : (
                          <span className="avatar-text">
                            {user.full_name
                              ? user.full_name.split(" ").length >= 2
                                ? (
                                    user.full_name.split(" ")[0][0] +
                                    user.full_name.split(" ")[
                                      user.full_name.split(" ").length - 1
                                    ][0]
                                  ).toUpperCase()
                                : user.full_name.substring(0, 2).toUpperCase()
                              : user.username.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="member-info">
                        <h4>{user.full_name || user.username}</h4>
                        <p>@{user.username}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-results">No users found</p>
                )}
              </div>
            )}

            {!searchMembers && selectedMembers.length === 0 && (
              <p className="helper-text">
                Search to add members (optional - you can create a group alone)
              </p>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={creating}>
            Cancel
          </button>
          <button
            className="btn-create"
            onClick={handleCreateGroup}
            disabled={creating || !groupName.trim()}
          >
            {creating ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
