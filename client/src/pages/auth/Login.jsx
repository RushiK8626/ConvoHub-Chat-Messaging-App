import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "../../hooks/useToast";
import ToastContainer from "../../components/common/ToastContainer";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const { toasts, showError, removeToast } = useToast();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.password) newErrors.password = "Password is required";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        const API_URL = (
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        ).replace(/\/+$/, "");

        const { data } = await axios.post(`${API_URL}/api/auth/login`, {
          username: formData.username,
          email: formData.username,
          password: formData.password,
        });

        navigate("/verify-otp", {
          state: {
            userId: data.userId,
            username: data.username,
            type: "login",
            message: data.message,
            expiresIn: data.expiresIn || 300,
          }
        });
      } catch (error) {
        console.error("Login error:", error);

        if (error.response) {
          if (error.response.status === 401) {
            showError("Invalid Credentials. Login Failed");
          } else {
            const errData = error.response.data;
            showError("Login Failed. Please try again");
            setErrors({
              api:
                errData.error ||
                errData.message ||
                "Login failed. Please try again.",
            });
          }
        } else {
          showError("Unable to connect to server. Please try again later.");
          setErrors({
            api: "Unable to connect to server. Please try again later.",
          });
        }
      } finally {
        setLoading(false);
      }
    } else {
      Object.values(newErrors).forEach((msg) => showError(msg));
      setErrors(newErrors);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login | ConvoHub</title>
        <meta name="description" content="Sign in to your SwiftTalk account to chat and connect." />
        <meta property="og:title" content="Login | SwiftTalk" />
        <meta property="og:description" content="Sign in to your SwiftTalk account to chat and connect." />
      </Helmet>

      <div className="login-container">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="login-card fade-in">
          <div className="login-header">
            <h1>Welcome to SwiftTalk</h1>
            <p>Sign in to continue your conversations</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username or Email</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input
                  type="text"
                  id="username"
                  name="username"
                  className={`input-field ${errors.username ? "error" : ""}`}
                  placeholder="Enter your username or email"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
              {errors.username && (
                <span className="error-text">{errors.username}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  className={`input-field ${errors.password ? "error" : ""}`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <span className="error-text">{errors.password}</span>
              )}
            </div>

            <div className="form-options">
              <Link to="/forgot-password" className="forgot-password">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn-submit-primary"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Don't have an account?{" "}
              <Link to="/register" className="register-link">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
