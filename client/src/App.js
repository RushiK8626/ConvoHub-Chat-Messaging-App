import React, { useState, createContext } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OTPVerification from "./pages/OTPVerification";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ChatHome from "./pages/ChatHome";
import ChatWindow from "./pages/ChatWindow";
import AIChatWindow from "./pages/AIChatWindow";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Settings from "./pages/Settings";
import Appearance from "./pages/Appearance";
import BlockedUsers from "./pages/BlockedUsers";
import PrivacySettings from "./pages/PrivacySettings";
import "./App.css";
import "./styles/theme.css";
import NotificationSettings from "./pages/NotificationSettings";
import Language from "./pages/Language";

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
