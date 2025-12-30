import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./ResetPassword.css";
import { useToast } from "../../hooks/useToast";
import ToastContainer from "../../components/common/ToastContainer";

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toasts, showError, showSuccess, removeToast } = useToast();
  // Allow userId from navigation state or query param (uid)
  const params = new URLSearchParams(location.search);
  const rawUserId = location.state?.userId ?? params.get("uid") ?? null;
  const userId = rawUserId != null ? Number(rawUserId) : null;
  const otpCode = location.state?.otpCode || null;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !otpCode) {
      showError("Session expired. Please request password reset again.");
      navigate("/forgot-password");
      return;
    }
    if (!password || password.length < 6) {
      showError("Please enter a password of at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");
      console.log(
        JSON.stringify({
          userId: Number(userId),
          otpCode,
          newPassword: password,
        })
      );
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(userId),
          otpCode,
          newPassword: password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(
          data.message || "Password reset successfully. You can now login."
        );
        setTimeout(() => navigate("/login"), 1500);
      } else {
        showError(data.error || data.message || "Failed to reset password");
        setTimeout(() => navigate("/forgot-password"), 1200);
      }
    } catch (err) {
      console.error("Reset password error:", err);
      showError("Unable to reset password. Try again later.");
      setTimeout(() => navigate("/forgot-password"), 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-container">
      <div className="reset-card">
        <h2>Set a new password</h2>
        <p>
          Enter a new password for your account. This will replace your old
          password.
        </p>

        <form onSubmit={handleSubmit} className="reset-form">
          <label>New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label>Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Reset password"}
          </button>
        </form>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default ResetPassword;
