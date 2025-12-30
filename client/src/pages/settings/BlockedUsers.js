import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserX, Ban, Loader } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { getBlockedUsers, unblockUser } from "../../utils/api";
import { useToast } from "../../hooks/useToast";
import ToastContainer from "../../components/common/ToastContainer";
import useResponsive from "../../hooks/useResponsive";
import "./BlockedUsers.css";

const BlockedUsers = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const isWideScreen = useResponsive();
  const { toasts, showError, showSuccess, removeToast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblockingUserId, setUnblockingUserId] = useState(null);

  // Handle responsive layout changes - navigate to settings page when screen becomes wide
  useEffect(() => {
    if (!isEmbedded && isWideScreen) {
      navigate("/settings", { state: { selectedSettingId: "blocked-users" } });
    }
  }, [isWideScreen, isEmbedded, navigate]);

  // Fetch blocked users on component mount
  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const data = await getBlockedUsers();
      setBlockedUsers(data || []);
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      showError("Failed to load blocked users");
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to unblock ${userName}?`)) {
      try {
        setUnblockingUserId(userId);
        await unblockUser(userId);
        setBlockedUsers(
          blockedUsers.filter((user) => user.blockedUser.user_id !== userId)
        );
        showSuccess(`${userName} has been unblocked`);
      } catch (error) {
        console.error("Error unblocking user:", error);
        showError("Failed to unblock user");
      } finally {
        setUnblockingUserId(null);
      }
    }
  };

  return (
    <div className="blocked-users-page">
      {!isEmbedded && (
        <PageHeader title="Blocked Users" onBack={() => navigate("/settings")} />
      )}

      <div className="blocked-users-content">
        {loading ? (
          <div className="loading-container">
            <Loader size={48} className="spinner" />
            <p>Loading blocked users...</p>
          </div>
        ) : blockedUsers.length > 0 ? (
          <div className="blocked-users-list">
            {blockedUsers.map((user) => {
              let blockedUser = user.blockedUser;
              const API_URL = (
                process.env.REACT_APP_API_URL || "http://localhost:3001"
              ).replace(/\/+$/, "");
              const profilePicUrl = blockedUser.profile_pic
                ? `${API_URL}/uploads/profiles/${blockedUser.profile_pic
                    .split("/uploads/")
                    .pop()}`
                : null;

              return (
                <div key={blockedUser.user_id} className="blocked-user-item">
                  <div className="blocked-user-avatar">
                    {profilePicUrl ? (
                      <img
                        src={profilePicUrl}
                        alt={blockedUser.full_name || blockedUser.username}
                      />
                    ) : (
                      <span>
                        {blockedUser.full_name?.charAt(0) ||
                          blockedUser.username?.charAt(0) ||
                          "?"}
                      </span>
                    )}
                  </div>
                  <div className="blocked-user-info">
                    <h3>{blockedUser.full_name || blockedUser.username}</h3>
                    <p>@{blockedUser.username}</p>
                    <span className="blocked-date">
                      Blocked on{" "}
                      {new Date(user.blocked_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <button
                    className="unblock-btn"
                    onClick={() =>
                      handleUnblock(
                        blockedUser.user_id,
                        blockedUser.full_name || blockedUser.username
                      )
                    }
                    disabled={unblockingUserId === blockedUser.user_id}
                  >
                    {unblockingUserId === blockedUser.user_id ? (
                      <>
                        <Loader size={16} className="spinner" />
                        Unblocking...
                      </>
                    ) : (
                      "Unblock"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-blocked-users">
            <UserX size={64} className="no-blocked-icon" />
            <h2>No Blocked Users</h2>
            <p>You haven't blocked anyone yet</p>
          </div>
        )}

        <div className="blocked-info">
          <Ban size={20} />
          <p>
            Blocked users cannot send you messages or see your online status.
            You can unblock them anytime from this page.
          </p>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default BlockedUsers;
