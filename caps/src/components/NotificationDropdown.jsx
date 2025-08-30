import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Mail, Calendar, User, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useToast } from '../context/ToastContext';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const { toast } = useToast();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    toast.success('All notifications marked as read', 'You\'re all caught up!');
  };

  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'GROUP_APPROVED':
        return <CheckCheck className="w-4 h-4 text-green-600" />;
      case 'GROUP_REJECTED':
        return <X className="w-4 h-4 text-red-600" />;
      case 'ANNOUNCEMENT':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'DEADLINE':
        return <Calendar className="w-4 h-4 text-orange-600" />;
      case 'MEMBER_ADDED':
        return <User className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationBg = (type, isRead) => {
    const baseClasses = isRead ? 'bg-gray-50' : 'bg-white';
    const borderClasses = isRead ? 'border-gray-200' : 'border-blue-300';
    return `${baseClasses} ${borderClasses}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-gray-200 hover:bg-gray-300 p-3 rounded-full border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl border-4 border-black shadow-brutal z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-50 p-4 border-b-3 border-blue-500">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Notifications
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full font-bold hover:bg-blue-600 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-bold">
                  {unreadCount} new
                </span>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-600 font-semibold">Loading notifications...</p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y-2 divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 transition-all duration-200 hover:bg-gray-50 cursor-pointer border-2 ${getNotificationBg(notification.type, notification.isRead)}`}
                    onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 p-2 rounded-xl border-2 border-black bg-white">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 mb-1">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500 font-semibold">
                            {new Date(notification.sentAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h4 className="font-bold text-gray-700 mb-2">No notifications</h4>
                <p className="text-sm text-gray-600">You're all caught up! Check back later for updates.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="bg-gray-50 p-3 border-t-2 border-gray-300 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-gray-600 hover:text-gray-800 font-bold"
              >
                Close notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
               