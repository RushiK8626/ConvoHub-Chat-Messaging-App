import React from "react";

const MessageBubble = ({ isSelf, children, style = {}, ...props }) => {
  return (
    <div
      className={`message-bubble${isSelf ? " message-bubble-self" : ""}`}
      style={{
        maxWidth: "85%", // Increased maxWidth for self messages
        minWidth: isSelf ? "40%" : undefined,
        width: isSelf ? "fit-content" : "100%",
        alignSelf: isSelf ? "flex-end" : "flex-start",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default MessageBubble;
