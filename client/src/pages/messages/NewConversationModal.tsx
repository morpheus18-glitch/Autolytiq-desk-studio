/**
 * New Conversation Modal
 *
 * Modal for creating a new conversation with selected users.
 * Supports both direct (1:1) and group conversations.
 */

import { useState, useMemo, type JSX } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@design-system';
import { useUsers, type User } from '@/hooks/useUsers';
import { useCreateConversation } from '@/hooks/useMessaging';
import { cn, getInitials, getFullName } from '@/lib/utils';
import { Search, Users, User as UserIcon, Check, X, AlertCircle } from 'lucide-react';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onConversationCreated: (conversationId: string) => void;
}

export function NewConversationModal({
  isOpen,
  onClose,
  currentUserId,
  onConversationCreated,
}: NewConversationModalProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useUsers();
  const createConversationMutation = useCreateConversation();

  // Filter out current user and filter by search query
  const availableUsers = useMemo(() => {
    if (!usersData?.users) return [];

    return usersData.users
      .filter((user) => user.id !== currentUserId && user.is_active)
      .filter((user) => {
        if (!searchQuery) return true;
        const fullName = getFullName(user.first_name, user.last_name).toLowerCase();
        const email = user.email.toLowerCase();
        const query = searchQuery.toLowerCase();
        return fullName.includes(query) || email.includes(query);
      });
  }, [usersData?.users, currentUserId, searchQuery]);

  // Determine if this is a group conversation
  const isGroup = selectedUserIds.length > 1;

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleCreateConversation = async () => {
    if (selectedUserIds.length === 0) return;

    try {
      const conversation = await createConversationMutation.mutateAsync({
        type: isGroup ? 'GROUP' : 'DIRECT',
        participant_ids: selectedUserIds,
        name: isGroup && groupName.trim() ? groupName.trim() : undefined,
      });

      // Reset form
      setSelectedUserIds([]);
      setGroupName('');
      setSearchQuery('');

      // Notify parent and close
      onConversationCreated(conversation.id);
      onClose();
    } catch (error) {
      // Error is handled by React Query
      console.error('Failed to create conversation:', error);
    }
  };

  const handleClose = () => {
    setSelectedUserIds([]);
    setGroupName('');
    setSearchQuery('');
    onClose();
  };

  const getSelectedUsers = (): User[] => {
    if (!usersData?.users) return [];
    return usersData.users.filter((user) => selectedUserIds.includes(user.id));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Conversation"
      description="Select one or more people to start a conversation"
      size="md"
    >
      <div className="space-y-4">
        {/* Selected Users Chips */}
        {selectedUserIds.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-3 border-b border-border">
            {getSelectedUsers().map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-sm"
              >
                <span className="text-foreground">
                  {user.first_name} {user.last_name}
                </span>
                <button
                  onClick={() => handleRemoveUser(user.id)}
                  className="p-0.5 rounded-full hover:bg-primary/20 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Group Name Input (only for groups) */}
        {isGroup && (
          <div>
            <label
              htmlFor="group-name"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Group Name (optional)
            </label>
            <input
              id="group-name"
              type="text"
              placeholder="Enter a name for the group..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>

        {/* Users List */}
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : usersError ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
              <p className="text-sm">Failed to load users</p>
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? 'No users found matching your search' : 'No users available'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {availableUsers.map((user) => (
                <UserListItem
                  key={user.id}
                  user={user}
                  isSelected={selectedUserIds.includes(user.id)}
                  onToggle={() => handleToggleUser(user.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Conversation Type Indicator */}
        {selectedUserIds.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isGroup ? (
              <>
                <Users className="h-4 w-4" />
                <span>Group conversation with {selectedUserIds.length} people</span>
              </>
            ) : (
              <>
                <UserIcon className="h-4 w-4" />
                <span>Direct message</span>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateConversation}
            disabled={selectedUserIds.length === 0 || createConversationMutation.isPending}
          >
            {createConversationMutation.isPending ? (
              <>
                <span className="animate-spin mr-2">...</span>
                Creating...
              </>
            ) : (
              'Start Conversation'
            )}
          </Button>
        </div>

        {/* Error Message */}
        {createConversationMutation.isError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Failed to create conversation. Please try again.</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * User List Item Component
 */
function UserListItem({
  user,
  isSelected,
  onToggle,
}: {
  user: User;
  isSelected: boolean;
  onToggle: () => void;
}): JSX.Element {
  const fullName = getFullName(user.first_name, user.last_name);
  const initials = getInitials(fullName);

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-3 p-3 text-left transition-colors',
        isSelected ? 'bg-primary/5' : 'hover:bg-muted'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
        {initials}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{fullName}</p>
        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
      </div>

      {/* Role Badge */}
      <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground capitalize">
        {user.role.toLowerCase()}
      </span>

      {/* Selection Indicator */}
      <div
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
          isSelected
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-muted-foreground/30'
        )}
      >
        {isSelected && <Check className="h-3 w-3" />}
      </div>
    </button>
  );
}
