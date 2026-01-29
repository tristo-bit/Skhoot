# Requirements Document

## Introduction

This specification addresses the completion of the UserPanel refactoring that was partially completed on January 22, 2026. The API configuration functionality was intentionally moved from UserPanel to AISettingsPanel to consolidate all AI settings in one location. However, the refactoring left broken references to removed variables in handler functions that need to be cleaned up.

## Glossary

- **UserPanel**: The user profile settings component accessed via the user icon, containing profile picture, personal information, and plan management
- **AISettingsPanel**: The AI configuration component containing all API key management, model selection, and AI parameters
- **API Configuration**: The functionality for managing API keys, testing connections, selecting models, and configuring AI providers
- **Handler Functions**: JavaScript/TypeScript functions that respond to user interactions (e.g., button clicks, form submissions)
- **State Variables**: React state variables that store component data and trigger re-renders when updated

## Requirements

### Requirement 1: Remove Broken API Configuration Handler Functions

**User Story:** As a developer, I want to remove all broken API configuration handler functions from UserPanel, so that the codebase is clean and maintainable without dead code.

#### Acceptance Criteria

1. WHEN the UserPanel component is analyzed, THE System SHALL identify all handler functions that reference removed API configuration state variables
2. WHEN broken handler functions are identified, THE System SHALL remove them completely from the component
3. WHEN handler functions are removed, THE System SHALL ensure no other code references these functions
4. THE System SHALL verify that no imports are left unused after handler function removal

### Requirement 2: Remove API Configuration UI Elements

**User Story:** As a developer, I want to ensure no API configuration UI elements remain in UserPanel, so that users are not confused about where to configure API settings.

#### Acceptance Criteria

1. WHEN the UserPanel component is rendered, THE System SHALL display only profile management UI elements
2. THE System SHALL NOT display any API key input fields in UserPanel
3. THE System SHALL NOT display any provider selection dropdowns in UserPanel
4. THE System SHALL NOT display any connection test buttons in UserPanel
5. THE System SHALL NOT display any model selection dropdowns in UserPanel

### Requirement 3: Verify Profile Management Functionality

**User Story:** As a user, I want my profile management features to continue working correctly, so that I can update my profile picture and personal information.

#### Acceptance Criteria

1. WHEN a user uploads a profile picture, THE System SHALL save it to localStorage
2. WHEN a user updates their first name or last name, THE System SHALL save the changes to localStorage
3. WHEN a user views their email address, THE System SHALL display it as read-only
4. WHEN a user makes changes, THE System SHALL display an "Unsaved changes" indicator
5. WHEN a user saves changes, THE System SHALL update the indicator to "All changes saved"

### Requirement 4: Update Documentation

**User Story:** As a developer or user, I want documentation to accurately reflect that API configuration is only in AISettingsPanel, so that I know where to find AI settings.

#### Acceptance Criteria

1. WHEN README.md is reviewed, THE System SHALL ensure it states that API configuration is in AISettingsPanel
2. WHEN README.md is reviewed, THE System SHALL ensure it does NOT reference API configuration in UserPanel
3. THE System SHALL verify that all documentation references to UserPanel describe only profile management features

### Requirement 5: Verify No External Dependencies

**User Story:** As a developer, I want to ensure no other components depend on UserPanel for API configuration, so that the refactoring is complete and safe.

#### Acceptance Criteria

1. WHEN the codebase is searched, THE System SHALL identify any components that import UserPanel
2. WHEN components import UserPanel, THE System SHALL verify they do NOT expect API configuration functionality
3. THE System SHALL verify that no event listeners or callbacks expect UserPanel to emit API configuration events
