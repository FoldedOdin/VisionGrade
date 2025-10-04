import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Sidebar from '../common/Sidebar';

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen}>
        <div className="min-h-screen pt-20 p-4 lg:p-6">{/* Added pt-20 for navbar space */}
          {/* Mobile header */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`
                p-2 rounded-lg transition-colors duration-200
                ${isDark 
                  ? 'bg-gray-800 text-white hover:bg-gray-700' 
                  : 'bg-white text-gray-900 hover:bg-gray-100'
                }
                shadow-md
              `}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Main content */}
          <main className="animate-fade-in">
            {children}
          </main>
        </div>
      </Sidebar>
    </div>
  );
};

export default DashboardLayout;