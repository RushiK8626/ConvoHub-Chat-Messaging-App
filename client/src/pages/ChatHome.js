import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MessageCircle,
  X,
  Search,
  Plus,
  MoreVertical,
  Check,
  Pin,
  Trash2,
  LogOut,
  CircleCheckBig,
  BellOff,
  Archive,
  BookMarkedIcon,
  Sparkles,
} from "lucide-react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import BottomTabBar from "../components/BottomTabBar";
import ChatInfoModal from "../components/ChatInfoModal";
import ChatOptionsMenu from "../components/ChatOptionsMenu";
import CreateGroupModal from "../components/CreateGroupModal";
import ContextMenu from "../components/ContextMenu";
import ConfirmationBox from "../components/ConfirmationBox";
import ToastContainer from "../components/ToastContainer";
import { NotificationCenter } from "../components/NotificationCenter";
import useContextMenu from "../hooks/useContextMenu";
import { useToast } from "../hooks/useToast";
import useResponsive from "../hooks/useResponsive";
import ChatWindow from "./ChatWindow";
import { formatChatPreviewTime } from "../utils/dateUtils";
import socketService from "../utils/socket";
import {
  getSidebarWidth,
  setSidebarWidth,
  SIDEBAR_CONFIG,
} from "../utils/sidebarWidth";
import { handleSessionExpiry } from "../utils/auth";
import { AI_ASSISTANT } from '../utils/aiChatService';
import AIChatWindow from './AIChatWindow';
import "./ChatHome.css";

const ChatHome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, showToast, removeToast } = useToast();
  const isWideScreen = useResponsive();

  const [greeting, setGreeting] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  // Get userId from navigation state if present, or from localStorage user
  const userId =
    location.state?.userId ||
    JSON.parse(localStorage.getItem("user") || "{}").user_id;
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userProfiles, setUserProfiles] = useState({});
  const [chatImages, setChatImages] = useState({}); // Store blob URLs for chat images
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUserForNewChat, setSelectedUserForNewChat] = useState(null);
  const [showNewChatConfirmation, setShowNewChatConfirmation] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [showChatInfoModal, setShowChatInfoModal] = useState(false);
  const [selectedChatInfo, setSelectedChatInfo] = useState(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [selectedChats, setSelectedChats] = useState({});
  const [chatSelection, setChatSelection] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(
    () => location.state?.selectedChatId || null
  );
  
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    // Get saved width from shared storage or use default
    return getSidebarWidth();
  });

  // const [Members, setMembers] = useState(null);
  const containerRef = useRef(null);
  const isResizingRef = useRef(false);
  const headerRef = useRef(null);
  const bottomTabBarRef = useRef(null);
  const [chatListHeight, setChatListHeight] = useState("calc(100vh - 200px)");

  // Context menu for chats
  const chatContextMenu = useContextMenu();
  const [selectedChatForMenu, setSelectedChatForMenu] = useState(null);
  const [showAIChat, setShowAIChat] = useState(false);

  const [convohubAssistantEnabled, setConvohubAssistantEnabled] = useState(() => {
    const stored = localStorage.getItem('convhub_assistant');
    return stored === null ? true : stored === 'true';
  });

  // Listen for changes to the assistant setting from other components/tabs
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('convhub_assistant');
      setConvohubAssistantEnabled(stored === null ? true : stored === 'true');
    };

    // Listen for storage events (from other tabs) and custom events (same tab)
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('convhub_assistant_changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('convhub_assistant_changed', handleStorageChange);
    };
  }, []);


  // Calculate chat list height dynamically
  useEffect(() => {
    const calculateHeight = () => {
      const headerHeight = headerRef.current?.offsetHeight || 0;
      const bottomTabHeight = bottomTabBarRef.current?.offsetHeight || 0;
      const totalOffset = headerHeight + bottomTabHeight + 20; // 20px for padding/margin
      setChatListHeight(`calc(100vh - ${totalOffset}px)`);
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);
    return () => window.removeEventListener("resize", calculateHeight);
  }, [chatSelection, showNewChatModal]);

  // Helper function to sort chats by last message timestamp (newest first)
  const sortChatsByTimestamp = (chatsToSort) => {
    return [...chatsToSort].sort((a, b) => {
      if (a.pinned == b.pinned) {
        const timeA = new Date(
          a.last_message_timestamp || a.created_at || 0
        ).getTime();
        const timeB = new Date(
          b.last_message_timestamp || b.created_at || 0
        ).getTime();
        return timeB - timeA; // Descending order (newest first)
      }
      return a.pinned ? -1 : 1;
    });
  };

  // Function to fetch user profile by user_id
  const fetchUserProfile = async (otherUserId) => {
    if (userProfiles[otherUserId] || otherUserId === userId) return;
    try {
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/users/public/id/${otherUserId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error("Received non-JSON response for user profile");
          return;
        }
        const data = await res.json();
        const userData = data.user;

        // Convert profile_pic to full URL if it exists
        if (userData.profile_pic) {
          // Extract filename from path like /uploads/25002-xxx.jpg
          const filename = userData.profile_pic.split("/uploads/").pop();
          userData.profile_pic = `${API_URL}/uploads/profiles/${filename}`;
        }

        setUserProfiles((prev) => ({
          ...prev,
          [otherUserId]: userData,
        }));
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  // Function to fetch chat image with token
  const fetchChatImage = async (chatId, imagePath) => {
    if (chatImages[chatId] || !imagePath) return;
    try {
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");
      const token = localStorage.getItem("accessToken");
      const filename = imagePath.split("/uploads/").pop();
      const res = await fetch(`${API_URL}/uploads/chat-images/${filename}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        setChatImages((prev) => ({
          ...prev,
          [chatId]: blobUrl,
        }));
      }
    } catch (err) {
      console.error("Error fetching chat image:", err);
    }
  };

  const renderChatList = () => {
    const aiChat = {
      chat_id: 'ai-assistant',
      chat_type: 'ai',
      chat_name: AI_ASSISTANT.name,
      isAI: true,
      last_message: 'Ask me anything!',
      unread_count: 0,
    };
    
    return [aiChat, ...chats]; // Prepend AI chat
  };

  useEffect(() => {
    const fetchChats = async (retry = false) => {
      if (!userId) {
        setError("User ID not found.");
        setLoading(false);
        return;
      }
      try {
        const API_URL = (
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        ).replace(/\/+$/, "");
        const token = localStorage.getItem("accessToken");
        const res = await fetch(
          `${API_URL}/api/chat-visibility/active/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (res.status === 401 && !retry) {
          // Try to refresh token
          const refreshToken = localStorage.getItem("refreshToken");
          if (!refreshToken) {
            handleSessionExpiry();
            return;
          }
          try {
            const refreshRes = await fetch(
              `${API_URL}/api/auth/refresh-token`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: String(refreshToken) }),
              }
            );
            if (!refreshRes.ok) {
              handleSessionExpiry();
              return;
            }
            const contentType = refreshRes.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
              setError("Unable to connect to server. Please check your connection.");
              setLoading(false);
              return;
            }
            const refreshData = await refreshRes.json();
            localStorage.setItem("accessToken", refreshData.accessToken);
            // Retry fetching chats with new token
            await fetchChats(true);
            return;
          } catch (refreshErr) {
            handleSessionExpiry();
            return;
          }
        }
        if (!res.ok) {
          throw new Error("Failed to fetch chats");
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Unable to connect to server. Please check your connection.");
        }
        const data = await res.json();

        // Sort chats by last_message_timestamp (newest first)
        const sortedChats = sortChatsByTimestamp(data.chats || []);
        // Don't process chat images here, just set the chats with original paths
        setChats(sortedChats);

        setSelectedChats((prev) => ({
          ...prev,
          ...Object.fromEntries(
            sortedChats.map((item) => [item.chat_id, false])
          ),
        }));
      } catch (err) {
        console.error("Error fetching chats:", err);
        if (err.message && err.message.includes("Failed to fetch")) {
          setError("Unable to connect to server. Please check your connection.");
        } else {
          setError(err.message || "Error loading chats. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, [userId]);

  // Fetch user profiles for private chats
  useEffect(() => {
    chats.forEach((chat) => {
      if (chat.chat_type === "private" && Array.isArray(chat.members)) {
        const other = chat.members.find((m) => m.user_id !== userId);
        if (other && other.user_id) {
          fetchUserProfile(other.user_id);
        }
      } else if (chat.chat_type === "group" && chat.chat_image) {
        // Fetch group chat image with token
        fetchChatImage(chat.chat_id, chat.chat_image);
      }
    });
    // eslint-disable-next-line
  }, [chats]);

  // Create AI chat item to prepend to chat list
  const aiChatItem = {
    chat_id: 'ai-assistant',
    chat_type: 'ai',
    chat_name: AI_ASSISTANT.name,
    isAI: true,
    last_message: { preview_text: 'Ask me anything!' },
    unread_count: 0,
  };

  // Filter chats including AI chat (only if enabled)
  const filteredChats = [
    ...(convohubAssistantEnabled ? [aiChatItem] : []),
    ...chats.filter((chat) =>
      (chat.chat_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
  ];

  // Close options menu when clicking outside
  useEffect(() => {
    if (!showOptionsMenu) return;

    const handleClickOutside = (e) => {
      const menu = document.querySelector(".chat-options-menu");
      const btn = document.querySelector(".new-chat-btn");
      if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
        setShowOptionsMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showOptionsMenu]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(chatImages).forEach((blobUrl) => {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      });
    };
  }, [chatImages]);

  // Socket.IO setup for real-time chat updates
  useEffect(() => {
    if (!userId) return;

    // Connect to socket
    socketService.connect(userId);

    // Listen for new messages to update chat previews
    const handleNewMessage = async (message) => {
      // Update chats locally - move chat with new message to top and update last message
      setChats((prevChats) => {
        // Find the chat this message belongs to
        const chatIndex = prevChats.findIndex(
          (chat) => chat.chat_id === message.chat_id
        );

        if (chatIndex !== -1) {
          // Chat exists - update it with the new message
          // Check if this message is already the last message (avoid duplicate updates)
          const existingChat = prevChats[chatIndex];
          if (existingChat.last_message?.message_id === message.message_id) {
            // Message already processed, skip update
            return prevChats;
          }

          // Increment unread count if message is not from current user and not currently selected
          let unreadCount = prevChats[chatIndex].unread_count || 0;
          if (
            message.sender_id !== userId &&
            parseInt(selectedChatId) !== parseInt(message.chat_id)
          ) {
            unreadCount += 1;
          }

          // Get the chat and update it with the new message info
          const updatedChat = {
            ...prevChats[chatIndex],
            last_message: {
              message_id: message.message_id,
              preview_text:
                message.message_text ||
                (message.attachments?.length ? "[Attachment]" : "Empty message"),
              sender: message.sender,
              has_attachment: !!(
                message.attachments && message.attachments.length
              ),
              created_at: message.created_at,
            },
            last_message_timestamp: message.created_at,
            sender_id: message.sender_id,
            unread_count: unreadCount,
          };

          // Remove the chat from its current position
          const chatsWithoutCurrent = prevChats.filter(
            (_, index) => index !== chatIndex
          );

          // Sort all chats by last_message_timestamp (newest first)
          const sortedChats = sortChatsByTimestamp([
            updatedChat,
            ...chatsWithoutCurrent,
          ]);

          return sortedChats;
        }

        // Chat not found - will fetch from server outside of setState
        return prevChats;
      });

      // Check if this is a new chat (not in current list) and fetch full details from server
      setChats((prevChats) => {
        const chatExists = prevChats.some((chat) => chat.chat_id === message.chat_id);
        if (!chatExists) {
          // Fetch full chat details from server (async, outside setState)
          fetchNewChatDetails(message.chat_id, message);
        }
        return prevChats;
      });
    };

    // Helper function to fetch new chat details from server
    const fetchNewChatDetails = async (chatId, message) => {
      try {
        const API_URL = (
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        ).replace(/\/+$/, "");
        const token = localStorage.getItem("accessToken");
        
        const res = await fetch(`${API_URL}/api/chats/${chatId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const data = await res.json();
          const chatFromServer = data.chat;

          // Build the new chat object with full member info
          const newChat = {
            chat_id: chatFromServer.chat_id,
            chat_name: chatFromServer.chat_name,
            chat_type: chatFromServer.chat_type,
            chat_image: chatFromServer.chat_image,
            members: chatFromServer.members || [],
            last_message: {
              message_id: message.message_id,
              preview_text:
                message.message_text ||
                (message.attachments?.length ? "[Attachment]" : "Empty message"),
              sender: message.sender,
              has_attachment: !!(message.attachments && message.attachments.length),
              created_at: message.created_at,
            },
            last_message_timestamp: message.created_at,
            sender_id: message.sender_id,
            created_at: chatFromServer.created_at,
            unread_count: message.sender_id !== userId ? 1 : 0,
          };

          // Add to chats list
          setChats((prevChats) => {
            // Double-check it doesn't exist already
            if (prevChats.some((c) => c.chat_id === chatId)) {
              return prevChats;
            }
            const sortedChats = sortChatsByTimestamp([newChat, ...prevChats]);
            return sortedChats;
          });

          // Join the chat room
          socketService.joinChat(chatId);

          // Fetch user profiles for private chat members
          if (chatFromServer.chat_type === "private" && chatFromServer.members) {
            chatFromServer.members.forEach((member) => {
              if (member.user_id !== userId) {
                fetchUserProfile(member.user_id);
              }
            });
          }
        }
      } catch (err) {
        console.error('Error fetching new chat details:', err);
      }
    };

    // Listen for user online/offline status to update chat list
    const handleUserOnline = ({ user_id }) => {
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.chat_type === "private" && chat.members) {
            const other = chat.members.find((m) => m.user_id !== userId);
            if (other && other.user_id === user_id) {
              return {
                ...chat,
                members: chat.members.map((m) =>
                  m.user_id === user_id ? { ...m, is_online: true } : m
                ),
              };
            }
          }
          return chat;
        })
      );
    };

    const handleUserOffline = ({ user_id, lastSeen }) => {
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.chat_type === "private" && chat.members) {
            const other = chat.members.find((m) => m.user_id !== userId);
            if (other && other.user_id === user_id) {
              return {
                ...chat,
                members: chat.members.map((m) =>
                  m.user_id === user_id
                    ? { ...m, is_online: false, last_seen: lastSeen }
                    : m
                ),
              };
            }
          }
          return chat;
        })
      );
    };

    // Handle being added to a group
    const handleAddedToGroup = ({
      chat_id,
      group_name,
      chat_image,
      message,
    }) => {
      // Create new group chat object
      const newGroupChat = {
        chat_id,
        chat_name: group_name,
        chat_type: "group",
        chat_image: chat_image || null,
        members: [], // Will be fetched on demand
        last_message: {
          message_id: null,
          preview_text: message,
          sender: "System",
          has_attachment: false,
          created_at: new Date().toISOString(),
        },
        last_message_timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        unread_count: 0,
      };

      // Add to top of chats list
      setChats((prevChats) => [newGroupChat, ...prevChats]);

      // Fetch group image if available
      if (chat_image) {
        fetchChatImage(chat_id, chat_image);
      }

      // Show toast notification
      showToast(`Added to group "${group_name}"`, "success");
    };

    // Handle being removed from a group
    const handleRemovedFromGroup = ({ chat_id, group_name, message }) => {
      // Remove the group chat from the list
      setChats((prevChats) => prevChats.filter((c) => c.chat_id !== chat_id));

      // If the removed chat was selected, deselect it
      if (parseInt(selectedChatId) === parseInt(chat_id)) {
        setSelectedChatId(null);
      }

      // Show toast notification
      showToast(message, "warning");
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.onUserOnline(handleUserOnline);
    socketService.onUserOffline(handleUserOffline);
    socketService.onAddedToGroup(handleAddedToGroup);
    socketService.onRemovedFromGroup(handleRemovedFromGroup);

    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off("new_message", handleNewMessage);
        socket.off("user_online", handleUserOnline);
        socket.off("user_offline", handleUserOffline);
        socket.off("you_were_added_to_group", handleAddedToGroup);
        socket.off("you_were_removed_from_group", handleRemovedFromGroup);
      }
    };
  }, [userId, selectedChatId, showToast, fetchChatImage]);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();

      if (hour >= 5 && hour < 12) {
        setGreeting("Good Morning 🌅");
      } else if (hour >= 12 && hour < 17) {
        setGreeting("Good Afternoon ☀️");
      } else if (hour >= 17 && hour < 21) {
        setGreeting("Good Evening 🌇");
      } else {
        setGreeting("Good Night 🌙");
      }
    };

    updateGreeting();

    // Optional: auto-update every hour
    const interval = setInterval(updateGreeting, 3600000);

    return () => clearInterval(interval);
  }, []);

  // Handle column resize
  useEffect(() => {
    const handleMouseDown = (e) => {
      // Only start resize if click is on the divider (right edge of left-panel)
      if (!containerRef.current) return;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const rightEdge = rect.left + leftPanelWidth;

      if (Math.abs(e.clientX - rightEdge) < 5) {
        // 5px tolerance for click area
        isResizingRef.current = true;
      }
    };

    const handleMouseMove = (e) => {
      if (!isResizingRef.current || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      let newWidth = e.clientX - rect.left;

      // Min width: 320px, Max width: 650px
      newWidth = Math.max(
        SIDEBAR_CONFIG.MIN_WIDTH,
        Math.min(newWidth, SIDEBAR_CONFIG.MAX_WIDTH)
      );
      setLeftPanelWidth(newWidth);
      // Save to shared storage
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
    };

    if (typeof window !== "undefined" && window.innerWidth >= 900) {
      document.addEventListener("mousedown", handleMouseDown);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousedown", handleMouseDown);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [leftPanelWidth]);

  const handleChatClick = (chatOrId) => {
    // Support both chat object and chat_id
    const chat = typeof chatOrId === 'object' ? chatOrId : filteredChats.find(c => c.chat_id === chatOrId);
    const isAI = chat?.isAI || chatOrId === 'ai-assistant';
    
    // On small screens, navigate to chat page or show AI modal. On wide screens, open inline.
    if (typeof window !== "undefined" && window.innerWidth < 900) {
      if (isAI) {
        navigate('/ai-chat');
      } else {
        navigate(`/chat/${chat?.chat_id || chatOrId}`);
        setShowAIChat(false);
      }
    } else {
      // Wide screen - show in right panel
      if (isAI) {
        setShowAIChat(true);
        setSelectedChatId(null);
      } else {
        console.log(JSON.stringify(chat));
        console.log(chatOrId);
        handleMarkAsRead(parseInt(chat?.chat_id || chatOrId));
        setShowAIChat(false);
        setSelectedChatId(chat?.chat_id || chatOrId);
      }
    }
  };

  // Keep selectedChatId in sync with URL when user navigates directly (on mobile or deep link)
  useEffect(() => {
    const path = location.pathname || "";
    const match = path.match(/\/chat\/(\d+)/);
    if (match && typeof window !== "undefined" && window.innerWidth < 900) {
      // Only sync on small screens - otherwise just set from URL
      setSelectedChatId(match[1]);
    }
  }, [location.pathname]);

  // Handle responsive layout changes - navigate to chat page when screen becomes narrow
  useEffect(() => {
    if (!isWideScreen && selectedChatId) {
      // Screen changed to narrow while a chat is open in split view
      // Navigate to full-page chat view
      navigate(`/chat/${selectedChatId}`);
    } else if (!isWideScreen && showAIChat) {
      // Screen changed to narrow while AI chat is open
      navigate('/ai-chat');
    }
  }, [isWideScreen, selectedChatId, showAIChat, navigate]);

  // Send greeting message when new chat is loaded
  useEffect(() => {
    const greetingChatId = sessionStorage.getItem("sendGreetingOnChatLoad");
    if (greetingChatId && selectedChatId === Number(greetingChatId)) {
      // Clear the flag
      sessionStorage.removeItem("sendGreetingOnChatLoad");
      // Send greeting with a small delay to ensure chat window is fully loaded
      const timer = setTimeout(() => {
        handleSendGreeting(selectedChatId, userId);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedChatId, userId]);

  const handleChatAvatarClick = (e, chat) => {
    e.stopPropagation(); // Prevent navigation to chat

    if (chat.chat_type === "group") {
      setSelectedChatInfo({
        chatId: chat.chat_id,
        chatType: "group",
        otherUserId: null,
      });
    } else if (chat.chat_type === "private") {
      const other = chat.members.find((m) => m.user_id !== userId);
      setSelectedChatInfo({
        chatId: chat.chat_id,
        chatType: "private",
        otherUserId: other?.user_id,
      });
    }

    setShowChatInfoModal(true);
  };

  const handleNewChat = () => {
    setShowOptionsMenu(!showOptionsMenu);
  };

  const handleNewChatWithUser = () => {
    setShowOptionsMenu(false);
    setShowNewChatModal(true);
    setSearchUsers("");
    setSearchResults([]);
  };

  const handleCreateNewGroup = () => {
    setShowOptionsMenu(false);
    setShowCreateGroupModal(true);
  };

  // Context menu handler
  const handleChatContextMenu = (e, chat) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedChatForMenu(chat);
    chatContextMenu.handleContextMenu(e);
  };

  const handleChatsSelection = (chat_id) => {
    if (!selectedChatForMenu && !chat_id) return;
    const id = chat_id || selectedChatForMenu.chat_id;

    setSelectedChats((prevItems) => {
      const newSelectedChats = {
        ...prevItems,
        [id]: !prevItems[id],
      };

      // Calculate the actual count of selected items
      const selectedCount =
        Object.values(newSelectedChats).filter(Boolean).length;

      // Update chatSelection based on count
      setChatSelection(selectedCount > 0);

      return newSelectedChats;
    });
  };

  // Mark chat as read
  const handleMarkAsRead = async (selectedChatId) => {
    if (!selectedChatForMenu && !selectedChatId) return;
    try {
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");
      const token = localStorage.getItem("accessToken");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = user.user_id;

      const chatId = selectedChatId || selectedChatForMenu.chat_id;

      const res = await fetch(
        `${API_URL}/api/messages/chat/${chatId}/read-all/${userId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        // Update local state
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.chat_id === chatId
              ? { ...c, unread_count: 0 }
              : c
          )
        );
      } else {
        showToast("Failed to mark messages as read", "error");
      }
    } catch (err) {
      console.error("Error marking chat as read:", err);
      showToast("Failed to mark messages as read", "error");
    }
  };

  // Pin chat
  const handlePinChat = async () => {
    if (!selectedChatForMenu) return;
    try {
      const isPinned =
        selectedChatForMenu.pinned || selectedChatForMenu.is_pinned;
      const action = isPinned ? "unpin" : "pin";
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");
      const token = localStorage.getItem("accessToken");
      const fullUrl = `${API_URL}/api/chat-visibility/${selectedChatForMenu.chat_id}/${action}`;

      const res = await fetch(fullUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        // Update local state
        const updated = chats.map((chat) =>
          chat.chat_id === selectedChatForMenu.chat_id
            ? { ...chat, pinned: !isPinned, is_pinned: !isPinned }
            : chat
        );

        setChats(sortChatsByTimestamp(updated));
        showToast(isPinned ? "Chat unpinned" : "Chat pinned", "success");
      } else {
        const errorText = await res.text();
        console.error("Backend error response:", errorText);
        showToast(`Failed to update pin status (${res.status})`, "error");
      }
    } catch (err) {
      console.error("Error pinning chat:", err);
      showToast("Error updating pin status", "error");
    }
  };

  // Delete chat
  const handleDeleteChat = async (chatIdParam) => {
    if (!selectedChatForMenu && !chatIdParam) return;

    const chatId = chatIdParam || selectedChatForMenu.chat_id;

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete this chat?`
    );
    if (!confirmed) return;

    try {
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");
      const token = localStorage.getItem("accessToken");

      const res = await fetch(`${API_URL}/api/chat-visibility/${chatId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        // Remove chat from local state
        setChats((prevChats) =>
          prevChats.filter((c) => c.chat_id !== chatId)
        );

        // If the deleted chat was selected, deselect it
        if (parseInt(selectedChatId) === parseInt(chatId)) {
          setSelectedChatId(null);
        }
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  // Exit group chat
  const handleExitGroupChat = async () => {
    if (!selectedChatForMenu) return;

    // Confirm exit
    const confirmed = window.confirm(
      "Are you sure you want to exit this group?"
    );
    if (!confirmed) return;

    try {
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");
      const token = localStorage.getItem("accessToken");

      const res = await fetch(
        `${API_URL}/api/chats/${selectedChatForMenu.chat_id}/exit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        // Remove chat from local state
        setChats((prevChats) =>
          prevChats.filter((c) => c.chat_id !== selectedChatForMenu.chat_id)
        );

        // If the exited chat was selected, deselect it
        if (parseInt(selectedChatId) === parseInt(selectedChatForMenu.chat_id)) {
          setSelectedChatId(null);
        }
      }
    } catch (err) {
      console.error("Error exiting group chat:", err);
    }
  };

  // Generate context menu items based on chat type
  const getContextMenuItems = (chat) => {
    const items = [
      {
        id: "select",
        label: "Select",
        icon: <Check size={16} />,
        onClick: handleChatsSelection,
      },
      {
        id: "mark-read",
        label: "Mark as Read",
        icon: <Check size={16} />,
        onClick: handleMarkAsRead,
      },
      {
        id: "pin",
        label: chat?.is_pinned || chat?.pinned ? "Unpin" : "Pin",
        icon: <Pin size={16} />,
        onClick: handlePinChat,
      },
      { id: "divider1", divider: true },
    ];

    // Different items for private vs group chats
    if (chat?.chat_type === "private") {
      items.push({
        id: "delete",
        label: "Delete",
        icon: <Trash2 size={16} />,
        color: "danger",
        onClick: handleDeleteChat,
      });
    } else if (chat?.chat_type === "group") {
      items.push({
        id: "exit",
        label: "Exit Group",
        icon: <LogOut size={16} />,
        color: "danger",
        onClick: handleExitGroupChat,
      });
    }

    return items;
  };

  const handleGroupCreated = async (newChatId) => {
    setShowCreateGroupModal(false);
    // Close the options menu if open
    setShowOptionsMenu(false);

    // Fetch the newly created group chat details to add to the list
    try {
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");
      const token = localStorage.getItem("accessToken");

      const res = await fetch(`${API_URL}/api/chats/${newChatId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const newChat = data.chat;

        // Add the new group chat to the beginning of the chats list
        setChats((prevChats) => [newChat, ...prevChats]);

        // Fetch group image if available
        if (newChat.chat_image) {
          fetchChatImage(newChat.chat_id, newChat.chat_image);
        }
      }
    } catch (err) {
      console.error("Error fetching newly created group:", err);
    }

    // On wide screens (desktop), open in split layout. On mobile, navigate to new page
    if (typeof window !== "undefined" && window.innerWidth >= 900) {
      setSelectedChatId(newChatId);
    } else {
      // Navigate to the new group chat on mobile
      navigate(`/chat/${newChatId}`);
    }
  };

  // Debounced search function
  const searchUsersAPI = useCallback(
    async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        setSearchLoading(false);
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
          // Process profile pics and filter out current user
          const usersWithPics = (data.users || [])
            .filter((user) => Number(user.user_id) !== Number(userId)) // Exclude current user
            .map((user) => {
              if (user.profile_pic) {
                const filename = user.profile_pic.split("/uploads/").pop();
                user.profile_pic = `${API_URL}/uploads/profiles/${filename}`;
              }
              return user;
            });
          setSearchResults(usersWithPics);
        }
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setSearchLoading(false);
      }
    },
    [userId]
  );

  // Debounce effect for search
  useEffect(() => {
    if (!searchUsers.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const debounceTimer = setTimeout(() => {
      searchUsersAPI(searchUsers);
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchUsers, searchUsersAPI]);

  // Reset confirmation state when new chat modal closes
  useEffect(() => {
    if (!showNewChatModal) {
      setShowNewChatConfirmation(false);
      setSelectedUserForNewChat(null);
      setIsCreatingChat(false);
    }
  }, [showNewChatModal]);

  const handleSearchUsers = (query) => {
    setSearchUsers(query);
  };

  // Show confirmation before creating new private chat
  const handleSelectUserClick = (selectedUser) => {
    setSelectedUserForNewChat(selectedUser);
    setShowNewChatConfirmation(true);
  };

  // Actual create private chat function
  const handleSelectUser = async () => {
    if (!selectedUserForNewChat) return;

    try {
      setIsCreatingChat(true);
      const API_URL = (
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");
      let token = localStorage.getItem("accessToken");

      // Ensure we have the correct user IDs
      const currentUserId = Number(userId);
      const otherUserId = Number(selectedUserForNewChat.user_id);

      // Create a new private chat
      let createChatRes = await fetch(`${API_URL}/api/chats/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_type: "private",
          member_ids: [currentUserId, otherUserId],
        }),
      });

      // If unauthorized, try to refresh token
      if (createChatRes.status === 401) {
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

              // Retry creating chat with new token
              createChatRes = await fetch(`${API_URL}/api/chats/`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  chat_type: "private",
                  member_ids: [currentUserId, otherUserId],
                }),
              });
            }
          } catch (refreshErr) {
            console.error("Token refresh failed:", refreshErr);
          }
        }
      }

      if (!createChatRes.ok) {
        const errorText = await createChatRes.text();
        console.error("Create chat error:", errorText);
        throw new Error("Failed to create chat");
      }

      const chatData = await createChatRes.json();
      const newChatId = chatData.chat?.chat_id;

      if (newChatId) {
        // Close modal and select the new chat in split layout
        setShowNewChatModal(false);
        setShowNewChatConfirmation(false);
        setSelectedUserForNewChat(null);

        // Set a flag to send greeting after chat is loaded
        sessionStorage.setItem("sendGreetingOnChatLoad", newChatId);

        // On small screens (mobile), navigate to chat page. On wide screens, set selected chat ID
        if (typeof window !== "undefined" && window.innerWidth < 900) {
          // Mobile: Navigate to chat page with greeting flag
          navigate(`/chat/${newChatId}`, { state: { sendGreeting: true } });
        } else {
          // Wide screen: Set selected chat ID (will trigger greeting via useEffect)
          setSelectedChatId(newChatId);
        }
      } else {
        throw new Error("Chat ID not found in response");
      }
    } catch (err) {
      console.error("Error creating chat:", err);
      alert("Failed to create chat. Please try again.");
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleSendGreeting = (chatId, userId) => {
    const messageToSend = "Hello!👋";

    // Send greeting message via Socket.IO
    const messageData = {
      chat_id: parseInt(chatId),
      sender_id: userId,
      message_text: messageToSend,
      message_type: "text",
    };

    socketService.sendMessage(messageData);
    // ChatWindow will receive the message via socket and display it
  };

  const clearAllSelection = (e) => {
    // Don't clear if clicking on interactive elements
    if (e && e.target && (
      e.target.closest('.context-menu') ||
      e.target.closest('.chat-item') ||
      e.target.closest('.header-actions') ||
      e.target.closest('.modal-overlay')
    )) {
      return;
    }
    setSelectedChats((prev) =>
      Object.fromEntries(Object.keys(prev).map((key) => [key, false]))
    );
    setChatSelection(false);
  };

  const deleteAllSelectedChats = async () => {
    try {
      const selectedChatIds = Object.keys(selectedChats)
        .filter((key) => selectedChats[key] === true)
        .map((key) => Number(key));

      if (selectedChatIds.length > 0) {
        const API_URL = (
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        ).replace(/\/+$/, "");
        const token = localStorage.getItem("accessToken");
        const fullUrl = `${API_URL}/api/chat-visibility/batch/delete`;

        const res = await fetch(fullUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chatIds: selectedChatIds }),
        });

        if (res.ok) {
          // Update local state
          // const updated = chats.map(chat =>
          //   selectedChats[chat.chat_id]
          //   ? { ...chat, pinned: true }
          //   : chat
          // )

          setChats((prevChats) =>
            prevChats.filter((c) => !selectedChats[c.chat_id])
          );

          // If the currently selected chat was deleted, deselect it
          if (selectedChatId && selectedChatIds.includes(selectedChatId)) {
            setSelectedChatId(null);
          }

          // setChats(sortChatsByTimestamp(updated));
          showToast("Deleted Selected Chats successfully", "success");
        } else {
          const errorText = await res.text();
          console.error("Backend error response:", errorText);
          showToast(`Failed to update pin status (${res.status})`, "error");
        }
      }
    } catch (err) {
      console.error("Error pinning chat:", err);
      showToast("Error updating pin status", "error");
    } finally {
      clearAllSelection();
    }
  };

  const markReadAllSelectedChats = async () => {
    try {
      const selectedChatIds = Object.keys(selectedChats)
        .filter((key) => selectedChats[key] === true)
        .map((key) => Number(key));

      if (selectedChatIds.length > 0) {
        const API_URL = (
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        ).replace(/\/+$/, "");
        const token = localStorage.getItem("accessToken");
        const fullUrl = `${API_URL}/api/chat-visibility/batch/mark-read`;

        const res = await fetch(fullUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chatIds: selectedChatIds }),
        });

        if (res.ok) {
          setChats((prevChats) =>
            prevChats.map((c) =>
              selectedChats[c.chat_id] ? { ...c, unread_count: 0 } : c
            )
          );
          // showToast('Marked Messsage Read Selected Chats successfully', 'success');
        } else {
          const errorText = await res.text();
          console.error("Backend error response:", errorText);
          showToast(`Failed to update pin status (${res.status})`, "error");
        }
      }
    } catch (err) {
      console.error("Error pinning chat:", err);
      showToast("Error updating pin status", "error");
    } finally {
      clearAllSelection();
    }
  };

  const pinAllSelectedChats = async () => {
    try {
      const selectedChatIds = Object.keys(selectedChats)
        .filter((key) => selectedChats[key] === true)
        .map((key) => Number(key));

      if (selectedChatIds.length > 0) {
        const API_URL = (
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        ).replace(/\/+$/, "");
        const token = localStorage.getItem("accessToken");
        const fullUrl = `${API_URL}/api/chat-visibility/batch/pin`;

        const res = await fetch(fullUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chatIds: selectedChatIds }),
        });

        if (res.ok) {
          // Update local state
          const updated = chats.map((chat) =>
            selectedChats[chat.chat_id] ? { ...chat, pinned: true } : chat
          );

          setChats(sortChatsByTimestamp(updated));
        } else {
          const errorText = await res.text();
          console.error("Backend error response:", errorText);
          showToast(`Failed to update pin status (${res.status})`, "error");
        }
      }
    } catch (err) {
      console.error("Error pinning chat:", err);
      showToast("Error updating pin status", "error");
    } finally {
      clearAllSelection();
    }
  };

  return (
    <div className="chat-home" onClick={clearAllSelection}>
      <div
        className="chat-home-container"
        ref={containerRef}
        style={
          typeof window !== "undefined" && window.innerWidth >= 900
            ? {
                gridTemplateColumns: `${leftPanelWidth}px 1fr`,
              }
            : {}
        }
      >
        <div className="left-panel">
          <div className="chat-home-header" ref={headerRef}>
            <div className="header-top">
              <h1>{greeting}</h1>
              <div className="header-actions">
                {chatSelection ? (
                  <>
                    <button
                      className="delete-chats-header-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteAllSelectedChats();
                      }}
                    >
                      <Trash2 size={24} />
                    </button>
                    <button
                      className="mark-all-read-header-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markReadAllSelectedChats();
                      }}
                    >
                      <CircleCheckBig size={24} />
                    </button>
                    <button className="mute-all-header-btn">
                      <BellOff size={24} />
                    </button>
                    <button className="archive-all-header-btn">
                      <Archive size={24} />
                    </button>
                    <button
                      className="pin-all-header-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        pinAllSelectedChats();
                      }}
                    >
                      <Pin size={24} />
                    </button>
                    <button
                      className="cancel-all-selection-header-btn"
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
                    <NotificationCenter
                      token={localStorage.getItem("accessToken")}
                      userId={userId}
                    />
                  </>
                )}
              </div>
            </div>
            <div className="search-bar">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="chat-list-wrapper">
            <SimpleBar style={{ maxHeight: chatListHeight }}>
              <div className="chat-list">
                {loading ? (
                  <div className="no-chats">
                    <p>Loading chats...</p>
                  </div>
                ) : error ? (
                  <div className="no-chats">
                    <p>{error}</p>
                  </div>
                ) : filteredChats.length > 0 ? (
                  filteredChats.map((chat) => {
                    let displayName = chat.chat_name;
                    let otherUserId = null;
                    let chatImage = null;

                    // Handle AI Assistant item
                    if (chat.isAI && convohubAssistantEnabled) {
                      return (
                        <div
                          key={chat.chat_id}
                          className={`chat-item ${showAIChat ? "selected" : ""}`}
                          onClick={() => handleChatClick(chat)}
                        >
                          <div className="chat-avatar ai-chat-avatar">
                            <Sparkles size={24} color="white" />
                          </div>
                          <div className="chat-info">
                            <div className="chat-header-info">
                              <h3 className="chat-name">{displayName}</h3>
                              <span className="ai-badge">AI</span>
                            </div>
                            <div className="chat-last-message">
                              <p className="last-message">
                                {chat.last_message?.preview_text || "Ask me anything!"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (
                      chat.chat_type === "private" &&
                      Array.isArray(chat.members)
                    ) {
                      // Find the other member (use Number() to ensure type match)
                      const currentUserId = Number(userId);
                      const other = chat.members.find(
                        (m) => Number(m.user_id) !== currentUserId
                      );
                      
                      if (other) {
                        otherUserId = other.user_id;
                        if (other.user && other.user.full_name) {
                          displayName = other.user.full_name;
                        } else if (other.user && other.user.username) {
                          displayName = other.user.username;
                        } else if (userProfiles[other.user_id]?.full_name) {
                          displayName = userProfiles[other.user_id].full_name;
                        } else if (userProfiles[other.user_id]?.username) {
                          displayName = userProfiles[other.user_id].username;
                        }
                      }
                    } else if (chat.chat_type === "group") {
                      // Use fetched blob URL for group chat image
                      chatImage = chatImages[chat.chat_id];
                    }

                    // Get profile pic for private chats
                    const profilePic =
                      otherUserId && userProfiles[otherUserId]?.profile_pic;

                    // Get initials from display name
                    const getInitials = (name) => {
                      if (!name) return "💬";
                      const words = name.trim().split(" ");
                      if (words.length >= 2) {
                        return (
                          words[0][0] + words[words.length - 1][0]
                        ).toUpperCase();
                      }
                      return name.substring(0, 2).toUpperCase();
                    };

                    return (
                      <div
                        key={chat.chat_id}
                        className={`chat-item ${
                          parseInt(selectedChatId) === parseInt(chat.chat_id) ? "selected" : ""
                        } ${selectedChats[chat.chat_id] ? "selection" : ""}`}
                        onClick={(e) => {
                          if (chatSelection) {
                            e.stopPropagation();
                            handleChatsSelection(chat.chat_id);
                          } else handleChatClick(chat.chat_id);
                        }}
                        onContextMenu={(e) => handleChatContextMenu(e, chat)}
                      >
                        <div
                          className="chat-avatar"
                          onClick={(e) => handleChatAvatarClick(e, chat)}
                          style={{ cursor: "pointer" }}
                        >
                          {profilePic || chatImage ? (
                            <img
                              src={profilePic || chatImage}
                              alt={
                                chat.chat_type === "group" ? "group" : "profile"
                              }
                              style={{
                                width: "100%",
                                height: "100%",
                                borderRadius: "50%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <span className="avatar-emoji">
                              {chat.chat_type === "private"
                                ? getInitials(displayName)
                                : "💬"}
                            </span>
                          )}
                        </div>
                        <div className="chat-info">
                          <div className="chat-header-info">
                            <h3 className="chat-name">{displayName}</h3>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              {chat.unread_count > 0 && (
                                <span
                                  style={{
                                    backgroundColor: "var(--accent-color)",
                                    color: "white",
                                    borderRadius: "50%",
                                    width: "24px",
                                    height: "24px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    flexShrink: 0,
                                  }}
                                >
                                  {chat.unread_count > 99
                                    ? "99+"
                                    : chat.unread_count}
                                </span>
                              )}
                              {chat.pinned && (
                                <Pin
                                  color="var(--accent-color)"
                                  size={16}
                                  strokeWidth={2}
                                />
                              )}
                              <span className="chat-time">
                                {formatChatPreviewTime(
                                  chat.last_message?.created_at
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="chat-last-message">
                            <p className="last-message">
                              {chat.last_message?.preview_text ||
                                "No messages yet"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-chats">
                    <MessageCircle size={64} className="no-chats-icon" />
                    <p>No conversations found</p>
                  </div>
                )}
              </div>
            </SimpleBar>
          </div>

          <button className="new-chat-btn" onClick={handleNewChat}>
            <Plus size={24} />
          </button>

          <div ref={bottomTabBarRef}>
            <BottomTabBar activeTab="chats" />
          </div>
        </div>

        <div className="right-panel">
          {showAIChat ? (
            <AIChatWindow
              isEmbedded={true}
              onClose={() => setShowAIChat(false)}
            />
          ) : selectedChatId ? (
            <ChatWindow
              chatId={selectedChatId}
              isEmbedded={true}
              onMemberClick={(memberId) => {
                setSelectedUserForModal(memberId);
                setShowUserProfileModal(true);
              }}
            />
          ) : (
            <div className="chat-placeholder">
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {showNewChatModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowNewChatModal(false)}
        >
          <div className="new-chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Chat</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowNewChatModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-search">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search by username..."
                value={searchUsers}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="modal-search-input"
                autoFocus
              />
            </div>
            <div className="modal-results">
              {searchLoading ? (
                <p className="modal-message">Searching...</p>
              ) : searchUsers && searchResults.length === 0 ? (
                <p className="modal-message">No users found</p>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user.user_id}
                    className="user-result-item"
                    onClick={() => handleSelectUserClick(user)}
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
                  Search for users to start a new chat
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Info Modal */}
      <ChatInfoModal
        isOpen={showChatInfoModal}
        onClose={() => setShowChatInfoModal(false)}
        chatId={selectedChatInfo?.chatId}
        chatType={selectedChatInfo?.chatType}
        otherUserId={selectedChatInfo?.otherUserId}
      />

      {/* User Profile Modal */}
      <ChatInfoModal
        isOpen={showUserProfileModal}
        onClose={() => {
          setShowUserProfileModal(false);
          // Reopen the chat info modal when user profile modal closes
          // Use the saved selectedChatInfo to restore the previous modal
          if (selectedChatInfo) {
            setShowChatInfoModal(true);
          }
        }}
        chatId={null}
        chatType="private"
        otherUserId={selectedUserForModal}
      />

      {/* Chat Options Menu */}
      <ChatOptionsMenu
        isOpen={showOptionsMenu}
        onNewChat={handleNewChatWithUser}
        onNewGroup={handleCreateNewGroup}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={handleGroupCreated}
        currentUserId={userId}
      />

      {/* Chat Context Menu */}
      <ContextMenu
        isOpen={chatContextMenu.isOpen}
        x={chatContextMenu.x}
        y={chatContextMenu.y}
        items={getContextMenuItems(selectedChatForMenu)}
        onClose={chatContextMenu.closeMenu}
      />

      {/* New Private Chat Confirmation */}
      <ConfirmationBox
        isOpen={showNewChatConfirmation}
        title="Start New Chat"
        message={`Start a new conversation with ${
          selectedUserForNewChat?.full_name || selectedUserForNewChat?.username
        }?`}
        confirmText='Send "Hello!👋"'
        cancelText="Cancel"
        isLoading={isCreatingChat}
        onConfirm={handleSelectUser}
        onCancel={() => {
          setShowNewChatConfirmation(false);
          setSelectedUserForNewChat(null);
        }}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default ChatHome;
