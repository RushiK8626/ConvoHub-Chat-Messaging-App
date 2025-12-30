import React from "react";
import { ArrowLeft } from "lucide-react";
import "./PageHeader.css";

const PageHeader = ({
  title,
  onBack,
  rightAction = null,
  backgroundColor = "var(--header-background)",
  variant = "default", // 'default' or 'accent' for BlockedUsers
}) => {
  return (
    <div
      className={`page-header page-header-${variant}`}
      style={variant === "default" ? { backgroundColor } : {}}
    >
      <button className="page-header-back-btn" onClick={onBack}>
        <ArrowLeft size={24} />
      </button>
      <h1 className="page-header-title">{title}</h1>
      <div className="page-header-action">{rightAction}</div>
    </div>
  );
};

export default PageHeader;
