import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../App";
import { Shield } from "lucide-react";
import { useToast } from "../../hooks/useToast";
import ToastContainer from "../../components/common/ToastContainer";
import { io } from "socket.io-client";
import { subscribeToPushNotifications } from "../../utils/notifications";
import axios from "axios";
import "./OTPVerification.css";

const OTPVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, showSuccess, showError, showInfo, removeToast } = useToast();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(300);
  const [isVerified, ] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);
  const socketRef = useRef(null);
  const verifiedRef = useRef(false);
  const type = location.state?.type || "login";
  const username = location.state?.username || "";
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const rawUserId = location.state?.userId ?? params.get("uid") ?? null;
  const userId = rawUserId != null ? Number(rawUserId) : null;
  const { refreshAuth } = useContext(AuthContext);

  useEffect(() => {
    if (type !== "register" || !username) return;

    const SOCKET_URL =
      process.env.REACT_APP_SOCKET_URL || "http://localhost:3001";

    const socket = io(`${SOCKET_URL}/registration`, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("monitor_registration", { username });
    });

    socket.on("monitoring_started", (data) => {
    console.log('Monitoring started for:', data.username);
    });

    socket.on("registration_cancelled", (data) => {
      if (!verifiedRef.current) {
        showInfo("Registration cancelled. Please try again.");
        navigate("/register");
      }
    });

    socket.on("disconnect", () => {
    console.log('Registration WebSocket disconnected');
    });

    socket.on("connect_error", (err) => {
      console.error("WebSocket connection error:", err);
    });

    return () => {
      if (socket && socket.connected) {
        if (!verifiedRef.current) {
          socket.emit("cancel_registration", { username });
        }
        socket.disconnect();
      }
    };
  }, [username, type, navigate, showInfo]);

  useEffect(() => {
    if (type !== "login" || !userId) return;

    const SOCKET_URL =
      process.env.REACT_APP_SOCKET_URL || "http://localhost:3001";

    const socket = io(`${SOCKET_URL}/login`, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("monitor_login", { userId: Number(userId) });
    });

    socket.on("monitoring_started", (data) => {
      console.log("Login monitoring started for userId:", data.userId);
    });

    socket.on("login_cancelled", (data) => {
      if (!verifiedRef.current) {
        showInfo("Login session expired. Please try again.");
        navigate("/login");
      }
    });

    socket.on("disconnect", () => {
    console.log('Login WebSocket disconnected');
    });

    socket.on("connect_error", (err) => {
      console.error("Login WebSocket connection error:", err);
    });

    return () => {
      if (socket && socket.connected) {
        if (!verifiedRef.current) {
          socket.emit("cancel_login", { userId });
        }
        socket.disconnect();
      }
    };
  }, [userId, type, navigate, showInfo]);

  useEffect(() => {
    if (timer > 0 && !loading && !isVerified) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer, loading, isVerified]);

  useEffect(() => {
    showSuccess("OTP sent to your registered Email", 1000);
  }, [showSuccess]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    const newOtp = [...otp];

    for (let i = 0; i < pastedData.length; i++) {
      if (!isNaN(pastedData[i])) {
        newOtp[i] = pastedData[i];
      }
    }
    setOtp(newOtp);
  };

  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join("");
    setError("");

    if (otpString.length !== 6) {
      setError("Please enter the 6-digit code.");
      showError("Please enter the complete 6-digit code.", 1000);
      return;
    }

    if (type === "register" && !username) {
      setError("Username not found. Please try again.");
      showError("Session expired. Please try again.", 1000);
      navigate("/register");
      return;
    }

    if (type === "login" && !userId) {
      setError("Session not found. Please try again.");
      showError("Session expired. Please try again.", 1000);
      navigate("/login");
      return;
    }

    if (type === "reset") {
      if (!userId) {
        showError(
          "Session not found. Please request password reset again.",
          1000
        );
        navigate("/forgot-password");
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        setError("Please enter a password of at least 6 characters.");
        showError("Please enter a password of at least 6 characters.", 1000);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        showError("Passwords do not match.", 1000);
        return;
      }

      setLoading(true);
      try {
        const API_URL = (
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        ).replace(/\/+$/, "");

        const { data } = await axios.post(`${API_URL}/api/auth/reset-password`, {
          userId,
          otpCode: otpString,
          newPassword,
        })

        try {
          sessionStorage.removeItem("passwordResetUserId");
        } catch (e) {
          /* ignore */
        }

        showSuccess(
          data.message || "Password reset successful. Please login.",
          1000
        );

        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.disconnect();
        }
        setTimeout(() => navigate("/login"), 1500);
      } catch (err) {
        console.error("Reset password error:", err);

        if (err.response) {
          showError(
            err.response.data.error ||
            err.response.data.message ||
            "Failed to reset password",
            1000
          );
        } else {
          showError("Unable to reset password. Try again later.", 1000);
        }

        setTimeout(() => navigate("/forgot-password"), 1200);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");

      const endpoint =
        type === "register"
          ? `${API_URL}/api/auth/verify-registration-otp`
          : `${API_URL}/api/auth/verify-otp`;

      const requestBody =
        type === "register"
          ? { username: username, otpCode: otpString }
          : { userId: Number(userId), otpCode: otpString };

      const { data } = await axios.post(endpoint, requestBody)

      verifiedRef.current = true; 

      if (type === "register") {
        showSuccess(
          "Registration verified successfully! Please login.",
          1000
        );

        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.disconnect();
        }
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        showSuccess("Login successful!", 1000);

        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.disconnect();
        }

        refreshAuth(); 

        if ("serviceWorker" in navigator && "PushManager" in window) {
          const permissionGranted = await Notification.requestPermission();

          if (
            permissionGranted === "granted" ||
            permissionGranted === "default"
          ) {
            subscribeToPushNotifications(data.user.id, data.accessToken)
              .then((success) => {
                if (!success) {
                  // console.log("⚠️ Push notifications subscription skipped");
                }
              })
              .catch((error) => {
                console.error(
                  "Error subscribing to push notifications:",
                  error
                );
              });
          }
        }

        setTimeout(() => {
          navigate("/chats");
        }, 2000);
      }
    } catch (err) {
      console.error("OTP verification error:", err);

      if (err.response) {
        const data = err.response.data;

        showError(
          err.response.data.error ||
          err.response.data.message ||
          "OTP verification failed. Please try again.",
          1000
        );

        if (data.error && data.error.includes("expired")) {
          setTimeout(() => {
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.disconnect();
            }
            navigate(type === "register" ? "/register" : "/login", {
              state: { message: "OTP expired. Please try again." },
            });
          }, 3000);
        }
      }
      else {
        setError("Unable to connect to server. Please try again later.");
        showError("Unable to connect to server. Please try again later.", 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setLoading(true);
    try {
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");

      const endpoint =
        type === "register"
          ? `${API_URL}/api/auth/resend-registration-otp`
          : `${API_URL}/api/auth/resend-otp`;

      const requestBody =
        type === "register"
          ? { username: username }
          : { userId: Number(userId), otpType: "login" };

      const { data } = await axios.post(endpoint, requestBody);

      showSuccess("OTP resent successfully!", 1000);
      setTimer(data.expiresIn || 300);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error("Resend OTP error:", err);

      if (err.response) {
        const data = err.response.data;

        showError(data.error ||
            data.message ||
            "Failed to resend OTP", 
            1000
        );

        if (
          data.error &&
          (data.error.includes("No pending") || data.error.includes("expired"))
        ) {
          setTimeout(() => {
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.disconnect();
            }
            navigate(type === "register" ? "/register" : "/login");
          }, 2000);
        }
      }
      else showError("Unable to resend OTP. Please try again.", 1000);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    verifiedRef.current = false;

    if (socketRef.current && socketRef.current.connected) {
      if (type === "register") {
        socketRef.current.emit("cancel_registration", { username });
      } else {
        socketRef.current.emit("cancel_login", { userId });
      }
      socketRef.current.disconnect();
    }

    showInfo(
      `${type === "register" ? "Registration" : "Login"} cancelled.`,
      1000
    );
    navigate(type === "register" ? "/register" : "/login");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="otp-container">
      <div className="otp-card fade-in">
        <div className="otp-header">
          <div className="shield-icon">
            <Shield size={64} />
          </div>
          <h1>Verification Code</h1>
          <p>
            We've sent a verification code to your{" "}
            {type === "register"
              ? "email and mobile"
              : type === "reset"
                ? "email"
                : "registered contact"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="otp-form">
          {error && (
            <div
              className="error-text"
              style={{ color: "red", marginBottom: 8 }}
            >
              {error}
            </div>
          )}
          <div className="otp-inputs" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength="1"
                className="otp-input"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
              />
            ))}
          </div>

          {type === "reset" && (
            <div className="reset-password-fields">
              <div className="form-group">
                <label htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-submit-primary"
            disabled={
              loading ||
              otp.join("").length !== 6 ||
              (type === "reset" &&
                (newPassword.length < 6 || newPassword !== confirmPassword))
            }
          >
            {loading
              ? type === "reset"
                ? "Resetting..."
                : "Verifying..."
              : type === "reset"
                ? "Reset Password"
                : "Verify & Continue"}
          </button>
        </form>

        <div className="otp-footer">
          <p className="timer-text">
            Time remaining: <strong>{formatTime(timer)}</strong>
          </p>
          <p className="timer-text">
            {canResend ? (
              <span>
                Didn't receive the code?{" "}
                <button
                  className="resend-btn"
                  onClick={handleResend}
                  disabled={loading}
                >
                  Resend OTP
                </button>
              </span>
            ) : (
              <span>You can resend OTP in {formatTime(timer)}</span>
            )}
          </p>

          <button
            className="cancel-btn"
            onClick={handleCancel}
            disabled={loading}
            style={{
              marginTop: "15px",
              backgroundColor: "#dc3545",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Cancel {type === "register" ? "Registration" : "Login"}
          </button>
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default OTPVerification;
