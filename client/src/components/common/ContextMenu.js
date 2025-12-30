import React, { useEffect, useRef, useState } from "react";
import "./ContextMenu.css";

/**
 * Reusable Context/Dropdown Menu Component
 * @param {boolean} isOpen - Whether the menu is visible
 * @param {number} x - X position for the menu
 * @param {number} y - Y position for the menu
 * @param {HTMLElement} anchorEl - Optional anchor element to position relative to
 * @param {array} items - Array of menu items with structure:
 *        { id, label, icon, onClick, color, divider }
 * @param {function} onClose - Callback when menu should close
 * @param {string} theme - Optional theme class (light/dark)
 */
const ContextMenu = ({ isOpen, x, y, anchorEl, items, onClose, theme = "light" }) => {
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Calculate position based on anchor element or x/y coordinates
  useEffect(() => {
    if (!isOpen) return;

    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const menuWidth = 200;
      const menuHeight = 300;

      let left = rect.right - menuWidth; // Align right edge of menu with right edge of button
      let top = rect.bottom + 4; // 4px below the button

      // Adjust if menu would go off left edge
      if (left < 8) {
        left = 8;
      }

      // Adjust if menu would go off right edge
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }

      // Adjust if menu would go off bottom
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 4; // Position above button instead
      }

      setMenuPosition({ top, left });
    } else {
      setMenuPosition({ top: y, left: x });
    }
  }, [isOpen, anchorEl, x, y]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    // Close menu on Escape key
    const handleEscapeKey = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick();
    }
    onClose();
  };

  return (
    <>
      {/* Overlay to close menu on click outside */}
      <div className="context-menu-overlay" onClick={onClose} />

      {/* Menu Container */}
      <div
        ref={menuRef}
        className={`context-menu ${theme}`}
        style={{
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
        }}
      >
        {items.map((item, index) => (
          <React.Fragment key={item.id || index}>
            {/* Divider */}
            {item.divider && <div className="context-menu-divider" />}

            {/* Menu Item */}
            {!item.divider && (
              <button
                className={`context-menu-item ${item.color || "default"} ${
                  item.disabled ? "disabled" : ""
                }`}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                title={item.title || item.label}
              >
                {/* Icon */}
                {item.icon && (
                  <span className="context-menu-icon">{item.icon}</span>
                )}

                {/* Label */}
                <span className="context-menu-label">{item.label}</span>

                {/* Badge (optional) */}
                {item.badge && (
                  <span className="context-menu-badge">{item.badge}</span>
                )}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
};

export default ContextMenu;
