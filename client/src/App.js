import React, { useState, createContext } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import OTPVerification from "./pages/auth/OTPVerification";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import ChatHome from "./pages/chat/ChatHome";
import ChatWindow from "./pages/chat/ChatWindow";
import AIChatWindow from "./pages/chat/AIChatWindow";
import Profile from "./pages/settings/Profile";
import UserProfile from "./pages/settings/UserProfile";
import Settings from "./pages/settings/Settings";
import Appearance from "./pages/settings/Appearance";
import BlockedUsers from "./pages/settings/BlockedUsers";
import PrivacySettings from "./pages/settings/PrivacySettings";
import NotificationSettings from "./pages/settings/NotificationSettings";
import Language from "./pages/settings/Language";
import "./App.css";
import "./styles/theme.css";

// Auth context to force rerender on login/logout
export const AuthContext = createContext({ refreshAuth: () => {} });

function App() {
  const [authState, setAuthState] = useState(0); // Dummy state to trigger rerender

  const refreshAuth = () => {
    // Force a rerender by updating a dummy state
    setAuthState((prev) => prev + 1);
  };

  const hasToken = !!localStorage.getItem("accessToken");

  return (
    <ThemeProvider>
      <AuthContext.Provider value={{ refreshAuth }}>
        <Router>
          <div className="App">
            <Routes>
              <Route
                path="/login"
                element={!hasToken ? <Login /> : <Navigate to="/chats" />}
              />
              <Route
                path="/register"
                element={!hasToken ? <Register /> : <Navigate to="/chats" />}
              />
              <Route path="/verify-otp" element={<OTPVerification />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/chats"
                element={hasToken ? <ChatHome /> : <Navigate to="/login" />}
              />
              <Route
                path="/chat/:chatId"
                element={hasToken ? <ChatWindow /> : <Navigate to="/login" />}
              />
              <Route
                path="/ai-chat"
                element={hasToken ? <AIChatWindow /> : <Navigate to="/login" />}
              />
              <Route
                path="/settings/profile"
                element={hasToken ? <Profile /> : <Navigate to="/login" />}
              />
              <Route
                path="/user/:userId"
                element={hasToken ? <UserProfile /> : <Navigate to="/login" />}
              />
              <Route
                path="/settings"
                element={hasToken ? <Settings /> : <Navigate to="/login" />}
              />
              <Route
                path="/settings/appearance"
                element={hasToken ? <Appearance /> : <Navigate to="/login" />}
              />
              <Route
                path="/settings/blocked-users"
                element={hasToken ? <BlockedUsers /> : <Navigate to="/login" />}
              />
              <Route
                path="/settings/notifications"
                element={
                  hasToken ? <NotificationSettings /> : <Navigate to="/login" />
                }
              />
              <Route
                path="/settings/privacy"
                element={
                  hasToken ? <PrivacySettings /> : <Navigate to="/login" />
                }
              />
              <Route
                path="/settings/language"
                element={
                  hasToken ? <Language /> : <Navigate to="/login" />
                }
              />
              <Route
                path="/"
                element={<Navigate to={hasToken ? "/chats" : "/login"} />}
              />
            </Routes>
          </div>
        </Router>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

export default App;
