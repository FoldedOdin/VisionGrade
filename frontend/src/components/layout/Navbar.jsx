import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  const handleLogoClick = () => {
    navigate('/');
    setIsMenuOpen(false);
  };

  const handleSmoothScroll = (targetId) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button 
              onClick={handleLogoClick}
              className="flex-shrink-0 flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img 
                src="/VG.svg" 
                alt="VisionGrade" 
                className="h-8 w-8"
              />
              <h1 className="text-2xl font-bold text-white">
                VisionGrade
              </h1>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <button 
                onClick={() => handleSmoothScroll('features')}
                className="text-white/90 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
              >
                Features
              </button>
              <button 
                onClick={() => handleSmoothScroll('about')}
                className="text-white/90 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
              >
                About
              </button>
              <button 
                onClick={() => handleSmoothScroll('contact')}
                className="text-white/90 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
              >
                Contact
              </button>
              <a href="/demo" className="text-white/90 hover:text-white px-3 py-2 text-sm font-medium transition-colors">
                Demo
              </a>
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center space-x-4">
              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => window.authManager?.openLogin()}
                    className="text-white/90 hover:text-white px-4 py-2 text-sm font-medium transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => window.authManager?.openSignup()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Get Started
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <span className="text-white/90 text-sm">
                    Welcome, {user?.name || user?.email}
                  </span>
                  <button
                    onClick={() => window.authManager?.openProfile()}
                    className="text-white/90 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white/90 hover:text-white p-2"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-black/20 backdrop-blur-md">
            <button 
              onClick={() => handleSmoothScroll('features')}
              className="text-white/90 hover:text-white block px-3 py-2 text-base font-medium w-full text-left"
            >
              Features
            </button>
            <button 
              onClick={() => handleSmoothScroll('about')}
              className="text-white/90 hover:text-white block px-3 py-2 text-base font-medium w-full text-left"
            >
              About
            </button>
            <button 
              onClick={() => handleSmoothScroll('contact')}
              className="text-white/90 hover:text-white block px-3 py-2 text-base font-medium w-full text-left"
            >
              Contact
            </button>
            <a href="/demo" className="text-white/90 hover:text-white block px-3 py-2 text-base font-medium">
              Demo
            </a>
            
            {!isAuthenticated ? (
              <div className="pt-4 pb-3 border-t border-white/20">
                <button
                  onClick={() => {
                    window.authManager?.openLogin();
                    setIsMenuOpen(false);
                  }}
                  className="text-white/90 hover:text-white block px-3 py-2 text-base font-medium w-full text-left"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    window.authManager?.openSignup();
                    setIsMenuOpen(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white block px-3 py-2 rounded-lg text-base font-medium mt-2 w-full text-left"
                >
                  Get Started
                </button>
              </div>
            ) : (
              <div className="pt-4 pb-3 border-t border-white/20">
                <div className="text-white/90 px-3 py-2 text-base">
                  Welcome, {user?.name || user?.email}
                </div>
                <button
                  onClick={() => {
                    window.authManager?.openProfile();
                    setIsMenuOpen(false);
                  }}
                  className="text-white/90 hover:text-white block px-3 py-2 text-base font-medium w-full text-left"
                >
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white block px-3 py-2 rounded-lg text-base font-medium mt-2 w-full text-left"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;