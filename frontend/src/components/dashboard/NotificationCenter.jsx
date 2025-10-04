import React, { useState, useRef, useEffect } from 'react';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

const NotificationCenter = ({ notifications, onNotificationRead }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef(null);

  // Count unread notifications
  const unreadCount = notifications.filter(notif => !notif.is_read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Animate bell when new notifications arrive
  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      onNotificationRead(notification.id);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'system':
        return '🔧';
      case 'academic':
        return '📚';
      case 'auto':
        return '⚠️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'system':
        return 'border-blue-400 bg-blue-900 bg-opacity-20';
      case 'academic':
        return 'border-green-400 bg-green-900 bg-opacity-20';
      case 'auto':
        return 'border-red-400 bg-red-900 bg-opacity-20';
      default:
        return 'border-gray-400 bg-gray-900 bg-opacity-20';
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg border border-white border-opacity-20 hover:bg-opacity-20 transition-all duration-200 ${
          isAnimating ? 'animate-bounce' : ''
        }`}
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="h-6 w-6 text-yellow-400" />
        ) : (
          <BellIcon className="h-6 w-6 text-white" />
        )}
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl border border-white border-opacity-20 shadow-2xl z-[9999] max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white border-opacity-20">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <BellIcon className="h-12 w-12 text-white text-opacity-40 mx-auto mb-3" />
                <p className="text-white text-opacity-60">No notifications</p>
                <p className="text-white text-opacity-40 text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-white divide-opacity-10">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-white hover:bg-opacity-5 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-white bg-opacity-5' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Notification Icon */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm border ${getNotificationColor(notification.notification_type)}`}>
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      
                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-medium ${notification.is_read ? 'text-white text-opacity-80' : 'text-white'}`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        
                        <p className={`text-sm ${notification.is_read ? 'text-white text-opacity-60' : 'text-white text-opacity-80'} line-clamp-2`}>
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-white text-opacity-50">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          
                          {/* Notification Type Badge */}
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            notification.notification_type === 'system' ? 'border-blue-400 text-blue-300 bg-blue-900 bg-opacity-20' :
                            notification.notification_type === 'academic' ? 'border-green-400 text-green-300 bg-green-900 bg-opacity-20' :
                            'border-red-400 text-red-300 bg-red-900 bg-opacity-20'
                          }`}>
                            {notification.notification_type === 'system' ? 'System' :
                             notification.notification_type === 'academic' ? 'Academic' : 'Alert'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-white border-opacity-20 text-center">
              <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;