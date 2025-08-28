import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Plus, Users, LogOut, Menu, User } from 'lucide-react';

const Header = ({ user, onLogout, hasGroup = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const location = useLocation();

  // Close profile popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getRoleColor = (role) => {
    switch (role) {
      case 'STUDENT': return 'bg-blue-500';
      case 'FACULTY': return 'bg-purple-500';
      case 'ADMIN': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getNavigationLinks = () => {
    const basePath = `/${user.role.toLowerCase()}-dashboard`;
    const links = [{ path: basePath, label: 'Dashboard', icon: Home }];

    if (user.role === 'STUDENT') {
      links.push(
        { 
          path: '/create-group', 
          label: 'Create Group', 
          icon: Plus,
          disabled: hasGroup 
        },
        { path: '/my-group', label: 'My Group', icon: Users }
      );
    }

    return links;
  };

  return (
    <header className="bg-white shadow-2xl border-b-4 border-black sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-">
            <img
              src="/caps1.svg"
              alt="CAPS Logo"
              className="w-12 h-12"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {getNavigationLinks().map((link) => {
              const IconComponent = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.disabled ? '#' : link.path}
                  className={`font-bold px-4 py-2 rounded-2xl border-2 transition-all duration-200 flex items-center gap-2 ${
                    link.disabled
                      ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed opacity-50'
                      : location.pathname === link.path
                      ? 'bg-blue-500 text-white border-black'
                      : 'text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-500'
                  }`}
                  onClick={(e) => {
                    if (link.disabled) {
                      e.preventDefault();
                    }
                  }}
                  title={link.disabled ? 'You are already in a group' : ''}
                >
                  <IconComponent className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Profile Icon */}
          <div className="flex items-center space-x-4">
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="bg-gray-200 hover:bg-gray-300 p-3 rounded-full border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                <User className="w-6 h-6 text-gray-700" />
              </button>

              {/* Profile Popup */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border-3 border-black shadow-brutal z-50">
                  <div className="p-6">
                    {/* User Info */}
                    <div className="text-center mb-4">
                      <h3 className="font-black text-xl text-gray-900 mb-2">{user.name}</h3>
                      <p className="text-gray-600 font-medium mb-3">{user.email}</p>
                      <div className="flex justify-center">
                        <div className={`${getRoleColor(user.role)} text-white px-4 py-2 rounded-xl border-3 border-black font-bold text-sm shadow-brutal`}>
                          {user.role}
                        </div>
                      </div>
                    </div>
                    
                    {/* Logout Button */}
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden bg-gray-200 p-2 rounded-2xl border-2 border-gray-400"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t-2 border-gray-200">
            <div className="flex flex-col space-y-3">
              {getNavigationLinks().map((link) => {
                const IconComponent = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.disabled ? '#' : link.path}
                    onClick={(e) => {
                      if (link.disabled) {
                        e.preventDefault();
                      } else {
                        setIsMenuOpen(false);
                      }
                    }}
                    className={`font-bold px-4 py-3 rounded-2xl border-2 transition-all duration-200 flex items-center gap-2 ${
                      link.disabled
                        ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed opacity-50'
                        : location.pathname === link.path
                        ? 'bg-blue-500 text-white border-black'
                        : 'text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-500'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
