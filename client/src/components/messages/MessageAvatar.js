import React from "react";

const MessageAvatar = ({ src, alt = "profile", size = 36, style = {} }) => (
  <img
    src={src || "/default-avatar.png"}
    alt={alt}
    className="message-avatar"
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      objectFit: "cover",
      marginRight: 8,
      marginTop: 2,
      background: "#eee",
      flexShrink: 0,
      ...style,
    }}
  />
);

export default MessageAvatar;
