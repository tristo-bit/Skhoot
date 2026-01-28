# Requirements: File Explorer Function Fix

## Overview
Fix a critical bug in FileExplorerPanel where a function was incorrectly renamed, breaking the file opening functionality.

## Problem Statement
In `components/panels/FileExplorerPanel.tsx`, a recent change accidentally renamed `handleOpenFile` to `handleDeleteFile` at line 476, while changing its implementation to call `fileActions.delete(file.path)`. However, there's already a proper `handleOpenFile` function at line 481 that correctly calls `fileActions.open(file.path)`.

This creates a situation where:
- The function at line 476 is named `handleDeleteFile` but is likely still being called as `handleOpenFile` elsewhere
- There are now two functions with conflicting purposes
- File opening functionality is broken

## User Stories

### 1.1 File Opening Works Correctly
**As a** user  
**I want** to click on a file name in the File Explorer  
**So that** the file opens in the appropriate application

**Acceptance Criteria:**
- Clicking a file name opens the file using `fileActions.open()`
- The correct function name is used throughout the component
- No duplicate or conflicting function definitions exist

### 1.2 Code Consistency
**As a** developer  
**I want** function names to match their implementations  
**So that** the code is maintainable and bug-free

**Acceptance Criteria:**
- Function names accurately describe what they do
- No naming conflicts between functions
- Code follows the existing patterns in the component

## Technical Requirements

### 2.1 Function Naming
- The function at line 476 should be named `handleOpenFile` (revert the rename)
- The function should call `fileActions.open(file.path)` (revert the implementation change)
- Remove any duplicate `handleOpenFile` function if it exists

### 2.2 Delete Functionality
- Verify that delete functionality still works through the context menu
- The context menu already has a delete action that calls `fileActions.delete()`
- No separate `handleDeleteFile` function is needed at the component level

## Out of Scope
- Adding new features to the File Explorer
- Modifying the file operations service
- Changing the UI/UX of file interactions

## Dependencies
- `fileOperations` service must be functioning correctly
- Context menu implementation must remain intact

## Success Metrics
- File opening works when clicking file names
- No console errors related to undefined functions
- All existing File Explorer functionality continues to work
