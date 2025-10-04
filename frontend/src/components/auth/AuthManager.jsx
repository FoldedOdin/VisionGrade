import React, { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import ProfileManager from './ProfileManager';
import { useAuth } from '../../hooks/useAuth';

const AuthManager = () => {
  const [activeForm, setActiveForm] = useState(null); // 'login', 'signup', 'forgot', 'profile'
  const { user } = useAuth();

  const openLogin = () => setActiveForm('login');
  const openSignup = () => setActiveForm('signup');
  const openForgotPassword = () => setActiveForm('forgot');
  const openProfile = () => setActiveForm('profile');
  const closeAll = () => setActiveForm(null);

  const switchToLogin = () => setActiveForm('login');
  const switchToSignup = () => setActiveForm('signup');
  const switchToForgotPassword = () => setActiveForm('forgot');

  // Expose functions globally for landing page buttons
  React.useEffect(() => {
    window.authManager = {
      openLogin,
      openSignup,
      openForgotPassword,
      openProfile,
      closeAll
    };
    
    return () => {
      delete window.authManager;
    };
  }, []);

  return (
    <>
      {/* Login Form */}
      <LoginForm
        isOpen={activeForm === 'login'}
        onClose={closeAll}
        onSwitchToSignup={switchToSignup}
        onSwitchToForgotPassword={switchToForgotPassword}
      />

      {/* Signup Form */}
      <SignupForm
        isOpen={activeForm === 'signup'}
        onClose={closeAll}
        onSwitchToLogin={switchToLogin}
      />

      {/* Forgot Password Form */}
      <ForgotPasswordForm
        isOpen={activeForm === 'forgot'}
        onClose={closeAll}
        onSwitchToLogin={switchToLogin}
      />

      {/* Profile Manager */}
      <ProfileManager
        isOpen={activeForm === 'profile'}
        onClose={closeAll}
        user={user}
      />

      {/* Export functions for external use */}
      {React.createElement(() => {
        // Attach functions to window for global access (development only)
        if (typeof window !== 'undefined') {
          window.authManager = {
            openLogin,
            openSignup,
            openForgotPassword,
            openProfile
          };
        }
        return null;
      })}
    </>
  );
};

export default AuthManager;