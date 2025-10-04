import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';

const Sidebar = ({ isOpen, setIsOpen, children }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const sidebarItems = {
    student: [
      { icon: '📊', label: 'Dashboard', path: '/dashboard' },
      { icon: '📝', label: 'Marks', path: '/marks' },
      { icon: '📅', label: 'Attendance', path: '/attendance' },
      { icon: '🔮', label: 'Predictions', path: '/predictions' },
      { icon: '📄', label: 'Reports', path: '/reports' },
    ],
    faculty: [
      { icon: '📊', label: 'Dashboard', path: '/dashboard' },
      { icon: '✏️', label: 'Enter Marks', path: '/enter-marks' },
      { icon: '📋', label: 'Attendance', path: '/manage-attendance' },
      { icon: '📈', label: 'Insights', path: '/insights' },
      { icon: '📢', label: 'Announcements', path: '/announcements' },
    ],
    tutor: [
      { icon: '📊', label: 'Dashboard', path: '/dashboard' },
      { icon: '✏️', label: 'Enter Marks', path: '/enter-marks' },
      { icon: '📋', label: 'Attendance', path: '/manage-attendance' },
      { icon: '📈', label: 'Insights', path: '/insights' },
      { icon: '🔮', label: 'ML Controls', path: '/ml-controls' },
      { icon: '📢', label: 'Announcements', path: '/announcements' },
    ],
    admin: [
      { icon: '📊', label: 'Dashboard', path: '/dashboard' },
      { icon: '👥', label: 'Users', path: '/users' },
      { icon: '📚', label: 'Subjects', path: '/subjects' },
      { icon: '🎓', label: 'Promotions', path: '/promotions' },
      { icon: '📢', label: 'System Announcements', path: '/system-announcements' },
    ]
  };

  const currentItems = sidebarItems[user?.role] || [];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-16'}
        ${isDark 
          ? 'bg-gray-900 border-gray-700' 
          : 'bg-white border-gray-200'
        }
        border-r shadow-lg backdrop-blur-lg bg-opacity-95
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-opacity-20">
          <div className={`transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              VisionGrade
            </h1>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`
              p-2 rounded-lg transition-colors duration-200
              ${isDark 
                ? 'hover:bg-gray-800 text-gray-300 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <svg 
              className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2">
          {currentItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? (isDark 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-500 text-white'
                      )
                    : (isDark 
                        ? 'hover:bg-gray-800 text-gray-300 hover:text-white' 
                        : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                      )
                  }
                  group
                `}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <span className={`
                  transition-all duration-300 font-medium
                  ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
                `}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-opacity-20 space-y-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`
              w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200
              ${isDark 
                ? 'hover:bg-gray-800 text-gray-300 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <span className="text-xl flex-shrink-0">
              {isDark ? '☀️' : '🌙'}
            </span>
            <span className={`
              transition-all duration-300 font-medium
              ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
            `}>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          {/* User Profile */}
          <div className={`
            flex items-center space-x-3 p-3 rounded-lg
            ${isDark ? 'bg-gray-800' : 'bg-gray-100'}
          `}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.student_name?.[0] || user?.faculty_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className={`
              transition-all duration-300 min-w-0
              ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
            `}>
              <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {user?.student_name || user?.faculty_name || 'User'}
              </p>
              <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {user?.role}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className={`
              w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200
              ${isDark 
                ? 'hover:bg-red-900 text-red-400 hover:text-red-300' 
                : 'hover:bg-red-50 text-red-600 hover:text-red-700'
              }
            `}
          >
            <span className="text-xl flex-shrink-0">🚪</span>
            <span className={`
              transition-all duration-300 font-medium
              ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
            `}>
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className={`
        transition-all duration-300 ease-in-out
        ${isOpen ? 'ml-64' : 'ml-16'}
      `}>
        {children}
      </div>
    </>
  );
};

export default Sidebar;