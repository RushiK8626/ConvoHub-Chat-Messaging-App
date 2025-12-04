import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Camera, Edit2, Save } from "lucide-react";
import BottomTabBar from "../components/BottomTabBar";
import PageHeader from "../components/PageHeader";
import ToastContainer from "../components/ToastContainer";
import { useToast } from "../hooks/useToast";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEmbedded = location.state?.isEmbedded || false;
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fileInputRef = React.useRef(null);
  const { toasts, showSuccess, showError, removeToast } = useToast();

  // Get userId from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.user_id;

  const [profileData, setProfileData] = useState({
    fullName: "",
    username: "",
    email: "",
    mobile: "",
    bio: "",
    avatar: "👨",
    profilePic: null,
  });

  const [editData, setEditData] = useState({ ...profileData });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        setError("User not logged in");
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(
          `${
            (process.env.REACT_APP_API_URL || "http://localhost:3001").replace(/\/+$/, "")
          }/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          const userData = data.user;

          // Process profile pic URL
          let profilePicUrl = null;
          if (userData.profile_pic) {
            const filename = userData.profile_pic.split("/uploads/").pop();
            profilePicUrl = `${
              (process.env.REACT_APP_API_URL || "http://localhost:3001").replace(/\/+$/, "")
            }/uploads/profiles/${filename}`;
          }

          const profile = {
            fullName: userData.full_name || "",
            username: userData.username || "",
            email: userData.email || user.email || "", // Try userData.email first, then localStorage
            mobile: userData.phone || user.phone || "", // Get phone from API response
            bio: userData.status_message || "",
            avatar: "👨",
            profilePic: profilePicUrl,
          };

          setProfileData(profile);
          setEditData(profile);
        } else {
          throw new Error("Failed to fetch profile");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, user.email, user.mobile]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Determine which fields have been changed
    const updatedFields = {};

    if (editData.fullName !== profileData.fullName) {
      updatedFields.full_name = editData.fullName;
    }

    if (editData.username !== profileData.username) {
      updatedFields.username = editData.username;
    }

    if (editData.bio !== profileData.bio) {
      updatedFields.status_message = editData.bio;
    }

    // If no fields were changed, just exit edit mode
    if (Object.keys(updatedFields).length === 0) {
      setIsEditing(false);
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${
          (process.env.REACT_APP_API_URL || "http://localhost:3001").replace(/\/+$/, "")
        }/api/users/${userId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedFields),
        }
      );

      if (response.ok) {
        const data = await response.json();
        showSuccess("Profile updated successfully!");

        // Update profile data with the new values
        setProfileData({ ...editData });
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        showError(errorData.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      showError("Failed to update profile. Please try again.");
    }
  };

  const handleCancel = () => {
    setEditData({ ...profileData });
    setIsEditing(false);
  };

  const handleChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!validImageTypes.includes(file.type)) {
      showError("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showError("Image size should not exceed 5MB");
      return;
    }

    // Upload the file
    try {
      const formData = new FormData();
      formData.append("profilePic", file); // ✅ Changed from 'profile_pic'

      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${
          (process.env.REACT_APP_API_URL || "http://localhost:3001").replace(/\/+$/, "")
        }/uploads/profile-pic`,
        {
          // ✅ Changed from '/upload/'
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );
      if (response.ok) {
        const data = await response.json();
        showSuccess("Profile picture updated successfully!");

        // Update profile picture URL
        if (data.profile_pic) {
          const filename = data.profile_pic.split("/uploads/").pop();
          const newProfilePicUrl = `${
            (process.env.REACT_APP_API_URL || "http://localhost:3001").replace(/\/+$/, "")
          }/uploads/profiles/${filename}`;

          setProfileData((prev) => ({
            ...prev,
            profilePic: newProfilePicUrl,
          }));
          setEditData((prev) => ({
            ...prev,
            profilePic: newProfilePicUrl,
          }));
        }
      } else {
        const errorData = await response.json();
        showError(errorData.message || "Failed to upload profile picture");
      }
    } catch (err) {
      console.error("Error uploading profile picture:", err);
      showError("Failed to upload profile picture. Please try again.");
    }
  };

  return (
    <div className="profile-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <PageHeader
        title="Profile"
        onBack={() => {
          if (isEmbedded) {
            navigate(-1); // Go back to previous page in split layout
          } else {
            navigate("/settings");
          }
        }}
        rightAction={
          !isEditing ? (
            <button className="edit-btn" onClick={handleEdit}>
              <Edit2 size={20} />
            </button>
          ) : (
            <button className="save-btn" onClick={handleSave}>
              <Save size={20} />
            </button>
          )
        }
      />

      {loading ? (
        <div className="profile-content">
          <p style={{ textAlign: "center", padding: "40px", color: "#999" }}>
            Loading profile...
          </p>
        </div>
      ) : error ? (
        <div className="profile-content">
          <p style={{ textAlign: "center", padding: "40px", color: "#ff4444" }}>
            {error}
          </p>
        </div>
      ) : (
        <div className="profile-content">
          <div className="profile-avatar-section">
            <div
              className="profile-avatar-large"
              style={{ position: "relative" }}
            >
              {profileData.profilePic ? (
                <img
                  src={profileData.profilePic}
                  alt="profile"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span className="avatar-emoji-large">
                  {profileData.fullName
                    ? profileData.fullName.split(" ").length >= 2
                      ? (
                          profileData.fullName.split(" ")[0][0] +
                          profileData.fullName.split(" ")[
                            profileData.fullName.split(" ").length - 1
                          ][0]
                        ).toUpperCase()
                      : profileData.fullName.substring(0, 2).toUpperCase()
                    : profileData.username.substring(0, 2).toUpperCase()}
                </span>
              )}
              {isEditing && (
                <button
                  className="change-avatar-btn"
                  onClick={handleAvatarClick}
                  type="button"
                >
                  <Camera size={20} />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="profile-form">
            <div className="form-group">
              <label>Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="fullName"
                  className="input-field"
                  value={editData.fullName}
                  onChange={handleChange}
                />
              ) : (
                <p className="profile-value">{profileData.fullName}</p>
              )}
            </div>

            <div className="form-group">
              <label>Username</label>
              {isEditing ? (
                <input
                  type="text"
                  name="username"
                  className="input-field"
                  value={editData.username}
                  onChange={handleChange}
                />
              ) : (
                <p className="profile-value">@{profileData.username}</p>
              )}
            </div>

            <div className="form-group">
              <label>Email</label>
              <p className="profile-value">{profileData.email}</p>
            </div>

            <div className="form-group">
              <label>Mobile</label>
              <p className="profile-value">{profileData.mobile}</p>
            </div>

            <div className="form-group">
              <label>Bio</label>
              {isEditing ? (
                <textarea
                  name="bio"
                  className="input-field textarea-field"
                  value={editData.bio}
                  onChange={handleChange}
                  rows="3"
                />
              ) : (
                <p className="profile-value">{profileData.bio}</p>
              )}
            </div>

            {isEditing && (
              <div className="button-group">
                <button className="btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSave}>
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!isEmbedded && <BottomTabBar activeTab="profile" />}
    </div>
  );
};

export default Profile;
