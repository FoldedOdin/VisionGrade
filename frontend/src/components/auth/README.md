# Authentication Components

This directory contains all authentication-related React components for the VisionGrade frontend application.

## Components

### LoginForm
A floating glassmorphism-styled login popup that supports multiple login methods:
- **Features:**
  - Multi-channel login (ID, email, phone)
  - Password visibility toggle
  - Form validation with real-time feedback
  - Smooth animations with Framer Motion
  - Glassmorphism styling with backdrop blur

- **Props:**
  - `isOpen` (boolean): Controls visibility of the form
  - `onClose` (function): Callback when form is closed
  - `onSwitchToSignup` (function): Callback to switch to signup form
  - `onSwitchToForgotPassword` (function): Callback to switch to forgot password form

### SignupForm
A comprehensive registration form with validation:
- **Features:**
  - Full name, email, phone, and role fields
  - Password strength validation
  - Password confirmation matching
  - Role selection (student, faculty, admin)
  - Real-time form validation

- **Props:**
  - `isOpen` (boolean): Controls visibility of the form
  - `onClose` (function): Callback when form is closed
  - `onSwitchToLogin` (function): Callback to switch to login form

### ForgotPasswordForm
Password reset form with email/phone options:
- **Features:**
  - Email or phone-based password reset
  - Success state with confirmation message
  - Resend functionality
  - Method switching (email/phone)

- **Props:**
  - `isOpen` (boolean): Controls visibility of the form
  - `onClose` (function): Callback when form is closed
  - `onSwitchToLogin` (function): Callback to switch to login form

### ProfileManager
Comprehensive profile management interface:
- **Features:**
  - Profile photo upload with validation
  - Personal information editing
  - Password change functionality
  - Form validation and error handling
  - File upload with preview

- **Props:**
  - `isOpen` (boolean): Controls visibility of the form
  - `onClose` (function): Callback when form is closed
  - `user` (object): Current user data

### AuthManager
Central component that manages all authentication forms:
- **Features:**
  - Centralized form state management
  - Global access via window.authManager
  - Form switching logic
  - Integration with authentication context

## Hooks

### useAuth
React context hook for authentication state management:
- **Features:**
  - User state management
  - Authentication status tracking
  - Login/logout functionality
  - Profile updates
  - Password reset requests

- **Returns:**
  - `user`: Current user object
  - `isLoading`: Loading state
  - `isAuthenticated`: Authentication status
  - `login(credentials)`: Login function
  - `signup(userData)`: Signup function
  - `logout()`: Logout function
  - `updateProfile(profileData)`: Profile update function
  - `forgotPassword(contact, method)`: Password reset function

## Services

### authService
API service for authentication endpoints:
- **Methods:**
  - `login(credentials)`: Authenticate user
  - `signup(userData)`: Register new user
  - `getProfile()`: Get current user profile
  - `updateProfile(profileData)`: Update user profile
  - `forgotPassword(contact, method)`: Request password reset
  - `resetPassword(token, newPassword)`: Reset password with token
  - `changePassword(currentPassword, newPassword)`: Change password
  - `logout()`: Logout user
  - `verifyToken()`: Verify token validity

## Utilities

### validation.js
Form validation utilities and rules:
- **Functions:**
  - `validateEmail(email)`: Email format validation
  - `validatePhone(phone)`: Phone number validation
  - `validatePassword(password)`: Password strength validation
  - `validateName(name)`: Name format validation
  - `validateId(id)`: ID format validation
  - `validateProfilePhoto(file)`: Profile photo validation
  - `getPasswordStrength(password)`: Password strength indicator

## Usage

### Basic Setup
```jsx
import { AuthProvider, AuthManager } from './components/auth';

function App() {
  return (
    <AuthProvider>
      <AuthManager />
      {/* Your app content */}
    </AuthProvider>
  );
}
```

### Using Authentication Hook
```jsx
import { useAuth } from './components/auth';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.fullName}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Opening Authentication Forms
```jsx
// From anywhere in your app
window.authManager.openLogin();
window.authManager.openSignup();
window.authManager.openProfile();
window.authManager.openForgotPassword();
```

## Styling

All components use:
- **Tailwind CSS** for styling
- **Glassmorphism** effects with backdrop blur
- **Framer Motion** for smooth animations
- **Lucide React** for icons
- **React Hot Toast** for notifications

## Form Validation

All forms include:
- Real-time validation feedback
- Error message display
- Loading states
- Success/error notifications
- Accessibility features

## Requirements Covered

This implementation covers the following requirements:
- **1.1**: Auto-generated unique IDs for new users
- **1.2**: Multi-channel login (ID, email, phone) with password
- **1.3**: Password reset via email or phone
- **1.4**: Profile photo upload and management
- **10.1**: Glassmorphism styling for login popup

## Testing

Test files are located in the `__tests__` directory:
- `LoginForm.test.jsx`: Tests for login form functionality
- `AuthManager.test.jsx`: Tests for authentication manager

Run tests with:
```bash
npm test
```