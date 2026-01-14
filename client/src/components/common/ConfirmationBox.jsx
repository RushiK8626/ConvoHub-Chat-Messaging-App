import React from "react";
import "./ConfirmationBox.css";

const ConfirmationBox = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDangerous = false,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirmation-overlay" onClick={onCancel}>
      <div className="confirmation-box" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-header">
          <h2>{title}</h2>
        </div>

        <div className="confirmation-content">
          <p>{message}</p>
        </div>

        <div className="confirmation-actions">
          <button
            className="confirmation-btn confirmation-cancel-btn"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`confirmation-btn confirmation-confirm-btn ${
              isDangerous ? "dangerous" : ""
            }`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationBox;
