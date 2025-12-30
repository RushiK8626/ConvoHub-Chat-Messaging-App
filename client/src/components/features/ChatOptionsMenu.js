import React from "react";
import { MessageCircle, Users } from "lucide-react";
import "./ChatOptionsMenu.css";

const ChatOptionsMenu = ({ isOpen, onNewChat, onNewGroup }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="options-overlay" onClick={() => {}} />
      <div className="chat-options-menu">
        <button className="option-item new-chat" onClick={onNewChat}>
          <div className="option-icon">
            <MessageCircle size={24} />
          </div>
          <div className="option-text">
            <h3>Chat with User</h3>
            <p>Start a new conversation</p>
          </div>
          <span className="arrow">›</span>
        </button>
        <button className="option-item new-group" onClick={onNewGroup}>
          <div className="option-icon">
            <Users size={24} />
          </div>
          <div className="option-text">
            <h3>Create Group</h3>
            <p>Start a group chat</p>
          </div>
          <span className="arrow">›</span>
        </button>
      </div>
    </>
  );
};

export default ChatOptionsMenu;
