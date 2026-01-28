# Requirements Document

## Introduction

This specification documents a safety enhancement to the File Explorer panel's Recent tab. The feature changes the delete action from permanently deleting files from disk to safely removing them from the Recent list only, preventing accidental data loss while maintaining list management capabilities.

## Glossary

- **File_Explorer_Panel**: The UI component that displays recently accessed files and provides file management actions
- **Recent_List**: The in-memory collection of recently accessed file paths displayed in the Recent tab
- **Delete_Action**: The context menu action that removes a file entry from the Recent list
- **Confirmation_Dialog**: A modal dialog that requests user confirmation before performing the delete action
- **File_On_Disk**: The actual file stored in the filesystem, which remains untouched by this action

## Requirements

### Requirement 1: Safe Delete Action

**User Story:** As a user, I want to remove files from my Recent list without deleting them from disk, so that I can manage my Recent list safely without fear of data loss.

#### Acceptance Criteria

1. WHEN a user selects the delete action on a Recent list item, THEN THE File_Explorer_Panel SHALL display a confirmation dialog
2. WHEN the confirmation dialog is displayed, THEN THE Confirmation_Dialog SHALL clearly state that only the Recent list entry will be removed and the file on disk will remain untouched
3. WHEN a user confirms the delete action, THEN THE File_Explorer_Panel SHALL remove the file entry from the Recent_List
4. WHEN a user confirms the delete action, THEN THE File_Explorer_Panel SHALL NOT make any filesystem operations to delete the File_On_Disk
5. WHEN the file entry is removed from the Recent_List, THEN THE File_Explorer_Panel SHALL update the UI immediately to reflect the removal

### Requirement 2: Clear User Communication

**User Story:** As a user, I want clear messaging about what the delete action does, so that I understand the action is safe and non-destructive.

#### Acceptance Criteria

1. WHEN the confirmation dialog is shown, THEN THE Confirmation_Dialog SHALL include text explicitly stating "This will only remove the file from your Recent list"
2. WHEN the confirmation dialog is shown, THEN THE Confirmation_Dialog SHALL include text explicitly stating "The file on disk will not be deleted"
3. THE Confirmation_Dialog SHALL use clear, non-technical language that users can easily understand

### Requirement 3: Preserved File Actions

**User Story:** As a user, I want other file actions to continue working normally, so that I can still open, reveal, and view properties of files in my Recent list.

#### Acceptance Criteria

1. WHEN a user selects the open action, THEN THE File_Explorer_Panel SHALL open the file in the appropriate application
2. WHEN a user selects the reveal action, THEN THE File_Explorer_Panel SHALL open the file's location in the system file explorer
3. WHEN a user selects the properties action, THEN THE File_Explorer_Panel SHALL display the file's metadata and properties
4. WHEN any non-delete action is performed, THEN THE File_Explorer_Panel SHALL maintain all existing functionality without changes

### Requirement 4: UI State Management

**User Story:** As a developer, I want the Recent list to be managed purely in UI state, so that the implementation is simple and doesn't require backend coordination.

#### Acceptance Criteria

1. WHEN a file is removed from the Recent_List, THEN THE File_Explorer_Panel SHALL update only the local component state
2. WHEN a file is removed from the Recent_List, THEN THE File_Explorer_Panel SHALL NOT make any API calls to the backend
3. WHEN the Recent_List is updated, THEN THE File_Explorer_Panel SHALL re-render to show the updated list immediately
