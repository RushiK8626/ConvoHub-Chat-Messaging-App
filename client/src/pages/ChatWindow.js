import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Scrollbar } from "react-scrollbars-custom";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import {
  ArrowLeft,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Image,
  File,
  Check,
  CheckCheck,
  X,
  Loader,
  Copy,
  Reply,
  Forward,
  Trash2,
  Search,
  Eraser,
  UserCheck,
  Ban,
  Users,
  UserPlus,
  LogOut,
  ChevronUp,
  ChevronDown,
  Languages,
  FileText,
  Sparkles,
} from "lucide-react";
import ChatInfoModal from "../components/ChatInfoModal";
import UpdateGroupInfoModal from "../components/UpdateGroupInfoModal";
import AttachmentPreview from "../components/AttachmentPreview";
import ToastContainer from "../components/ToastContainer";
import TypingIndicator from "../components/TypingIndicator";
import ContextMenu from "../components/ContextMenu";
import ConfirmationBox from "../components/ConfirmationBox";
import MessageStatusIndicator from "../components/MessageStatusIndicator";
import SystemMessage from "../components/SystemMessage";
import SmartReplies from "../components/SmartReplies";
import MessageTranslator from "../components/MessageTranslator";
import ChatSummary from "../components/ChatSummary";
import ConversationStarters from "../components/ConversationStarters";
import useContextMenu from "../hooks/useContextMenu";
import { useToast } from "../hooks/useToast";
import useResponsive from "../hooks/useResponsive";
import { formatMessageTime, formatLastSeen } from "../utils/dateUtils";
import socketService from "../utils/socket";
import { getFileLogo, isImageFile, formatFileSize } from "../utils/fileLogos";
import {
  blockUser,
  unblockUser,
  isUserBlocked,
  checkBlockStatus,
} from "../utils/blockingService";
import EmojiPicker from "../components/EmojiPicker";
import { translateText } from "../utils/aiClient";
import "./ChatWindow.css";

const ChatWindow = ({
  chatId: propChatId,
  isEmbedded = false,
  onClose = null,
  onMemberClick = null,
}) => {
  const params = useParams();
  const location = useLocation();
  const chatId = propChatId || params?.chatId;
  const navigate = useNavigate();
  const isWideScreen = useResponsive();
  const [shouldSendGreeting, setShouldSendGreeting] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const headerRef = useRef(null);
  const inputContainerRef = useRef(null);
  const smartRepliesRef = useRef(null);
  const [messagesHeight, setMessagesHeight] = useState("calc(100vh - 200px)");
  const [messageText, setMessageText] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingMessages, setUploadingMessages] = useState({}); // Track upload progress per message tempId
  const { toasts, showError, showSuccess, removeToast } = useToast();

  // Message context menu hook
  const messageContextMenu = useContextMenu();
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Header context menu hook
  const headerContextMenu = useContextMenu();
  const [headerMenuBtn, setHeaderMenuBtn] = useState(null);
  const [headerSearchBtn, setHeaderSearchBtn] = useState(null);

  // Get userId from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.user_id;
  const [chatInfo, setChatInfo] = useState({
    id: chatId,
    name: "",
    avatar: "💬",
    online: false,
    is_online: false,
    last_seen: null,
    admins: [],
    is_admin: false,
    description: "",
    chat_image: null,
  });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userProfiles, setUserProfiles] = useState({});
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);
  const [chatImageUrl, setChatImageUrl] = useState(null); // Store blob URL for chat image
  const [showChatInfoModal, setShowChatInfoModal] = useState(false);
  const [showUpdateGroupInfoModal, setShowUpdateGroupInfoModal] =
    useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchAddMember, setSearchAddMember] = useState("");

  // AI Features State
  const [showSmartReplies, setShowSmartReplies] = useState(false);
  const [showTranslator, setShowTranslator] = useState(false);
  const [translateMessage, setTranslateMessage] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showConversationStarters, setShowConversationStarters] =
    useState(false);
  const [messageTranslations, setMessageTranslations] = useState({}); // {message_id: {text: string, lang: string, loading: boolean}}
  const [addMemberResults, setAddMemberResults] = useState([]);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState(null);
  const [showAddMemberConfirmation, setShowAddMemberConfirmation] =
    useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [messageStatuses, setMessageStatuses] = useState({}); // {message_id: {user_id: status}}

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  const [selectedMessages, setSelectedMessages] = useState({});
  const [messageSelection, setMessageSelection] = useState(false);
  const [selectedOwnMessage, setSelectedOwnMessage] = useState(false);

  const [replyToMessage, setReplyToMessage] = useState(null);

  const messageRefs = useRef({});
  const searchInputRef = useRef(null);

  const [showEmoji, setShowEmoji] = useState(false);

  // Calculate messages container height dynamically
  useEffect(() => {
    const calculateHeight = () => {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        const headerHeight = headerRef.current?.offsetHeight || 0;
        const inputHeight = inputContainerRef.current?.offsetHeight || 0;
        const searchBoxHeight = showSearch
          ? document.querySelector(".search-box-container")?.offsetHeight || 60
          : 0;
        // Smart Replies is absolutely positioned, so don't include in height calculation

        // Add extra buffer for any margins/padding
        const totalOffset =
          headerHeight +
          inputHeight +
          searchBoxHeight +
          10;

        setMessagesHeight(`calc(100vh - ${totalOffset}px)`);
      });
    };

    // Calculate immediately
    calculateHeight();

    // Also calculate after a short delay to catch any async renders
    const timer = setTimeout(calculateHeight, 150);

    // Use MutationObserver to watch for changes in input container height
    const observer = new MutationObserver(() => {
      calculateHeight();
    });

    if (inputContainerRef.current) {
      observer.observe(inputContainerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }

    if (headerRef.current) {
      observer.observe(headerRef.current, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }

    window.addEventListener("resize", calculateHeight);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", calculateHeight);
    };
  }, [
    showSearch,
    showFilePreview,
    replyToMessage,
    uploading,
    showTranslator,
    showSummary,
    showConversationStarters,
  ]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setCurrentResultIndex(0);
      return;
    }

    const results = messages
      .map((msg, index) => ({
        ...msg,
        originalIndex: index,
      }))
      .filter((msg) =>
        msg.message_text.toLowerCase().includes(searchQuery.toLowerCase())
      );

    setSearchResults(results);
    setCurrentResultIndex(results.length > 0 ? 0 : -1);
  }, [searchQuery, messages]);

  useEffect(() => {
    if (searchResults.length > 0 && currentResultIndex >= 0) {
      const currentMessage = searchResults[currentResultIndex];
      const messageElement = messageRefs.current[currentMessage.message_id];

      if (messageElement) {
        messageElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentResultIndex, searchResults]);

  const highlightText = (text, query) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-300 text-black rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleNextResult = () => {
    if (searchResults.length > 0) {
      setCurrentResultIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    }
  };

  const handlePrevResult = () => {
    if (searchResults.length > 0) {
      setCurrentResultIndex((prev) =>
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    }
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    setCurrentResultIndex(0);
  };

  const isCurrentResult = (msgId) => {
    return (
      searchResults.length > 0 &&
      searchResults[currentResultIndex]?.message_id === msgId
    );
  };

  // Function to fetch user profile by user_id
  const fetchUserProfile = async (senderId) => {
    if (userProfiles[senderId] || senderId === userId) return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        }/api/users/public/id/${senderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const userData = data.user;

        // Convert profile_pic to full URL if it exists
        if (userData.profile_pic) {
          // Extract filename from path like /uploads/25002-xxx.jpg
          const filename = userData.profile_pic.split("/uploads/").pop();
          userData.profile_pic = `${
            process.env.REACT_APP_API_URL || "http://localhost:3001"
          }/uploads/profiles/${filename}`;
        }

        setUserProfiles((prev) => ({
          ...prev,
          [senderId]: userData,
        }));
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  // Function to fetch chat image with token
  const fetchChatImage = async (imagePath) => {
    if (!imagePath) return;
    try {
      const token = localStorage.getItem("accessToken");
      const filename = imagePath.split("/uploads/").pop();
      const res = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        }/uploads/chat-images/${filename}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        setChatImageUrl(blobUrl);
      }
    } catch (err) {
      console.error("Error fetching chat image:", err);
    }
  };

  // Handle clicking on chat avatar/name to show info modal
  const handleShowChatInfo = () => {
    setShowChatInfoModal(true);
  };

  // Handle clicking on message avatar to show user profile
  const handleShowUserProfile = (senderId) => {
    setSelectedUserId(senderId);
    setShowUserProfileModal(true);
  };

  // Handle member click from group info modal
  const handleMemberClick = (memberId) => {
    // If onMemberClick callback provided, use it to show member profile in modal
    if (onMemberClick) {
      onMemberClick(memberId);
      return;
    }

    // Otherwise, navigate to user profile
    navigate(`/user/${memberId}`);
  };

  // Handle responsive layout changes
  useEffect(() => {
    // If viewing ChatWindow as a full page (not embedded) on a wide screen, navigate back to ChatHome with the chat open
    if (
      !isEmbedded &&
      isWideScreen &&
      typeof window !== "undefined" &&
      window.innerWidth >= 900
    ) {
      // Navigate back to chat home with this chat selected (will open in split layout)
      navigate("/chats", { state: { selectedChatId: chatId } });
    }
  }, [isWideScreen, isEmbedded, chatId, navigate]);

  useEffect(() => {
    const fetchChatAndMessages = async () => {
      // Validate userId before making requests
      if (!userId) {
        console.error("[ERROR] userId is not available");
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("accessToken");

        // Fetch chat info
        const chatRes = await fetch(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:3001"
          }/api/chats/${chatId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!chatRes.ok) throw new Error("Failed to fetch chat info");
        const chatData = await chatRes.json();
        const chat = chatData.chat;
        // Set chatInfo for header display
        let chatType = chat.chat_type;
        let members = chat.members || [];
        let chatName = "";
        let otherUserId = null;
        if (chatType === "private" && Array.isArray(members)) {
          const other = members.find((m) => m.user_id !== userId);
          if (other) {
            otherUserId = other.user_id;
            if (other.user && other.user.full_name) {
              chatName = other.user.full_name;
            } else if (other.user && other.user.username) {
              chatName = other.user.username;
            }

            // Check blocking status
            try {
              const blockStatus = await checkBlockStatus(userId, other.user_id);
              if (blockStatus && blockStatus.isBlocked) {
                setIsBlocked(true);
                if (blockStatus.otherUserBlockedCurrent) {
                  setIsBlockedByOther(true);
                }
              }
            } catch (error) {
              console.error("Error checking block status:", error);
            }
          }
        } else if (chatType === "group") {
          chatName = chat.chat_name;
          // Fetch group chat image if available
          if (chat.chat_image) {
            fetchChatImage(chat.chat_image);
          }
        }

        // Fetch other user's profile in private chat
        if (otherUserId) {
          fetchUserProfile(otherUserId);
        }

        // Get is_online and last_seen for private chats
        let isOnline = false;
        let lastSeen = null;
        if (chatType === "private" && otherUserId) {
          const otherMember = members.find((m) => m.user_id === otherUserId);
          if (otherMember && otherMember.user) {
            isOnline = otherMember.user.is_online || false;
            lastSeen = otherMember.user.last_seen || null;
          }
        }

        setChatInfo((info) => ({
          ...info,
          name: chatName,
          avatar: "💬",
          online: isOnline,
          is_online: isOnline,
          last_seen: lastSeen,
          chat_type: chatType,
          members: members,
          otherUserId: otherUserId,
          admins: chat.admins || [],
          description: chat.chat_description || chat.description || "",
          chat_image: chat.chat_image || null,
          // mark whether current user is admin in this group
          is_admin:
            Array.isArray(chat.admins) &&
            chat.admins.some((a) => a.user_id === userId),
        }));

        // Fetch messages with proper userId parameter
        const res = await fetch(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:3001"
          }/api/messages/chat/${chatId}?userId=${encodeURIComponent(
            String(userId)
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();

        setMessages(data.messages || []);

        // Parse message statuses from the API response
        if (data.messages && Array.isArray(data.messages)) {
          const statusMap = {};
          data.messages.forEach((message) => {
            if (message.status && Array.isArray(message.status)) {
              statusMap[message.message_id] = {};
              message.status.forEach((statusItem) => {
                statusMap[message.message_id][statusItem.user_id] =
                  statusItem.status;
              });
            }
          });
          setMessageStatuses(statusMap);

          setSelectedMessages((prev) => ({
            ...prev,
            ...Object.fromEntries(
              data.messages.map((item) => [item.message_id, false])
            ),
          }));
        }
      } catch (err) {
        setError(err.message || "Error fetching messages");
      } finally {
        setLoading(false);
      }
    };
    fetchChatAndMessages();
  }, [chatId, userId]);

  // Handle greeting message for newly created private chats
  useEffect(() => {
    const greetingChatId = sessionStorage.getItem("sendGreetingOnChatLoad");
    if (
      greetingChatId &&
      Number(greetingChatId) === Number(chatId) &&
      messages.length > 0
    ) {
      // Clear the flag
      sessionStorage.removeItem("sendGreetingOnChatLoad");
      setShouldSendGreeting(true);
    }
  }, [chatId, messages.length]);

  // Send greeting message when flag is set and chat is ready
  useEffect(() => {
    if (shouldSendGreeting && !loading && messages.length > 0) {
      setShouldSendGreeting(false);
      // Send greeting with a small delay to ensure everything is loaded
      const timer = setTimeout(() => {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const messageData = {
          chat_id: parseInt(chatId),
          sender_id: userId,
          message_text: "Hello!👋",
          message_type: "text",
          tempId: tempId,
        };
        socketService.sendMessage(messageData);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldSendGreeting, loading, messages.length, chatId, userId]);

  // Fetch user profiles for message senders
  useEffect(() => {
    messages.forEach((message) => {
      if (message.sender_id && message.sender_id !== userId) {
        fetchUserProfile(message.sender_id);
      }
    });
    // eslint-disable-next-line
  }, [messages]);

  // Mark received messages as read when they come into view
  useEffect(() => {
    if (messages.length === 0) return;

    // Mark messages from other users as read (they're already delivered from API)
    messages.forEach((message) => {
      // Only mark messages from other users (not sent by current user)
      if (message.sender_id !== userId) {
        const currentStatus = messageStatuses[message.message_id];
        const userStatus = currentStatus?.[userId];

        // If message hasn't been marked as read yet, mark it as read
        if (userStatus !== "read") {
          socketService.updateMessageStatus(message.message_id, "read");
        }
      }
    });
    // eslint-disable-next-line
  }, [messages, userId, messageStatuses]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (chatImageUrl) {
        URL.revokeObjectURL(chatImageUrl);
      }
    };
  }, [chatImageUrl]);

  // Socket.IO setup - Connect and join chat room
  useEffect(() => {
    // Connect to socket
    const socket = socketService.connect(userId);

    // Function to join chat when socket is ready
    const joinChatWhenReady = () => {
      if (socketService.isSocketConnected()) {
        socketService.joinChat(chatId);
      } else {
        // Wait for connection
        socket.once("connect", () => {
          socketService.joinChat(chatId);
        });
      }
    };

    joinChatWhenReady();

    // DEBUG: Log all socket events for this chat
    const onAnyEvent = (event, data) => {
      if (
        event.includes("member") ||
        event.includes("add") ||
        event.includes("remove")
      ) {
      }
    };
    socket.onAny(onAnyEvent);

    // Listen for new messages
    const handleNewMessage = (message) => {
      setMessages((prevMessages) => {
        // Check if this is a real message (has message_id that's a number, not temp)
        const isRealMessage =
          message.message_id &&
          !message.message_id.toString().startsWith("temp");

        if (isRealMessage) {
          // Check if we already have this real message (avoid duplicates)
          const existingRealMessage = prevMessages.some(
            (m) => m.message_id === message.message_id && !m.isOptimistic
          );
          if (existingRealMessage) {
            return prevMessages;
          }

          // Find and remove the matching optimistic message by tempId
          const filteredMessages = prevMessages.filter((m) => {
            // If it's not an optimistic message, keep it
            if (!m.isOptimistic) return true;

            // Remove optimistic message if tempId matches
            if (m.tempId === message.tempId) {
              return false; // Remove this optimistic message
            }

            return true; // Keep this optimistic message
          });

          return [...filteredMessages, message];
        } else {
          // If it's an optimistic message, just add it
          return [...prevMessages, message];
        }
      });

      // Fetch user profile if needed
      if (message.sender_id && message.sender_id !== userId) {
        fetchUserProfile(message.sender_id);
      }
    };

    // Listen for typing indicators
    const handleUserTyping = ({ userId: typingUserId, userName }) => {
      if (typingUserId !== userId) {
        setTypingUsers((prev) => {
          const alreadyTyping = prev.some((u) => u.userId === typingUserId);

          if (!alreadyTyping) {
            return [...prev, { userId: typingUserId, userName }];
          }
          return prev;
        });
      }
    };

    const handleUserStoppedTyping = ({ userId: typingUserId }) => {
      setTypingUsers((prev) => {
        const wasTyping = prev.some((u) => u.userId === typingUserId);

        if (wasTyping) {
          return prev.filter((u) => u.userId !== typingUserId);
        }
        return prev;
      });
    };

    // Listen for user online event
    const handleUserOnline = ({ user_id, username, full_name, status }) => {
      setChatInfo((prev) => {
        if (prev.otherUserId === user_id) {
          return {
            ...prev,
            is_online: true,
            last_seen: null,
          };
        }
        return prev;
      });
    };

    // Listen for user offline event
    const handleUserOffline = ({ user_id, username, lastSeen }) => {
      setChatInfo((prev) => {
        if (prev.otherUserId === user_id) {
          return {
            ...prev,
            is_online: false,
            last_seen: lastSeen,
          };
        }
        return prev;
      });
    };

    // Listen for user online status updates
    const handleUserOnlineStatus = ({
      userId: statusUserId,
      isOnline,
      lastSeen,
    }) => {
      setChatInfo((prev) => {
        if (prev.otherUserId === statusUserId) {
          return {
            ...prev,
            is_online: isOnline,
            last_seen: lastSeen,
          };
        }
        return prev;
      });
    };

    // Listen for file upload progress updates from server
    const handleFileUploadProgress = (progressData) => {
      const { progress, tempId } = progressData;
      setUploadProgress(progress);
      if (tempId) {
        setUploadingMessages(prev => ({
          ...prev,
          [tempId]: { ...prev[tempId], progress }
        }));
      }
    };

    // Listen for file upload success from server
    const handleFileUploadSuccess = (messageData) => {
      const { tempId } = messageData;
      
      // Clear uploading state for this message
      if (tempId) {
        setUploadingMessages(prev => {
          const newState = { ...prev };
          delete newState[tempId];
          
          // Reset global upload state if no more uploads pending
          if (Object.keys(newState).length === 0) {
            setUploading(false);
            setUploadProgress(0);
          }
          
          return newState;
        });
        
        // Update the optimistic message to mark it as no longer uploading
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.tempId === tempId 
              ? { ...msg, isUploading: false }
              : msg
          )
        );
      }
      
      // Show success toast
      showSuccess("File uploaded successfully!");
    };

    // Listen for message status updates (delivered/read)
    const handleMessageStatusUpdated = (statusData) => {
      const { message_id, user_id, status, updated_at } = statusData;

      setMessageStatuses((prev) => {
        return {
          ...prev,
          [message_id]: {
            ...prev[message_id],
            [user_id]: status,
          },
        };
      });
    };

    // Listen for message deletion events
    const handleMessageDeletedForAllUsers = (data) => {
      setMessages((prevMessages) =>
        prevMessages.filter((m) => m.message_id !== data.message_id)
      );
      showSuccess("Message deleted for everyone");
    };

    const handleDeleteSuccess = (data) => {
      showSuccess(data.message || "Message deleted");
      messageContextMenu.closeMenu();
    };

    const handleDeleteError = (data) => {
      console.error("❌ Delete error:", data);
      showError(data.error || "Failed to delete message");
    };

    // Handle member added to group
    const handleMemberAdded = (data) => {
      // Only add system message if event is for current chat
      if (data.chat_id !== parseInt(chatId)) {
        return;
      }

      // Add system message to chat
      const systemMessage = {
        message_id: `system_${Date.now()}_${Math.random()}`,
        chat_id: chatId,
        message_text:
          data.message ||
          `${data.member?.full_name || data.member?.username} joined the group`,
        message_type: "system",
        type: "member_added",
        created_at: data.timestamp || new Date().toISOString(),
        sender: {
          user_id: null,
          username: "system",
          full_name: "System",
          profile_pic: null,
        },
        isSystem: true,
      };

      setMessages((prevMessages) => [...prevMessages, systemMessage]);
    };

    // handle member removed by admin
    const handleMemberRemoved = (data) => {
      // Only add system message if event is for current chat
      if (data.chat_id !== parseInt(chatId)) {
        return;
      }

      // Add system message to chat
      const systemMessage = {
        message_id: `system_${Date.now()}_${Math.random()}`,
        chat_id: chatId,
        message_text:
          data.message ||
          `${data.member?.full_name || data.member?.username} joined the group`,
        message_type: "system",
        type: "member_removed",
        created_at: data.timestamp || new Date().toISOString(),
        sender: {
          user_id: null,
          username: "system",
          full_name: "System",
          profile_pic: null,
        },
        isSystem: true,
      };

      setMessages((prevMessages) => [...prevMessages, systemMessage]);
    };

    // Handle member added to group
    const handleMemberExited = (data) => {
      // Only add system message if event is for current chat
      if (data.chat_id !== parseInt(chatId)) {
        return;
      }

      // Add system message to chat
      const systemMessage = {
        message_id: `system_${Date.now()}_${Math.random()}`,
        chat_id: chatId,
        message_text:
          data.message ||
          `${data.member?.full_name || data.member?.username} joined the group`,
        message_type: "system",
        type: "member_added",
        created_at: data.timestamp || new Date().toISOString(),
        sender: {
          user_id: null,
          username: "system",
          full_name: "System",
          profile_pic: null,
        },
        isSystem: true,
      };

      setMessages((prevMessages) => [...prevMessages, systemMessage]);
    };

    // Add listeners
    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stopped_typing", handleUserStoppedTyping);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("user_online_status", handleUserOnlineStatus);
    socket.on("file_upload_progress_update", handleFileUploadProgress);
    socket.on("file_upload_success", handleFileUploadSuccess);
    socket.on("message_status_updated", handleMessageStatusUpdated);
    socket.on("message_deleted_for_all", handleMessageDeletedForAllUsers);
    socket.on("delete_success", handleDeleteSuccess);
    socket.on("delete_error", handleDeleteError);
    socket.on("member_added", handleMemberAdded);
    socket.on("member_removed", handleMemberAdded);
    socket.on("member_exited", handleMemberExited);

    // Cleanup on unmount - MUST remove listeners with same callback reference
    return () => {
      socketService.leaveChat(chatId);

      if (socket) {
        // Remove debug listener
        socket.offAny(onAnyEvent);

        // Remove each listener with the exact callback reference
        socket.off("new_message", handleNewMessage);
        socket.off("user_typing", handleUserTyping);
        socket.off("user_stopped_typing", handleUserStoppedTyping);
        socket.off("user_online", handleUserOnline);
        socket.off("user_offline", handleUserOffline);
        socket.off("user_online_status", handleUserOnlineStatus);
        socket.off("file_upload_progress_update", handleFileUploadProgress);
        socket.off("file_upload_success", handleFileUploadSuccess);
        socket.off("message_status_updated", handleMessageStatusUpdated);
        socket.off("message_deleted_for_all", handleMessageDeletedForAllUsers);
        socket.off("delete_success", handleDeleteSuccess);
        socket.off("delete_error", handleDeleteError);
        socket.off("member_added", handleMemberAdded);
        socket.off("member_removed", handleMemberAdded);
        socket.off("member_exited", handleMemberExited);
      }
    };
    // eslint-disable-next-line
  }, [chatId, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const messageToSend = messageText.trim();
    setMessageText(""); // Clear input immediately for better UX

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socketService.sendStoppedTyping(chatId, userId);

    // Generate temporary ID for tracking the message
    const tempId = `temp_${Date.now()}_${Math.random()}`;

    // Send message via Socket.IO with tempId
    const messageData = {
      chat_id: parseInt(chatId),
      sender_id: userId,
      message_text: messageToSend,
      message_type: "text",
      tempId: tempId, // Include tempId so server can send it back
      reply_to_id: replyToMessage?.message_id || null, // Include reply_to_id if replying
    };

    socketService.sendMessage(messageData);

    // Optimistically add message to UI with a unique temporary ID
    const optimisticMessage = {
      message_id: tempId, // Temporary unique ID
      tempId: tempId,
      ...messageData,
      created_at: new Date().toISOString(),
      sender: {
        user_id: userId,
        username: user.username,
        full_name: user.full_name,
        profile_pic: user.profile_pic,
      },
      status: [{ status: "sending" }],
      isOptimistic: true, // Flag to identify optimistic messages
      reply_to_message: replyToMessage, // Include the reply message for UI
    };

    setMessages((prevMessages) => [...prevMessages, optimisticMessage]);

    // Clear reply mode after sending
    setReplyToMessage(null);
  };

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!socketService.isSocketConnected()) {
      return;
    }

    socketService.sendTyping(chatId, userId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socketService.sendStoppedTyping(chatId, userId);
    }, 2000);
  }, [chatId, userId]);

  // Message context menu handlers
  const handleReplyMessage = (referenced_message) => {
    const messageToReply = selectedMessage || referenced_message;
    if (messageToReply) {
      setReplyToMessage(messageToReply);
      messageContextMenu.closeMenu();
      showSuccess("Reply mode activated");
    }
  };

  const handleForwardMessage = () => {
    if (selectedMessage) {
      // TODO: Implement forward functionality
      showSuccess("Forward mode activated");
    }
  };

  const handleCopyMessage = () => {
    if (selectedMessage?.message_text) {
      navigator.clipboard.writeText(selectedMessage.message_text);
      showSuccess("Message copied to clipboard");
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;

    try {
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");
      const token = localStorage.getItem("accessToken");

      const res = await fetch(
        `${API_URL}/api/messages/${selectedMessage.message_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        // Remove message from local state
        setMessages((prevMessages) =>
          prevMessages.filter(
            (m) => m.message_id !== selectedMessage.message_id
          )
        );
        showSuccess("Message deleted");
      } else {
        showError("Failed to delete message");
      }
    } catch (err) {
      console.error("Error deleting message:", err);
      showError("Error deleting message");
    }
  };

  const handleDeleteMessageForAll = async () => {
    if (!selectedMessage) return;

    // Only allow deletion if it's the sender's message or if user is admin
    const isOwn = selectedMessage.sender_id === userId;
    const isAdmin = chatInfo.is_admin;

    if (!isOwn && !isAdmin) {
      showError("You can only delete your own messages");
      return;
    }

    if (!window.confirm("Delete this message for everyone in the chat?")) {
      return;
    }

    try {
      socketService.deleteMessageForAll(selectedMessage.message_id); // ✅ USE WEBSOCKET
      showSuccess("Message deleted for everyone");
      messageContextMenu.closeMenu();
    } catch (err) {
      console.error("Error deleting message for all:", err);
      showError("Error deleting message");
    }
  };

  // Handle inline translation of a message
  const handleTranslateMessage = async (message, targetLanguage) => {
    if (!message?.message_text) return;
    
    const messageId = message.message_id;
    
    // Set loading state
    setMessageTranslations(prev => ({
      ...prev,
      [messageId]: { text: '', lang: targetLanguage, loading: true }
    }));
    
    try {
      const result = await translateText(message.message_text, targetLanguage);
      const translatedText = result.translatedText || result.translated_text || '';
      
      setMessageTranslations(prev => ({
        ...prev,
        [messageId]: { text: translatedText, lang: targetLanguage, loading: false }
      }));
    } catch (error) {
      console.error('Translation error:', error);
      showError('Translation failed. Please try again.');
      // Remove the translation entry on error
      setMessageTranslations(prev => {
        const newTranslations = { ...prev };
        delete newTranslations[messageId];
        return newTranslations;
      });
    }
  };

  // Clear translation for a message (show original)
  const handleShowOriginal = (messageId) => {
    setMessageTranslations(prev => {
      const newTranslations = { ...prev };
      delete newTranslations[messageId];
      return newTranslations;
    });
  };

  // Get default translation language from settings
  const getDefaultTranslationLanguage = () => {
    return localStorage.getItem("defaultTranslationLanguage") || "en";
  };

  // Get context menu items based on message ownership
  const getMessageContextMenuItems = (message) => {
    const isOwn = message?.sender_id === userId;
    const hasTranslation = messageTranslations[message?.message_id];
    const defaultLang = getDefaultTranslationLanguage();
    
    const items = [
      {
        id: "select",
        label: "Select",
        icon: <Check size={16} />,
        onClick: () => handleMessageSelection(message.message_id, isOwn),
      },
      {
        id: "copy",
        label: "Copy",
        icon: <Copy size={16} />,
        onClick: handleCopyMessage,
        disabled: !message?.message_text,
      },
    ];

    // Add translation options based on whether message already has translation
    if (hasTranslation) {
      items.push({
        id: "show-original",
        label: "Show Original",
        icon: <Languages size={16} />,
        onClick: () => {
          handleShowOriginal(message.message_id);
          messageContextMenu.closeMenu();
        },
      });
    } else {
      items.push({
        id: "translate-default",
        label: `Translate (${defaultLang.toUpperCase()})`,
        icon: <Languages size={16} />,
        onClick: () => {
          handleTranslateMessage(message, defaultLang);
          messageContextMenu.closeMenu();
        },
        disabled: !message?.message_text,
      });
      items.push({
        id: "translate-to",
        label: "Translate to...",
        icon: <Languages size={16} />,
        onClick: () => {
          setTranslateMessage(message);
          setShowTranslator(true);
          messageContextMenu.closeMenu();
        },
        disabled: !message?.message_text,
      });
    }

    items.push(
      {
        id: "reply",
        label: "Reply",
        icon: <Reply size={16} />,
        onClick: handleReplyMessage,
      },
      {
        id: "forward",
        label: "Forward",
        icon: <Forward size={16} />,
        onClick: handleForwardMessage,
      },
      {
        id: "delete",
        label: "Delete",
        icon: <Trash2 size={16} />,
        color: "danger",
        onClick: handleDeleteMessage,
      }
    );

    // Only show delete for all option for own messages or admins
    if (isOwn || chatInfo.is_admin) {
      items.push({ id: "divider", divider: true });
      items.push({
        id: "delete-for-all",
        label: "Delete For All",
        icon: <Trash2 size={16} />,
        color: "danger",
        onClick: handleDeleteMessageForAll,
      });
    }

    return items;
  };

  // Handle context menu for sent messages (adjust position to prevent off-screen)
  const handleSentMessageContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Get the menu width (approximately 280px based on ContextMenu.css)
    const menuWidth = 280;
    const menuHeight = 400;

    let x = e.clientX;
    let y = e.clientY;

    // Adjust x position if menu would go off right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 16; // 16px margin
    }

    // Adjust y position if menu would go off bottom
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 16; // 16px margin
    }

    // Update menu state with adjusted position
    messageContextMenu.setMenu({ isOpen: true, x, y });
  };

  // Handle context menu for received messages (normal positioning)
  const handleReceivedMessageContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    let x = e.clientX;
    let y = e.clientY;

    const menuWidth = 280;
    const menuHeight = 400;

    // Adjust if goes off right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 16;
    }

    // Adjust if goes off bottom
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 16;
    }

    messageContextMenu.setMenu({ isOpen: true, x, y });
  };

  // Header context menu handlers
  const handleSearchChat = () => {
    // showSuccess('Search functionality - To be implemented');
  };

  const handleClearChat = () => {
    if (
      window.confirm(
        "Are you sure you want to clear this chat? This action cannot be undone."
      )
    ) {
      // TODO: Implement clear chat API call
      showSuccess("Chat cleared successfully");
    }
  };

  const handleViewContactOrGroupInfo = () => {
    setShowChatInfoModal(true);
  };

  const handleBlockUser = async () => {
    if (chatInfo.chat_type !== "private") return;

    // chatInfo uses camelCase otherUserId
    const otherUserId = chatInfo.otherUserId;
    if (!otherUserId) return;

    if (
      window.confirm(
        "Are you sure you want to block this user? They will not be able to send you messages."
      )
    ) {
      try {
        await blockUser(otherUserId);
        showSuccess("User blocked successfully");
        setIsBlocked(true);
        setTimeout(() => navigate("/chats"), 1500);
      } catch (err) {
        console.error("Error blocking user:", err);
        showError("Failed to block user");
      }
    }
  };

  const handleUnblockUser = async () => {
    if (chatInfo.chat_type !== "private") return;

    const otherUserId = chatInfo.otherUserId;
    if (!otherUserId) return;

    if (
      window.confirm(
        "Are you sure you want to unblock this user? They will be able to send you messages again."
      )
    ) {
      try {
        await unblockUser(otherUserId);
        showSuccess("User unblocked successfully");
        setIsBlocked(false);
      } catch (err) {
        console.error("Error unblocking user:", err);
        showError("Failed to unblock user");
      }
    }
  };

  const handleAddMember = () => {
    setShowAddMemberModal(true);
    setSearchAddMember("");
    setAddMemberResults([]);
  };

  // Search for users to add to group (excluding existing members)
  const searchUsersForAddMember = useCallback(
    async (query) => {
      if (!query.trim()) {
        setAddMemberResults([]);
        setAddMemberLoading(false);
        return;
      }

      try {
        const API_URL = (
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        ).replace(/\/+$/, "");
        const token = localStorage.getItem("accessToken");
        const res = await fetch(
          `${API_URL}/api/users/public/search?query=${encodeURIComponent(
            query
          )}&page=1&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          // Get existing member IDs
          const existingMemberIds =
            chatInfo.members?.map((m) => m.user_id) || [];

          // Filter out existing members and current user
          const usersWithPics = (data.users || [])
            .filter(
              (user) =>
                user.user_id !== userId &&
                !existingMemberIds.includes(user.user_id)
            )
            .map((user) => {
              if (user.profile_pic) {
                const filename = user.profile_pic.split("/uploads/").pop();
                user.profile_pic = `${API_URL}/uploads/profiles/${filename}`;
              }
              return user;
            });
          setAddMemberResults(usersWithPics);
        }
      } catch (err) {
        console.error("Error searching users:", err);
        showError("Error searching users");
      } finally {
        setAddMemberLoading(false);
      }
    },
    [chatInfo.members, userId]
  );

  // Debounce effect for add member search
  useEffect(() => {
    if (!searchAddMember.trim()) {
      setAddMemberResults([]);
      setAddMemberLoading(false);
      return;
    }

    setAddMemberLoading(true);
    const debounceTimer = setTimeout(() => {
      searchUsersForAddMember(searchAddMember);
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchAddMember, searchUsersForAddMember]);

  // Reset confirmation state when add member modal closes
  useEffect(() => {
    if (!showAddMemberModal) {
      setShowAddMemberConfirmation(false);
      setSelectedUserToAdd(null);
      setIsAddingMember(false);
    }
  }, [showAddMemberModal]);

  // Show confirmation before adding user to group
  const handleSelectUserToAddClick = (selectedUser) => {
    setSelectedUserToAdd(selectedUser);
    setShowAddMemberConfirmation(true);
  };

  // Handle selecting a user to add to group
  const handleSelectUserToAdd = async () => {
    if (!selectedUserToAdd) return;

    try {
      setIsAddingMember(true);
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");
      let token = localStorage.getItem("accessToken");

      // Add member to group
      let addMemberRes = await fetch(`${API_URL}/api/chats/${chatId}/members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: selectedUserToAdd.user_id,
        }),
      });

      // If unauthorized, try to refresh token
      if (addMemberRes.status === 401) {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          try {
            const refreshRes = await fetch(
              `${API_URL}/api/auth/refresh-token`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: String(refreshToken) }),
              }
            );
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              localStorage.setItem("accessToken", refreshData.accessToken);
              token = refreshData.accessToken;

              // Retry adding member with new token
              addMemberRes = await fetch(
                `${API_URL}/api/chats/${chatId}/members`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    user_id: selectedUserToAdd.user_id,
                  }),
                }
              );
            }
          } catch (refreshErr) {
            console.error("Token refresh failed:", refreshErr);
          }
        }
      }

      if (addMemberRes.ok) {
        showSuccess(
          `${
            selectedUserToAdd.full_name || selectedUserToAdd.username
          } added to group`
        );
        // Close modal and clear search
        setShowAddMemberModal(false);
        setShowAddMemberConfirmation(false);
        setSearchAddMember("");
        setAddMemberResults([]);
        setSelectedUserToAdd(null);
      } else {
        const errorData = await addMemberRes.json();
        showError(errorData.message || "Failed to add member");
      }
    } catch (err) {
      console.error("Error adding member:", err);
      showError("Failed to add member");
    }
  };

  const handleUpdateGroupInfo = () => {
    setShowUpdateGroupInfoModal(true);
  };

  const handleGroupInfoUpdateSuccess = (updatedChat) => {
    // Update chat info with new details
    setChatInfo((prev) => ({
      ...prev,
      name: updatedChat.chat_name || prev.name,
      chat_image: updatedChat.chat_image || null,
      description: updatedChat.chat_description || "",
    }));

    // Refetch chat image if available
    if (updatedChat.chat_image) {
      fetchChatImage(updatedChat.chat_image);
    }

    showSuccess("Group info updated successfully");
  };

  const handleExitGroup = async () => {
    if (chatInfo.chat_type !== "group") return;

    if (window.confirm("Are you sure you want to exit this group?")) {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await fetch(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:3001"
          }/api/chats/${chatId}/members/${userId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          showSuccess("Exited group successfully");
          setTimeout(() => navigate("/chats"), 1500);
        } else {
          showError("Failed to exit group");
        }
      } catch (err) {
        console.error("Error exiting group:", err);
        showError("Failed to exit group");
      }
    }
  };

  // Generate header context menu items based on chat type
  const getHeaderMenuItems = () => {
    const items = [
      {
        id: "search",
        label: "Search",
        icon: <Search size={16} />,
        onClick: (e) => {
          // e.preventDefault();
          // e.stopPropagation();
          setShowSearch(!showSearch);
        },
      },
      {
        id: "summary",
        label: "Summarize Chat",
        icon: <FileText size={16} />,
        onClick: () => setShowSummary(true),
      },
      {
        id: "clear",
        label: "Clear Chat",
        icon: <Eraser size={16} />,
        onClick: handleClearChat,
      },
      { id: "divider1", divider: true },
    ];

    if (chatInfo.chat_type === "private") {
      items.push({
        id: "view-contact",
        label: "View Contact",
        icon: <UserCheck size={16} />,
        onClick: handleViewContactOrGroupInfo,
      });
      
      // Show Block or Unblock based on current status
      if (isBlocked && !isBlockedByOther) {
        // User has blocked the other person - show unblock option
        items.push({
          id: "unblock",
          label: "Unblock User",
          icon: <Ban size={16} />,
          color: "success",
          onClick: handleUnblockUser,
        });
      } else if (!isBlocked) {
        // Not blocked - show block option
        items.push({
          id: "block",
          label: "Block User",
          icon: <Ban size={16} />,
          color: "danger",
          onClick: handleBlockUser,
        });
      }
    } else if (chatInfo.chat_type === "group") {
      items.push({
        id: "view-info",
        label: "View Group Info",
        icon: <Users size={16} />,
        onClick: handleViewContactOrGroupInfo,
      });

      // Show add member only to group admin
      if (chatInfo.is_admin) {
        items.push({
          id: "add-member",
          label: "Add Member",
          icon: <UserPlus size={16} />,
          onClick: handleAddMember,
        });
        items.push({
          id: "update-info",
          label: "Update Group Info",
          icon: <Users size={16} />,
          onClick: handleUpdateGroupInfo,
        });
      }

      items.push(
        { id: "divider2", divider: true },
        {
          id: "exit",
          label: "Exit Group",
          icon: <LogOut size={16} />,
          color: "danger",
          onClick: handleExitGroup,
        }
      );
    }

    return items;
  };

  const handleAttachment = (type) => {
    setShowAttachMenu(false);

    if (type === "Image") {
      fileInputRef.current.accept = "image/*";
    } else if (type === "File") {
      fileInputRef.current.accept = "*/*";
    }

    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size exceeds 50MB limit");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Store file for later sending
    setSelectedFile(file);
    setShowFilePreview(true);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setShowFilePreview(false);
  };

  const handleSendWithAttachment = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Generate temporary ID for tracking the message
      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Initialize upload progress tracking for this message
      setUploadingMessages(prev => ({
        ...prev,
        [tempId]: { progress: 0, fileName: selectedFile.name, fileSize: selectedFile.size }
      }));

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64File = reader.result.split(",")[1]; // Get only the base64 part

        // Update progress to show file read is complete (10%)
        setUploadingMessages(prev => ({
          ...prev,
          [tempId]: { ...prev[tempId], progress: 10 }
        }));
        setUploadProgress(10);

        // Prepare file message data
        const fileMessageData = {
          chat_id: parseInt(chatId),
          message_text: messageText.trim() || "",
          fileBuffer: base64File,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          tempId: tempId,
        };

        // Add optimistic message to UI immediately with uploading flag
        const optimisticMessage = {
          message_id: tempId,
          tempId: tempId,
          isOptimistic: true,
          isUploading: true,
          sender_id: userId,
          message_text: fileMessageData.message_text,
          chat_id: parseInt(chatId),
          attachments: [
            {
              file_url: "",
              fileName: selectedFile.name,
              file_name: selectedFile.name,
              fileSize: selectedFile.size,
              file_size: selectedFile.size,
              fileType: selectedFile.type,
              file_type: selectedFile.type,
              original_filename: selectedFile.name,
            },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_read: false,
          deleted_at: null,
        };

        setMessages((prevMessages) => [...prevMessages, optimisticMessage]);

        // Progress callback for upload tracking
        const onProgress = (progress) => {
          // Scale progress: 10% is file read, 10-100% is upload
          const scaledProgress = 10 + (progress * 0.9);
          setUploadingMessages(prev => ({
            ...prev,
            [tempId]: { ...prev[tempId], progress: scaledProgress }
          }));
          setUploadProgress(scaledProgress);
        };

        // Send via WebSocket with progress callback
        socketService.sendFileMessage(fileMessageData, onProgress);

        // Clear input states after sending (but keep uploading state until complete)
        setSelectedFile(null);
        setShowFilePreview(false);
        setMessageText("");
      };

      reader.onerror = () => {
        setUploading(false);
        setUploadProgress(0);
        setUploadingMessages(prev => {
          const newState = { ...prev };
          delete newState[tempId];
          return newState;
        });
        throw new Error("Failed to read file");
      };

      reader.readAsDataURL(selectedFile);
    } catch (err) {
      console.error("❌ File upload error:", err);

      // Parse error message for better user feedback
      let errorMessage = "File upload failed";
      const errorStr = err.message || err.toString();

      if (errorStr.includes("read file")) {
        errorMessage = "Failed to read file";
      } else if (errorStr.includes("not supported")) {
        errorMessage = "File type not supported";
      } else if (
        errorStr.includes("too large") ||
        errorStr.includes("exceeds")
      ) {
        errorMessage = "File is too large";
      } else {
        errorMessage = errorStr;
      }

      // Remove the selected file and close preview
      setSelectedFile(null);
      setShowFilePreview(false);
      setUploading(false);
      setUploadProgress(0);

      // Show error toast
      showError(errorMessage, 4000);
    }
  };

  const handleMessageAction = (action, messageId) => {
    setShowMessageMenu(null);
    switch (action) {
      case "delete-me":
        alert("Delete for me - Connect to your backend");
        break;
      case "delete-all":
        alert("Delete for everyone - Connect to your backend");
        break;
      case "mark-read":
        alert("Mark as read - Connect to your backend");
        break;
      default:
        break;
    }
  };

  const renderMessageStatus = (status) => {
    switch (status) {
      case "sent":
        return <Check size={16} className="status-icon" />;
      case "delivered":
        return <CheckCheck size={16} className="status-icon" />;
      case "read":
        return <CheckCheck size={16} className="status-icon read" />;
      default:
        return null;
    }
  };

  // Get initials from display name
  const getInitials = (name) => {
    if (!name) return "💬";
    const words = name.trim().split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Helper function to get referenced message from messages array
  const getReferencedMessage = (referencedMessageId) => {
    if (!referencedMessageId) return null;
    return messages.find((msg) => msg.message_id === referencedMessageId);
  };

  const handleMessageSelection = (message_id, isOwn) => {
    if (!message_id) return;
    const id = message_id;

    setSelectedMessages((prevItems) => {
      const newSelectedMessages = {
        ...prevItems,
        [id]: !prevItems[id],
      };

      setSelectedOwnMessage(true);

      // Calculate the actual count of selected items
      const selectedCount =
        Object.values(newSelectedMessages).filter(Boolean).length;

      // Update messageSelection based on count
      setMessageSelection(selectedCount > 0);

      if (!isOwn) setSelectedOwnMessage(false);

      return newSelectedMessages;
    });
  };

  const clearAllSelection = async () => {
    setSelectedMessages((prev) =>
      Object.fromEntries(Object.keys(prev).map((key) => [key, false]))
    );
    setMessageSelection(false);
  };

  const addEmoji = (emoji) => {
    setMessageText((prev) => prev + emoji.native); // insert emoji directly
  };

  return (
    <div className="chat-window">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div className="chat-window-header" ref={headerRef}>
        {!isEmbedded && (
          <button className="back-btn" onClick={() => navigate("/chats")}>
            <ArrowLeft size={24} />
          </button>
        )}
        <div
          className="header-info"
          onClick={handleShowChatInfo}
          style={{ cursor: "pointer" }}
        >
          {chatInfo.otherUserId &&
          userProfiles[chatInfo.otherUserId]?.profile_pic ? (
            <div className="chat-avatar-small" style={{ position: "relative" }}>
              <img
                src={userProfiles[chatInfo.otherUserId].profile_pic}
                alt="profile"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
              {chatInfo.is_online && chatInfo.chat_type === "private" && (
                <span className="online-dot"></span>
              )}
            </div>
          ) : chatInfo.chat_type === "group" && chatImageUrl ? (
            <div className="chat-avatar-small" style={{ position: "relative" }}>
              <img
                src={chatImageUrl}
                alt="group"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            </div>
          ) : (
            <div className="chat-avatar-small">
              <span style={{ fontSize: "16px", fontWeight: "600" }}>
                {chatInfo.chat_type === "private"
                  ? getInitials(chatInfo.name)
                  : "💬"}
              </span>
              {chatInfo.is_online && chatInfo.chat_type === "private" && (
                <span className="online-dot"></span>
              )}
            </div>
          )}
          <div className="header-text">
            <h2>{chatInfo.name}</h2>
            {chatInfo.chat_type === "private" && (
              <span className="status-text">
                {chatInfo.is_online
                  ? "Online"
                  : chatInfo.last_seen
                  ? `Last seen ${formatLastSeen(chatInfo.last_seen)}`
                  : "Offline"}
              </span>
            )}
          </div>
        </div>

        {messageSelection ? (
          <>
            <button
              className="header-delete-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSearch(!showSearch);
              }}
            >
              <Trash2 size={24} />
            </button>

            <button
              className="header-forward-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSearch(!showSearch);
              }}
            >
              <Forward size={24} />
            </button>

            <button
              className="header-clear-selection-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearAllSelection();
              }}
            >
              <X size={24} />
            </button>
          </>
        ) : (
          <>
            <button
              ref={setHeaderSearchBtn}
              className="header-search-button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSearch(!showSearch);
              }}
            >
              <Search size={24} />
            </button>

            <button
              ref={setHeaderMenuBtn}
              className="header-more-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                // Get button position
                const rect = e.currentTarget.getBoundingClientRect();
                const menuWidth = 200;
                const menuHeight = 300;

                // Position menu aligned to the right edge of the button
                let x = rect.right - menuWidth; // Align right edge of menu with right edge of button
                let y = rect.bottom + 4; // 4px below the button

                // Adjust x if menu would go off left edge
                if (x < 8) {
                  x = 8;
                }

                // Adjust y if menu would go off bottom
                if (y + menuHeight > window.innerHeight) {
                  y = rect.top - menuHeight - 4; // Position above button instead
                }

                headerContextMenu.setMenu({ isOpen: true, x, y });
              }}
            >
              <MoreVertical size={24} />
            </button>
          </>
        )}
      </div>

      {/* Search Box */}
      {showSearch && (
        <div className="search-box-container">
          <div className="search-box-wrapper">
            <div className="search-input-wrapper">
              {/* <Search size={18} className="search-icon" /> */}
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="search-clear-btn"
                  type="button"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="search-results-info">
                <span className="search-counter">
                  {currentResultIndex + 1} / {searchResults.length}
                </span>
                <button
                  onClick={handlePrevResult}
                  className="search-nav-btn search-prev-btn"
                  type="button"
                  title="Previous result"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  onClick={handleNextResult}
                  className="search-nav-btn search-next-btn"
                  type="button"
                  title="Next result"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            )}

            {!searchQuery && (
              <button
                onClick={handleCloseSearch}
                className="search-close-btn"
                type="button"
                title="Close search"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {searchQuery && searchResults.length === 0 && (
            <p className="search-no-results">No messages found</p>
          )}
        </div>
      )}

      <SimpleBar
        style={{ flex: 1, minHeight: 0, width: "100%" }}
        autoHide={false}
      >
        <div className="messages-container">
          {loading ? (
            <div className="no-chats">
              <p>Loading messages...</p>
            </div>
          ) : error ? (
            <div className="no-chats">
              <p>{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="no-chats">
              <p>No messages yet</p>
            </div>
          ) : (
            messages.map((message) => {
              // Handle system messages (member added, removed, etc.)
              if (message.isSystem || message.message_type === "system") {
                return (
                  <SystemMessage
                    key={message.message_id}
                    type={message.type || "info"}
                    message={message.message_text}
                    timestamp={message.created_at}
                    icon={
                      message.type === "member_added" ? UserPlus : undefined
                    }
                  />
                );
              }

              const isSelf = message.sender_id === userId;
              const isGroup = chatInfo.chat_type === "group";
              // For self messages, align right and do not show avatar or sender name
              if (isSelf) {
                return (
                  <>
                    <div
                      key={message.message_id}
                      className={`message message-sent ${
                        isCurrentResult(message.message_id)
                          ? "search-result-current"
                          : ""
                      } ${
                        selectedMessages[message.message_id] ? "selection" : ""
                      }`}
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginBottom: 8,
                      }}
                      ref={(el) => {
                        if (el) messageRefs.current[message.message_id] = el;
                      }}
                      onClick={() => {
                        if (messageSelection)
                          handleMessageSelection(message.message_id, true);
                      }}
                      onContextMenu={(e) => {
                        setSelectedMessage(message);
                        handleSentMessageContextMenu(e);
                      }}
                      onTouchStart={() => {
                        setSelectedMessage(message);
                      }}
                      onTouchEnd={(e) => {
                        messageContextMenu.handleLongPress(e, 500);
                      }}
                    >
                      <button
                        className="message_sent_reply_btn"
                        onClick={() => {
                          handleReplyMessage(message);
                        }}
                      >
                        <Reply size={16} />
                      </button>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          maxWidth: "80%",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {message.attachments &&
                          message.attachments.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 0,
                              }}
                            >
                              {message.attachments.map((att, idx) => (
                                <AttachmentPreview
                                  key={
                                    (att.file_url ||
                                      att.fileUrl ||
                                      att.url ||
                                      idx) + idx
                                  }
                                  attachment={att}
                                  isUploading={message.isUploading && !att.file_url}
                                  uploadProgress={uploadingMessages[message.tempId]?.progress || 0}
                                />
                              ))}
                            </div>
                          )}
                        {message.message_text && (
                          <div className="message-bubble">
                            {message.is_reply &&
                              message.referenced_message_id && (
                                <div className="message-reply-reference">
                                  {(() => {
                                    const refMsg = getReferencedMessage(
                                      message.referenced_message_id
                                    );
                                    if (!refMsg) {
                                      return (
                                        <div className="reply-ref-deleted">
                                          <span className="reply-ref-sender">
                                            Deleted message
                                          </span>
                                        </div>
                                      );
                                    }
                                    return (
                                      <>
                                        <div className="reply-ref-sender">
                                          {refMsg.sender?.full_name ||
                                            refMsg.sender?.username ||
                                            "Unknown"}
                                        </div>
                                        <div className="reply-ref-text">
                                          {refMsg.message_text?.substring(
                                            0,
                                            80
                                          ) || "[Attachment]"}
                                          {refMsg.message_text?.length > 80
                                            ? "..."
                                            : ""}
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            <p className="message-text">
                              {showSearch && searchQuery
                                ? highlightText(
                                    message.message_text,
                                    searchQuery
                                  )
                                : message.message_text}
                            </p>
                            {/* Inline Translation */}
                            {messageTranslations[message.message_id] && (
                              <div className="message-translation">
                                {messageTranslations[message.message_id].loading ? (
                                  <div className="translation-loading">
                                    <Loader size={14} className="spinning" />
                                    <span>Translating...</span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="translation-header">
                                      <Languages size={12} />
                                      <span>Translated to {messageTranslations[message.message_id].lang.toUpperCase()}</span>
                                      <button 
                                        className="show-original-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleShowOriginal(message.message_id);
                                        }}
                                      >
                                        Hide
                                      </button>
                                    </div>
                                    <p className="translation-text">
                                      {messageTranslations[message.message_id].text}
                                    </p>
                                  </>
                                )}
                              </div>
                            )}
                            <div className="message-meta">
                              <span className="message-time">
                                {formatMessageTime(message.created_at)}
                              </span>
                              <MessageStatusIndicator
                                messageId={message.message_id}
                                statuses={messageStatuses[message.message_id]}
                                currentUserId={userId}
                              />
                            </div>
                          </div>
                        )}
                        {!message.message_text && !message.attachments && (
                          <div className="message-bubble">
                            <p className="message-text">Empty message</p>
                            <div className="message-meta">
                              <span className="message-time">
                                {formatMessageTime(message.created_at)}
                              </span>
                              <MessageStatusIndicator
                                messageId={message.message_id}
                                statuses={messageStatuses[message.message_id]}
                                currentUserId={userId}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              }
              // For messages from others, align left, show avatar and sender name in group chat
              return (
                <>
                  <div
                    key={message.message_id}
                    className={`message message-received ${
                      isCurrentResult(message.message_id)
                        ? "search-result-current"
                        : ""
                    } ${
                      selectedMessages[message.message_id] ? "selection" : ""
                    }`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                    ref={(el) => {
                      if (el) messageRefs.current[message.message_id] = el;
                    }}
                    onClick={() => {
                      if (messageSelection)
                        handleMessageSelection(message.message_id, false);
                    }}
                    onContextMenu={(e) => {
                      setSelectedMessage(message);
                      handleReceivedMessageContextMenu(e);
                    }}
                    onTouchStart={() => {
                      setSelectedMessage(message);
                    }}
                    onTouchEnd={(e) => {
                      messageContextMenu.handleLongPress(e, 500);
                    }}
                  >
                    {isGroup && (
                      <img
                        src={
                          message.sender_id &&
                          userProfiles[message.sender_id]?.profile_pic
                            ? userProfiles[message.sender_id].profile_pic
                            : message.sender?.profile_picture_url ||
                              "https://ui-avatars.com/api/?name=" +
                                (message.sender?.full_name ||
                                  message.sender?.username ||
                                  "User")
                        }
                        alt="profile"
                        className="message-avatar"
                        onClick={() => handleShowUserProfile(message.sender_id)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          objectFit: "cover",
                          marginRight: 8,
                          marginTop: 2,
                          background: "#eee",
                          flexShrink: 0,
                          cursor: "pointer",
                        }}
                      />
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        maxWidth: "70%",
                      }}
                    >
                      {message.attachments &&
                        message.attachments.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 0,
                            }}
                          >
                            {message.attachments.map((att, idx) => (
                              <AttachmentPreview
                                key={
                                  (att.file_url ||
                                    att.fileUrl ||
                                    att.url ||
                                    idx) + idx
                                }
                                attachment={att}
                              />
                            ))}
                          </div>
                        )}
                      {message.message_text && (
                        <div className="message-bubble">
                          {isGroup && (
                            <div
                              className="message-sender clickable"
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: "var(--sender-name-color, #1976d2)",
                                marginBottom: 2,
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                /* Placeholder for future action */
                              }}
                            >
                              {message.sender_id &&
                              userProfiles[message.sender_id]?.full_name
                                ? userProfiles[message.sender_id].full_name
                                : message.sender?.full_name ||
                                  message.sender?.username ||
                                  "Unknown User"}
                            </div>
                          )}
                          {message.is_reply &&
                            message.referenced_message_id && (
                              <div className="message-reply-reference">
                                {(() => {
                                  const refMsg = getReferencedMessage(
                                    message.referenced_message_id
                                  );
                                  if (!refMsg) {
                                    return (
                                      <div className="reply-ref-deleted">
                                        <span className="reply-ref-sender">
                                          Deleted message
                                        </span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <>
                                      <div className="reply-ref-sender">
                                        {refMsg.sender?.full_name ||
                                          refMsg.sender?.username ||
                                          "Unknown"}
                                      </div>
                                      <div className="reply-ref-text">
                                        {refMsg.message_text?.substring(
                                          0,
                                          80
                                        ) || "[Attachment]"}
                                        {refMsg.message_text?.length > 80
                                          ? "..."
                                          : ""}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          <p className="message-text">
                            {showSearch && searchQuery
                              ? highlightText(message.message_text, searchQuery)
                              : message.message_text}
                          </p>
                          {/* Inline Translation */}
                          {messageTranslations[message.message_id] && (
                            <div className="message-translation">
                              {messageTranslations[message.message_id].loading ? (
                                <div className="translation-loading">
                                  <Loader size={14} className="spinning" />
                                  <span>Translating...</span>
                                </div>
                              ) : (
                                <>
                                  <div className="translation-header">
                                    <Languages size={12} />
                                    <span>Translated to {messageTranslations[message.message_id].lang.toUpperCase()}</span>
                                    <button 
                                      className="show-original-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleShowOriginal(message.message_id);
                                      }}
                                    >
                                      Hide
                                    </button>
                                  </div>
                                  <p className="translation-text">
                                    {messageTranslations[message.message_id].text}
                                  </p>
                                </>
                              )}
                            </div>
                          )}
                          <div className="message-meta">
                            <span className="message-time">
                              {formatMessageTime(message.created_at)}
                            </span>
                          </div>
                        </div>
                      )}
                      {!message.message_text &&
                        message.attachments &&
                        message.attachments.length > 0 && (
                          <div className="message-bubble">
                            {isGroup && (
                              <div
                                className="message-sender clickable"
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: "#555",
                                  marginBottom: 2,
                                  cursor: "pointer",
                                }}
                                onClick={() => {
                                  /* Placeholder for future action */
                                }}
                              >
                                {message.sender_id &&
                                userProfiles[message.sender_id]?.full_name
                                  ? userProfiles[message.sender_id].full_name
                                  : message.sender?.full_name ||
                                    message.sender?.username ||
                                    "Unknown User"}
                              </div>
                            )}
                            <div className="message-meta">
                              <span className="message-time">
                                {formatMessageTime(message.created_at)}
                              </span>
                            </div>
                          </div>
                        )}
                    </div>
                    <button
                      className="message_received_reply_btn"
                      onClick={() => {
                        handleReplyMessage(message);
                      }}
                    >
                      <Reply size={16} />
                    </button>
                  </div>

                  {/* <button className='message_received_reply_btn'>
                <Reply size={16} />
              </button> */}
                </>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </SimpleBar>

      {showEmoji && (
        <div
          style={{
            position: "absolute",
            bottom: "70px",
            right: "10px",
            zIndex: 1000,
          }}
        >
          <EmojiPicker onSelect={addEmoji} />
        </div>
      )}

      <div className="message-input-container" ref={inputContainerRef}>
        {isBlocked ? (
          <div className="blocked-user-notice">
            <Ban size={24} />
            <span>
              {isBlockedByOther
                ? "This user has blocked you."
                : "You have blocked this user."}{" "}
              Messages cannot be sent or received.
            </span>
          </div>
        ) : (
          <>
            {showAttachMenu && (
              <div className="attach-menu">
                <button
                  className="attach-option"
                  onClick={() => handleAttachment("Image")}
                  disabled={uploading}
                >
                  <Image size={24} />
                  <span>Image</span>
                </button>
                <button
                  className="attach-option"
                  onClick={() => handleAttachment("File")}
                  disabled={uploading}
                >
                  <File size={24} />
                  <span>File</span>
                </button>
              </div>
            )}

            {/* File Preview Section */}
            {showFilePreview && selectedFile && (
              <div className="file-preview-container">
                {isImageFile(selectedFile.name, selectedFile.type) ? (
                  // Image preview
                  <div className="file-preview-image">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt={selectedFile.name}
                    />
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={handleRemoveFile}
                      disabled={uploading}
                      title="Remove file"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  // File card with logo
                  <div className="file-preview-card">
                    <div className="file-logo-wrapper">
                      <img
                        src={getFileLogo(selectedFile.name, selectedFile.type)}
                        alt={selectedFile.name}
                        className="file-logo"
                      />
                    </div>
                    <div className="file-card-info">
                      <div className="file-name" title={selectedFile.name}>
                        {selectedFile.name}
                      </div>
                      <div className="file-size">
                        {formatFileSize(selectedFile.size)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="remove-file-btn-card"
                      onClick={handleRemoveFile}
                      disabled={uploading}
                      title="Remove file"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Upload Progress Bar */}
            {uploading && (
              <div className="upload-progress-container">
                <div className="upload-progress-bar">
                  <div
                    className="upload-progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="upload-progress-text">
                  <Loader
                    size={16}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  {Math.round(uploadProgress)}%
                </span>
              </div>
            )}

            {/* Reply Preview */}
            {replyToMessage && (
              <div className="reply-preview-container">
                <div className="reply-preview">
                  <div className="reply-preview-header">
                    <span className="reply-label">Replying to</span>
                    <button
                      type="button"
                      className="reply-cancel-btn"
                      onClick={() => setReplyToMessage(null)}
                      title="Cancel reply"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="reply-preview-content">
                    <div className="reply-sender-name">
                      {replyToMessage.sender?.full_name ||
                        replyToMessage.sender?.username ||
                        "Unknown"}
                    </div>
                    <div className="reply-message-text">
                      {replyToMessage.message_text?.substring(0, 100) ||
                        "[Attachment]"}
                      {replyToMessage.message_text?.length > 100 ? "..." : ""}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (selectedFile) {
                  handleSendWithAttachment();
                } else {
                  handleSendMessage(e);
                }
              }}
              className="message-input-form"
            >
              <button
                type="button"
                className="attach-btn"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                disabled={uploading || selectedFile !== null}
                title={
                  selectedFile
                    ? "Remove file first to select another"
                    : "Attach file"
                }
              >
                <Paperclip size={22} />
              </button>

              <input
                type="text"
                className="message-input"
                placeholder={
                  selectedFile ? "Add message (optional)" : "Type a message..."
                }
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  handleTyping();
                }}
                disabled={uploading}
              />

              <button
                type="button"
                className="emoji-btn"
                disabled={uploading}
                onClick={() => {
                  setShowEmoji(!showEmoji);
                  setShowSmartReplies(false);
                }}
              >
                <Smile size={22} />
              </button>

              <button
                type="button"
                className="ai-btn"
                onClick={() => {
                  setShowSmartReplies(!showSmartReplies);
                  setShowEmoji(false);
                }}
                disabled={uploading}
                title="Smart Replies"
              >
                <Sparkles size={22} />
              </button>

              <button
                type="submit"
                className="send-btn"
                disabled={uploading || (!messageText.trim() && !selectedFile)}
              >
                <Send size={22} />
              </button>
            </form>

            {/* Typing indicator */}
            {typingUsers.length > 0 && !selectedFile && (
              <TypingIndicator typingUsers={typingUsers} />
            )}

            {/* Smart Replies - inside input container, above the form */}
            {showSmartReplies && (
              <div ref={smartRepliesRef} className="smart-replies-wrapper">
                <SmartReplies
                  chatId={chatId}
                  onSelectReply={(reply) => {
                    setMessageText(reply);
                    setShowSmartReplies(false);
                  }}
                  disabled={uploading}
                />
              </div>
            )}

            {/* Conversation Starters - show when no messages */}
            {messages.length === 0 && !loading && (
              <div className="conversation-starters-wrapper">
                <ConversationStarters
                  chatId={chatId}
                  onSelectStarter={(starter) => {
                    setMessageText(starter);
                  }}
                  disabled={uploading}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat Info Modal */}
      <ChatInfoModal
        isOpen={showChatInfoModal}
        onClose={() => setShowChatInfoModal(false)}
        chatId={chatId}
        chatType={chatInfo.chat_type}
        otherUserId={chatInfo.otherUserId}
        onMemberClick={handleMemberClick}
      />

      {/* Update Group Info Modal */}
      <UpdateGroupInfoModal
        isOpen={showUpdateGroupInfoModal}
        onClose={() => setShowUpdateGroupInfoModal(false)}
        chatId={chatId}
        currentChatInfo={{
          name: chatInfo.name,
          description: chatInfo.description || "",
          chat_image: chatImageUrl || chatInfo.chat_image,
        }}
        onUpdateSuccess={handleGroupInfoUpdateSuccess}
      />

      {/* User Profile Modal */}
      <ChatInfoModal
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        chatId={null}
        chatType="private"
        otherUserId={selectedUserId}
      />

      {/* Message Context Menu */}
      <ContextMenu
        isOpen={messageContextMenu.isOpen}
        x={messageContextMenu.x}
        y={messageContextMenu.y}
        items={getMessageContextMenuItems(selectedMessage)}
        onClose={messageContextMenu.closeMenu}
      />

      {/* Header Context Menu */}
      <ContextMenu
        isOpen={headerContextMenu.isOpen}
        x={headerContextMenu.x}
        y={headerContextMenu.y}
        items={getHeaderMenuItems()}
        onClose={headerContextMenu.closeMenu}
      />

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddMemberModal(false)}
        >
          <div className="new-chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Member</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowAddMemberModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-search">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search by username..."
                value={searchAddMember}
                onChange={(e) => setSearchAddMember(e.target.value)}
                className="modal-search-input"
                autoFocus
              />
            </div>
            <div className="modal-results">
              {addMemberLoading ? (
                <p className="modal-message">Searching...</p>
              ) : searchAddMember && addMemberResults.length === 0 ? (
                <p className="modal-message">No users found</p>
              ) : addMemberResults.length > 0 ? (
                addMemberResults.map((user) => (
                  <div
                    key={user.user_id}
                    className="user-result-item"
                    onClick={() => handleSelectUserToAddClick(user)}
                  >
                    <div className="user-avatar">
                      {user.profile_pic ? (
                        <img
                          src={user.profile_pic}
                          alt="profile"
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span className="avatar-text">
                          {user.full_name
                            ? user.full_name.split(" ").length >= 2
                              ? (
                                  user.full_name.split(" ")[0][0] +
                                  user.full_name.split(" ")[
                                    user.full_name.split(" ").length - 1
                                  ][0]
                                ).toUpperCase()
                              : user.full_name.substring(0, 2).toUpperCase()
                            : user.username.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="user-info">
                      <h4>{user.full_name || user.username}</h4>
                      <p>@{user.username}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="modal-message">
                  Search for users to add to the group
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Member Confirmation */}
      <ConfirmationBox
        isOpen={showAddMemberConfirmation}
        title="Add Member"
        message={`Add ${
          selectedUserToAdd?.full_name || selectedUserToAdd?.username
        } to this group?`}
        confirmText="Add"
        cancelText="Cancel"
        isLoading={isAddingMember}
        onConfirm={handleSelectUserToAdd}
        onCancel={() => {
          setShowAddMemberConfirmation(false);
          setSelectedUserToAdd(null);
        }}
      />

      {/* AI Features Modals */}
      {/* Message Translator */}
      {showTranslator && translateMessage && (
        <MessageTranslator
          messageText={translateMessage.message_text}
          messageId={translateMessage.message_id}
          onClose={() => {
            setShowTranslator(false);
            setTranslateMessage(null);
          }}
          onTranslate={(msgId, translatedText, lang) => {
            setMessageTranslations(prev => ({
              ...prev,
              [msgId]: { text: translatedText, lang: lang, loading: false }
            }));
          }}
        />
      )}

      {/* Chat Summary */}
      {showSummary && (
        <ChatSummary chatId={chatId} onClose={() => setShowSummary(false)} />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default ChatWindow;
