# Email System Upgrade - Gmail/Outlook Experience

## ✅ What You Already Have

- Email listing with folders (Inbox, Sent, Drafts, Starred, Trash)
- Compose dialog
- Email detail view
- Mark as read/unread
- Star/unstar
- Delete
- Search
- Responsive mobile layout
- 8-layer security system
- Resend integration with webhooks

## 🚀 What We're Adding (Priority Order)

### Phase 1: Core UX Improvements (30 min)
- [ ] **Better Read/Unread Indicators**
  - Blue dot for unread (Gmail style)
  - Bold text for unread
  - Unread count badges
  - Visual distinction in list

- [ ] **Email Settings Page**
  - Signature editor
  - Display settings (density, preview)
  - Notification preferences
  - Auto-reply/vacation responder
  - Filters and rules

- [ ] **Improved Compose Experience**
  - Rich text editor (bold, italic, links)
  - Cc/Bcc fields
  - Attachments UI
  - Save draft auto-save indicator
  - Discard confirmation

### Phase 2: Power Features (45 min)
- [ ] **Bulk Actions**
  - Multi-select checkboxes
  - Bulk delete
  - Bulk mark read/unread
  - Bulk move to folder
  - Bulk star/unstar

- [ ] **Reply & Forward**
  - Reply button
  - Reply all
  - Forward
  - Inline reply (Gmail style)
  - Quote original message

- [ ] **Threading/Conversations**
  - Group emails by thread
  - Conversation view
  - Expand/collapse threads

### Phase 3: Advanced Features (60 min)
- [ ] **Archive**
  - Archive button
  - Archive folder
  - Keyboard shortcut (e)

- [ ] **Labels/Categories**
  - Custom labels
  - Color coding
  - Filter by label
  - Multiple labels per email

- [ ] **Snooze**
  - Snooze until later
  - Snooze presets (tonight, tomorrow, next week)
  - Snoozed folder

- [ ] **Smart Features**
  - Priority inbox
  - Important marker
  - Smart compose suggestions
  - Undo send (5 second window)
  - Scheduled send

### Phase 4: Polish (30 min)
- [ ] **Keyboard Shortcuts**
  - c - Compose
  - r - Reply
  - a - Reply all
  - f - Forward
  - e - Archive
  - # - Delete
  - s - Star
  - u - Mark unread
  - j/k - Navigate
  - Enter - Open
  - Escape - Close

- [ ] **Better Mobile Experience**
  - Swipe to archive/delete
  - Pull to refresh
  - Better touch targets
  - Native-feeling animations

- [ ] **Visual Polish**
  - Gmail-style density options (compact, comfortable, cozy)
  - Better loading states
  - Skeleton screens
  - Smooth transitions
  - Hover states
  - Focus indicators

## Design System

### Colors
- **Unread:** Blue dot (#1a73e8)
- **Star:** Yellow (#f9ab00)
- **Important:** Red marker
- **Archive:** Green
- **Delete:** Red destructive
- **Background:** Clean white/dark mode support

### Typography
- **Unread:** font-semibold
- **Read:** font-normal
- **Muted text:** text-muted-foreground
- **Timestamps:** text-xs

### Layout
- **Density Compact:** 40px row height
- **Density Comfortable:** 52px row height (default)
- **Density Cozy:** 64px row height

## Implementation Order

1. ✅ **Read/Unread Indicators** (10 min)
2. ✅ **Email Settings Page** (20 min)
3. ✅ **Bulk Actions** (15 min)
4. ✅ **Reply/Forward** (20 min)
5. ✅ **Archive** (10 min)
6. ✅ **Rich Text Editor** (15 min)
7. ✅ **Labels** (20 min)
8. ✅ **Keyboard Shortcuts** (15 min)
9. ✅ **Threading** (30 min)
10. ✅ **Polish** (30 min)

Total: ~3 hours to build world-class email experience
