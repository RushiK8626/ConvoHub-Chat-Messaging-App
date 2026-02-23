import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios"
import { User, Mail, Lock, Phone, Eye, EyeOff } from "lucide-react";
import { useToast } from "../../hooks/useToast";
import ToastContainer from "../../components/common/ToastContainer";
import "./Register.css";

const Register = () => {
  const navigate = useNavigate();
  const { toasts, showSuccess, showError, removeToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});

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
    if (!formData.fullName) newErrors.fullName = "Full name is required";
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email is invalid";
    if (!formData.mobile) newErrors.mobile = "Mobile number is required";
    else if (!/^\d{10}$/.test(formData.mobile))
      newErrors.mobile = "Mobile number must be 10 digits";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
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

        await axios.post(`${API_URL}/api/auth/register`, {
          full_name: formData.fullName,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          phone: formData.mobile,
        });

        showSuccess("Registration successful! Please verify your OTP.");
        navigate("/verify-otp", {
          state: {
            type: "register",
            username: formData.username,
          },
        });
      } catch (err) {
        console.error("Registration error:", err);

        if (err.response) {
          if (err.response.status === 409) {
            showError("Username or Email already exists.");
          } else {
            const data = err.response.data;
            showError(data.message || "Registration failed. Please try again.");
            setErrors({ submit: data.message || "Registration failed" });
          }
        }
        else {
          showError("Unable to connect to server. Please try again later.");
          setErrors({ submit: "Network error. Please try again." });
        }
      } finally {
        setLoading(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <>
      <Helmet>
        <title>Create Account | SwiftTalk</title>
        <meta name="description" content="Register to SwiftTalk to chat and connect." />
        <meta property="og:title" content="Register | SwiftTalk" />
        <meta property="og:description" content="Sign in to your ConvoHub account to chat and connect." />
      </Helmet>
      <div className="register-container">
        <div className="register-card fade-in">
          <div className="register-header">
            <h1>Create Account</h1>
            <p>Join SwiftTalk and start connecting</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-wrapper">
                <User className="input-icon" size={20} />
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  className={`input-field ${errors.fullName ? "error" : ""}`}
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>
              {errors.fullName && (
                <span className="error-text">{errors.fullName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <User className="input-icon" size={20} />
                <input
                  type="text"
                  id="username"
                  name="username"
                  className={`input-field ${errors.username ? "error" : ""}`}
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
              {errors.username && (
                <span className="error-text">{errors.username}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`input-field ${errors.email ? "error" : ""}`}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="mobile">Mobile Number</label>
              <div className="input-wrapper">
                <Phone className="input-icon" size={20} />
                <input
                  type="tel"
                  id="mobile"
                  name="mobile"
                  className={`input-field ${errors.mobile ? "error" : ""}`}
                  placeholder="Enter your mobile number"
                  value={formData.mobile}
                  onChange={handleChange}
                />
              </div>
              {errors.mobile && (
                <span className="error-text">{errors.mobile}</span>
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
                  placeholder="Create a password"
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

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  className={`input-field ${errors.confirmPassword ? "error" : ""
                    }`}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="error-text">{errors.confirmPassword}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn-submit-primary"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="register-footer">
            <p>
              Already have an account?{" "}
              <Link to="/login" className="login-link">
                Sign In
              </Link>
            </p>
          </div>
        </div>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </>
  );
};

export default Register;
