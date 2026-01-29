# Requirements Document

## Introduction

This specification defines the requirements for simplifying the ImagesTab component by removing the dropdown context menu functionality and replacing it with direct action buttons. The goal is to create a cleaner, more intuitive interface that provides immediate access to image actions without requiring users to navigate through a context menu.

## Glossary

- **ImagesTab**: The React component that displays stored images in the Skhoot application
- **Context_Menu**: A dropdown menu that appears on right-click or when clicking the "More" button
- **Action_Button**: A direct button that performs a specific action (add to chat, download, delete)
- **Grid_View**: Display mode showing images in a 4-column grid with thumbnails
- **List_View**: Display mode showing images in a vertical list with metadata
- **Image_Storage**: The service layer that manages stored images in the application
- **Modal**: A full-screen overlay that displays the selected image at full size

## Requirements

### Requirement 1: Remove Context Menu Infrastructure

**User Story:** As a developer, I want to remove the context menu infrastructure from the ImagesTab component, so that the codebase is cleaner and easier to maintain.

#### Acceptance Criteria

1. THE ImagesTab SHALL remove the ImageContextMenu component from the file
2. THE ImagesTab SHALL remove all context menu state management (contextMenu state variable)
3. THE ImagesTab SHALL remove the handleContextMenu function
4. THE ImagesTab SHALL remove the handleMoreClick function
5. THE ImagesTab SHALL remove any MoreHorizontal icon imports that are no longer used

### Requirement 2: Direct Action Buttons in Grid View

**User Story:** As a user, I want to see action buttons when I hover over images in grid view, so that I can quickly perform actions without opening a menu.

#### Acceptance Criteria

1. WHEN a user hovers over an image in grid view, THE ImagesTab SHALL display three action buttons
2. THE ImagesTab SHALL display an "Add to chat" button with a MessageSquarePlus icon
3. THE ImagesTab SHALL display a "Download" button with a Download icon
4. THE ImagesTab SHALL display a "Delete" button with a Trash2 icon
5. WHEN not hovering, THE ImagesTab SHALL hide the action buttons using opacity transitions
6. THE ImagesTab SHALL position action buttons in the top-right corner of each image card

### Requirement 3: Direct Action Buttons in List View

**User Story:** As a user, I want to see action buttons for each image in list view, so that I can perform actions without opening a menu.

#### Acceptance Criteria

1. WHEN viewing images in list view, THE ImagesTab SHALL display three action buttons for each image
2. THE ImagesTab SHALL display an "Add to chat" button with a MessageSquarePlus icon
3. THE ImagesTab SHALL display a "Download" button with a Download icon
4. THE ImagesTab SHALL display a "Delete" button with a Trash2 icon
5. THE ImagesTab SHALL show buttons with reduced opacity by default and full opacity on hover
6. THE ImagesTab SHALL position action buttons on the right side of each list item

### Requirement 4: Add to Chat Action

**User Story:** As a user, I want to add images to my chat input by clicking a button, so that I can quickly reference images in my conversations.

#### Acceptance Criteria

1. WHEN a user clicks the "Add to chat" button, THE ImagesTab SHALL dispatch a custom 'add-image-to-chat' event
2. THE ImagesTab SHALL include the image URL and filename in the event detail
3. WHEN the event is dispatched, THE ImagesTab SHALL focus the chat textarea
4. THE ImagesTab SHALL prevent the click event from triggering the image modal
5. THE ImagesTab SHALL use a purple-themed button style to indicate the primary action

### Requirement 5: Download Action

**User Story:** As a user, I want to download images by clicking a button, so that I can save images to my local filesystem.

#### Acceptance Criteria

1. WHEN a user clicks the "Download" button, THE ImagesTab SHALL create a temporary download link
2. THE ImagesTab SHALL use the stored filename or generate a timestamped filename
3. THE ImagesTab SHALL trigger the browser download mechanism
4. THE ImagesTab SHALL remove the temporary link element after download
5. THE ImagesTab SHALL prevent the click event from triggering the image modal

### Requirement 6: Delete Action

**User Story:** As a user, I want to delete images by clicking a button, so that I can remove unwanted images from my collection.

#### Acceptance Criteria

1. WHEN a user clicks the "Delete" button, THE ImagesTab SHALL display a confirmation dialog
2. THE ImagesTab SHALL show the filename in the confirmation message
3. WHEN the user confirms deletion, THE ImagesTab SHALL call imageStorage.deleteImage with the image ID
4. WHEN the user confirms deletion, THE ImagesTab SHALL reload the image list
5. THE ImagesTab SHALL prevent the click event from triggering the image modal
6. THE ImagesTab SHALL use a red-themed button style to indicate the destructive action

### Requirement 7: Full-Size Image Modal

**User Story:** As a user, I want to view images at full size by clicking on them, so that I can see image details clearly.

#### Acceptance Criteria

1. WHEN a user clicks on an image (not on action buttons), THE ImagesTab SHALL open a full-size modal
2. THE ImagesTab SHALL display the image at maximum size while maintaining aspect ratio
3. THE ImagesTab SHALL show a close button in the top-right corner of the viewport
4. WHEN the filename exists, THE ImagesTab SHALL display it at the bottom of the modal
5. WHEN the user clicks the close button or outside the image, THE ImagesTab SHALL close the modal

### Requirement 8: Preserve Existing Features

**User Story:** As a user, I want all existing ImagesTab features to continue working, so that I don't lose functionality during the simplification.

#### Acceptance Criteria

1. THE ImagesTab SHALL maintain grid and list view modes
2. THE ImagesTab SHALL maintain image filtering by source (all, user, web search)
3. THE ImagesTab SHALL maintain image sorting (recent, oldest, name, source)
4. THE ImagesTab SHALL maintain the filter toggle button and panel
5. THE ImagesTab SHALL maintain the statistics display (total, user, web images)
6. THE ImagesTab SHALL maintain the source badge display (USER/WEB)
7. THE ImagesTab SHALL maintain the empty state display when no images exist
8. THE ImagesTab SHALL maintain the loading state display

### Requirement 9: Visual Consistency

**User Story:** As a user, I want the action buttons to follow the application's design system, so that the interface feels cohesive.

#### Acceptance Criteria

1. THE ImagesTab SHALL use the embossed glassmorphic design system for action buttons
2. THE ImagesTab SHALL use theme-aware colors from CSS variables
3. THE ImagesTab SHALL provide smooth transitions for hover states
4. THE ImagesTab SHALL use consistent icon sizes (12px in grid view, 14px in list view)
5. THE ImagesTab SHALL use appropriate button padding and border radius
6. THE ImagesTab SHALL use color coding (purple for primary, red for destructive, neutral for secondary)

### Requirement 10: Accessibility

**User Story:** As a user with accessibility needs, I want action buttons to be keyboard accessible and have proper labels, so that I can use the interface effectively.

#### Acceptance Criteria

1. THE ImagesTab SHALL provide title attributes for all action buttons
2. THE ImagesTab SHALL ensure action buttons are keyboard focusable
3. THE ImagesTab SHALL maintain proper focus management when opening/closing modals
4. THE ImagesTab SHALL use semantic HTML elements for buttons
5. THE ImagesTab SHALL provide clear visual feedback for button hover and active states
