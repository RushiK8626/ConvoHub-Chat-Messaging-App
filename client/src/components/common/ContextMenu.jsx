import React, { useEffect, useRef, useState } from "react";
import "./ContextMenu.css";

/**
 * Reusable Context/Dropdown Menu Component
 * @param {boolean} isOpen - Whether the menu is visible
 * @param {number} x - X position for the menu (click position)
 * @param {number} y - Y position for the menu (click position)
 * @param {HTMLElement} anchorEl - Optional anchor element to position relative to
 * @param {string} position - Menu position relative to click point:
 *        'bottom-right' (default) - menu opens to bottom-right of click
 *        'bottom-left' - menu opens to bottom-left of click
 *        'top-right' - menu opens to top-right of click
 *        'top-left' - menu opens to top-left of click
 * @param {number} maxX - Optional max X boundary (useful for split layouts)
 * @param {array} items - Array of menu items with structure:
 *        { id, label, icon, onClick, color, divider }
 * @param {function} onClose - Callback when menu should close
 * @param {string} theme - Optional theme class (light/dark)
 */
const ContextMenu = ({ 
  isOpen, 
  x, 
  y, 
  anchorEl, 
  position = 'bottom-right',
  maxX,
  items, 
  onClose, 
  theme = "light" 
}) => {
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Calculate position based on anchor element or x/y coordinates
  useEffect(() => {
    if (!isOpen) return;

    // Wait for menu to render to get its dimensions
    const calculatePosition = () => {
      const menu = menuRef.current;
      if (!menu) return;

      const menuRect = menu.getBoundingClientRect();
      const menuWidth = menuRect.width || 200;
      const menuHeight = menuRect.height || 200;
      const padding = 10; // Padding from viewport edges
      
      // Use maxX if provided, otherwise use viewport width
      const maxRight = maxX || window.innerWidth;

      let left, top;

      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        left = rect.right - menuWidth;
        top = rect.bottom + 4;

        if (left < padding) left = padding;
        if (left + menuWidth > maxRight - padding) left = maxRight - menuWidth - padding;
        if (top + menuHeight > window.innerHeight - padding) top = rect.top - menuHeight - 4;
      } else {
        // Calculate initial position based on position prop
        switch (position) {
          case 'top-left':
            left = x - menuWidth;
            top = y - menuHeight;
            break;
          case 'top-right':
            left = x;
            top = y - menuHeight;
            break;
          case 'bottom-left':
            left = x - menuWidth;
            top = y;
            break;
          case 'bottom-right':
          default:
            left = x;
            top = y;
            break;
        }

        // Auto-adjust if menu goes outside viewport boundaries
        
        // Check right boundary
        if (left + menuWidth > maxRight - padding) {
          left = maxRight - menuWidth - padding;
        }
        
        // Check left boundary
        if (left < padding) {
          left = padding;
        }
        
        // Check bottom boundary
        if (top + menuHeight > window.innerHeight - padding) {
          // Flip to show above if there's more space
          if (y - menuHeight > padding) {
            top = y - menuHeight;
          } else {
            top = window.innerHeight - menuHeight - padding;
          }
        }
        
        // Check top boundary
        if (top < padding) {
          // Flip to show below if there's more space
          if (y + menuHeight < window.innerHeight - padding) {
            top = y;
          } else {
            top = padding;
          }
        }
      }

      setMenuPosition({ top, left });
    };

    // Use requestAnimationFrame to ensure menu has rendered
    requestAnimationFrame(calculatePosition);
  }, [isOpen, anchorEl, x, y, position, maxX]);

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
      <div className="context-menu-overlay blurred-light" onClick={onClose} />

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
