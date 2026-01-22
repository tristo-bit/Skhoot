# User Panel Refactoring - Requirements

## Overview

The UserPanel component has an incomplete refactoring where the `plan` state variable was removed but the code still references it extensively. This spec will complete the refactoring to remove all subscription/billing UI features and restore the component to a working state.

## Background

The UserPanel component (`components/settings/UserPanel.tsx`) currently has:
- Removed `plan` state variable (line 14 in the diff)
- Still references `plan` in multiple places (lines 348, 357, 358, 365, 380)
- Missing state variables: `showUpgradePanel`, `showBillingPanel`
- Missing handler functions: `handlePlanChange`, `handleStartBilling`
- Missing component imports: `UserIcon`, `Crown`, `PlanButton`, `PremiumButton`
- Extensive UI code for subscription plans, upgrade panels, and billing that is now orphaned

## Goals

1. **Remove all subscription/billing UI** from the UserPanel component
2. **Fix all broken references** to removed state variables and functions
3. **Simplify the component** to focus on core user profile and API configuration features
4. **Maintain existing functionality** for profile management and API key configuration
5. **Update documentation** to reflect the simplified UserPanel

## User Stories

### 1. As a developer, I want the UserPanel component to compile without errors
**Acceptance Criteria:**
- No TypeScript errors in UserPanel.tsx
- No runtime errors when opening the User Panel
- All referenced variables and functions are defined
- All imported components exist

### 2. As a user, I want to manage my profile information
**Acceptance Criteria:**
- Can upload and change profile picture
- Can edit first name and last name
- Can see my email address (read-only)
- Changes are tracked with visual indicators
- Can save profile changes

### 3. As a user, I want to configure API keys for AI providers
**Acceptance Criteria:**
- Can select from multiple AI providers (OpenAI, Anthropic, Google AI, Custom)
- Can enter and save API keys securely
- Can test API key connection before saving
- Can see available models for the selected provider
- Can select and save preferred model per provider
- Connection status is clearly displayed

### 4. As a user, I should not see subscription/billing UI
**Acceptance Criteria:**
- No "Subscription Plan" section visible
- No "Guest" vs "Subscribed" plan buttons
- No "Upgrade to Premium" panel
- No "Billing & Payment" panel
- No pricing information displayed
- No subscription-related messaging

## Technical Requirements

### Components to Remove
1. Plan Section (lines ~341-390)
   - Plan selection buttons (Guest/Subscribed)
   - Upgrade message for guest users
   - Lock overlay for subscribed plan

2. Upgrade Panel (lines ~471-540)
   - Upgrade header with Skhoot branding
   - Premium features list
   - Pricing display ($9.99/month)
   - "Start Free Trial" button
   - "Maybe later" button

3. Billing Panel (lines ~542-705)
   - Billing header with back button
   - Plan summary
   - Payment method inputs (card number, MM/YY, CVC)
   - Billing address form
   - "Start 7-Day Free Trial" button

### State Variables to Remove
- `plan` (already removed)
- `showUpgradePanel` (needs to be removed)
- `showBillingPanel` (needs to be removed)

### Handler Functions to Remove
- `handlePlanChange` (lines ~137-145)
- `handleStartBilling` (lines ~147-150)

### Component Imports to Remove
- `UserIcon` (from lucide-react or custom)
- `Crown` (from lucide-react)
- `PlanButton` (custom component)
- `PremiumButton` (custom component)

### Components to Keep
- Profile Picture Section
- Personal Information Section (First Name, Last Name, Email)
- API Configuration Section

## Out of Scope

- Changes to API key storage/encryption logic
- Changes to backend API integration
- Changes to other settings panels
- Adding new features to UserPanel

## Success Criteria

1. UserPanel component compiles without errors
2. All subscription/billing UI is removed
3. Profile management works correctly
4. API key configuration works correctly
5. Component is visually clean and focused
6. README is updated to reflect changes
7. No broken references or missing imports

## Dependencies

- None - this is a self-contained refactoring

## Risks

- May need to update tests if they reference removed features
- Other components may reference the removed subscription features
- Documentation may need updates beyond just the README

## Timeline

- Estimated effort: 1-2 hours
- Priority: High (component is currently broken)
