import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ToastContainer from "../../components/common/ToastContainer";
import { useToast } from "../../hooks/useToast";
import "./Profile.css";

const UserProfile = ({
  userId: propUserId,
  isEmbedded = false,
  onBackClick = null,
}) => {
  const { userId: paramUserId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const embedFromState = location.state?.isEmbedded || false;

  // Use prop userId if provided (embedded), otherwise use URL param
  const userId = propUserId || paramUserId;
  // Use prop isEmbedded if provided, otherwise check state
  const isEmbeddedMode = isEmbedded || embedFromState;

  const { toasts, showError, removeToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchPublicUser = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(
          `${
            (process.env.REACT_APP_API_URL || "http://localhost:3001").replace(/\/+$/, "")
          }/api/users/public/id/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          setProfile(data.user || data);
        } else {
          const d = await res.json().catch(() => ({}));
          setError(d.message || "Unable to load user");
          showError(d.message || "Unable to load user");
        }
      } catch (err) {
        console.error("Error fetching public user:", err);
        setError("Unable to load user");
        showError("Unable to load user");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicUser();
  }, [userId, showError]);

  const formatLastSeen = (iso) => {
    try {
      const ts = Date.parse(iso);
      if (isNaN(ts)) return iso;
      const diff = Math.floor((Date.now() - ts) / 1000);
      if (diff < 60) return "a moment ago";
      if (diff < 3600)
        return `${Math.floor(diff / 60)} minute${
          Math.floor(diff / 60) > 1 ? "s" : ""
        } ago`;
      if (diff < 86400)
        return `${Math.floor(diff / 3600)} hour${
          Math.floor(diff / 3600) > 1 ? "s" : ""
        } ago`;
      const d = new Date(ts);
      return d.toLocaleString();
    } catch (e) {
      return iso;
    }
  };

  return (
    <div className="profile-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="profile-header">
        <button
          className="back-btn"
          onClick={() => {
            if (onBackClick) {
              // If onBackClick callback provided (embedded in ChatHome), use it
              onBackClick();
            } else if (isEmbeddedMode) {
              navigate(-1); // Go back to previous page in split layout
            } else {
              navigate("/chats");
            }
          }}
        >
          Back
        </button>
        <h1>Profile</h1>
        <div style={{ width: 40 }} />
      </div>

      {loading ? (
        <div className="profile-content">
          <p style={{ textAlign: "center", padding: 40 }}>Loading...</p>
        </div>
      ) : error ? (
        <div className="profile-content">
          <p style={{ textAlign: "center", padding: 40 }}>{error}</p>
        </div>
      ) : (
        <div className="profile-content">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {profile?.profile_pic ? (
                <img
                  src={`${
                    (process.env.REACT_APP_API_URL || "http://localhost:3001").replace(/\/+$/, "")
                  }/uploads/profiles/${String(profile.profile_pic)
                    .split("/uploads/")
                    .pop()}`}
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
                  {(profile?.full_name || profile?.username || "")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Online status / last seen */}
          <div style={{ textAlign: "center", marginTop: 8 }}>
            {profile?.is_online ? (
              <div className="status-row">
                <span className="online-badge" />
                <span
                  style={{
                    marginLeft: 8,
                    color: "var(--accent-color)",
                    fontWeight: 600,
                  }}
                >
                  Online
                </span>
              </div>
            ) : profile?.last_seen ? (
              <div className="status-row">
                <span className="last-seen">
                  Last seen: {formatLastSeen(profile.last_seen)}
                </span>
              </div>
            ) : null}
          </div>

          <div className="profile-form">
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-field" style={{ padding: "10px 12px" }}>
                {profile?.full_name || "-"}
              </div>
            </div>

            <div className="form-group">
              <label>Username</label>
              <div className="input-field" style={{ padding: "10px 12px" }}>
                @{profile?.username || "-"}
              </div>
            </div>

            {profile?.email && (
              <div className="form-group">
                <label>Email</label>
                <div className="input-field" style={{ padding: "10px 12px" }}>
                  {profile.email}
                </div>
              </div>
            )}

            {profile?.status_message && (
              <div className="form-group">
                <label>About</label>
                <div className="input-field" style={{ padding: "10px 12px" }}>
                  {profile.status_message}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
