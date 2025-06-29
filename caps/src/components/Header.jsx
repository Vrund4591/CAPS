import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

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
    const links = [{ path: basePath, label: '🏠 Dashboard' }];

    if (user.role === 'STUDENT') {
      links.push(
        { path: '/create-group', label: '➕ Create Group' },
        { path: '/my-group', label: '👥 My Group' }
      );
    }

    return links;
  };

  return (
    <header className="bg-white shadow-2xl border-b-4 border-black sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-black text-2xl px-4 py-2 rounded-2xl border-3 border-black">
              CAPS
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {getNavigationLinks().map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-bold px-4 py-2 rounded-2xl border-2 transition-all duration-200 ${
                  location.pathname === link.path
                    ? 'bg-blue-500 text-white border-black'
                    : 'text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-500'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-3">
              <div className={`${getRoleColor(user.role)} text-white px-3 py-1 rounded-full border-2 border-black text-sm font-bold`}>
                {user.role}
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
            
            <button
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
            >
              🚪 Logout
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden bg-gray-200 p-2 rounded-2xl border-2 border-gray-400"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t-2 border-gray-200">
            <div className="flex flex-col space-y-3">
              {getNavigationLinks().map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`font-bold px-4 py-3 rounded-2xl border-2 transition-all duration-200 ${
                    location.pathname === link.path
                      ? 'bg-blue-500 text-white border-black'
                      : 'text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-500'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Mobile User Info */}
              <div className="sm:hidden bg-gray-100 p-4 rounded-2xl border-2 border-gray-300">
                <div className="flex items-center space-x-3">
                  <div className={`${getRoleColor(user.role)} text-white px-3 py-1 rounded-full border-2 border-black text-sm font-bold`}>
                    {user.role}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
