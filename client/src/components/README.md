# Components Directory Structure

This directory contains all React components for the ConvoHub chat application. Components are organized into logical subfolders for better maintainability and scalability.

## Folder Structure

### `/common`
Reusable UI components that are used across the application.
- **BottomTabBar** - Navigation bar at the bottom of pages
- **ConfirmationBox** - Generic confirmation dialog
- **ContextMenu** - Dropdown/context menu component
- **EmojiPicker** - Emoji selection component
- **PageHeader** - Header with back button and title
- **Toast** - Toast notification component
- **ToastContainer** - Container for managing multiple toasts

### `/modals`
Modal dialogs and overlays for various operations.
- **ChatInfoModal** - Display and manage chat information
- **ChatSummary** - Generate and display chat summaries
- **CreateGroupModal** - Create new group chats
- **MessageForward** - Forward messages to other chats
- **MessageTranslator** - Translate messages to different languages
- **UpdateGroupInfoModal** - Update group name, description, image

### `/messages`
Components related to message display and interaction.
- **AttachmentPreview** - Preview attached files (images, documents)
- **MessageAvatar** - User avatar in messages
- **MessageBubble** - Message container/wrapper
- **MessageStatusIndicator** - Show message delivery/read status
- **SystemMessage** - System notifications (member joined, etc.)
- **TypingIndicator** - Show typing animation

### `/features`
Feature-specific components for enhanced chat functionality.
- **ChatOptionsMenu** - Menu to create new chats/groups
- **ConversationStarters** - AI-powered conversation starting suggestions
- **NotificationCenter** - Manage and display notifications
- **NotificationSettings** - Configure notification preferences
- **SmartReplies** - AI-powered quick reply suggestions

## Importing Components

### Using Index Files (Recommended)
```javascript
// From subfolders
import { BottomTabBar, PageHeader } from "../components/common";
import { ChatInfoModal, CreateGroupModal } from "../components/modals";
import { AttachmentPreview, TypingIndicator } from "../components/messages";
import { SmartReplies, ConversationStarters } from "../components/features";

// From main components folder (re-exported)
import { BottomTabBar, ChatInfoModal } from "../components";
```

### Direct Import
```javascript
import BottomTabBar from "../components/common/BottomTabBar";
```

## Adding New Components

1. **Determine the category** - Is it a UI component, modal, message-related, or feature?
2. **Create the component file** - Add `ComponentName.js` and `ComponentName.css` in the appropriate folder
3. **Update the index file** - Add the export to the folder's `index.js`
4. **Update main index** - The main `components/index.js` re-exports everything automatically

Example:
```javascript
// components/common/NewButton.js
export default function NewButton({ ... }) { ... }

// components/common/index.js - add this line:
export { default as NewButton } from "./NewButton";
```

## Component Naming Conventions

- **Component files**: PascalCase (e.g., `ChatInfoModal.js`)
- **CSS files**: Same name as component (e.g., `ChatInfoModal.css`)
- **Functional components**: Use function declaration or arrow functions
- **Props**: Use destructuring in the component signature

## CSS Organization

Each component has its own CSS file located alongside the JS file. Styles are scoped to the component's class name to avoid conflicts:

```css
/* ChatInfoModal.css */
.chat-info-modal {
  /* styles */
}

.chat-info-modal-header {
  /* styles */
}
```

## Best Practices

1. **Keep components focused** - Each component should have a single responsibility
2. **Use index files** - Import from index files for cleaner paths
3. **Avoid deep nesting** - If a component becomes too complex, break it into smaller components
4. **Document complex logic** - Add comments for non-obvious code
5. **Reuse common components** - Don't duplicate UI patterns
6. **Proper cleanup** - Use useEffect cleanup functions for event listeners and timers
