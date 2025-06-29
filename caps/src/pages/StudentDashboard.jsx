import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

const StudentDashboard = ({ user, onLogout }) => {
  const [myGroup, setMyGroup] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch user's group
      try {
        const groupResponse = await fetch('http://localhost:5001/api/groups/my-group', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (groupResponse.ok) {
          const groupData = await groupResponse.json();
          setMyGroup(groupData.group);
        }
      } catch (error) {
        // User doesn't have a group yet
      }

      // Fetch notifications
      const notificationResponse = await fetch('http://localhost:5001/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (notificationResponse.ok) {
        const notificationData = await notificationResponse.json();
        setNotifications(notificationData.notifications.slice(0, 3));
      }

    } catch (error) {
      console.error('Dashboard data fetch failed:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-500';
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-500';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-500';
      default: return 'bg-gray-100 text-gray-800 border-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <Header user={user} onLogout={onLogout} />
        <div className="flex items-center justify-center h-96">
          <div className="bg-white p-8 rounded-2xl shadow-lg border-4 border-black">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 font-bold text-gray-800">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Header user={user} onLogout={onLogout} />
      
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="text-xl text-gray-600 font-semibold">
            Ready to collaborate on some awesome projects?
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Group Status */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
              <h2 className="text-2xl font-black text-gray-900 mb-6">
                📋 Your Group Status
              </h2>
              
              {myGroup ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-6 rounded-2xl border-3 border-gray-300">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{myGroup.title}</h3>
                      <span className={`px-4 py-2 rounded-full border-2 font-bold text-sm ${getStatusColor(myGroup.status)}`}>
                        {myGroup.status}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{myGroup.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-bold text-gray-700">Group ID:</span> {myGroup.groupId}
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">Project Type:</span> {myGroup.projectType}
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">Faculty:</span> {myGroup.faculty.user.name}
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">Members:</span> {myGroup.members.length}
                      </div>
                    </div>
                  </div>
                  
                  <Link
                    to="/my-group"
                    className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-black py-3 px-6 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                  >
                    View Group Details
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🚀</div>
                  <h3 className="text-xl font-bold text-gray-700 mb-4">
                    You're not in a group yet!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create a new group or join an existing one to start collaborating.
                  </p>
                  <Link
                    to="/create-group"
                    className="bg-green-500 hover:bg-green-600 text-white font-black py-3 px-6 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                  >
                    Create New Group
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Notifications */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
              <h3 className="text-xl font-black text-gray-900 mb-6">⚡ Quick Actions</h3>
              <div className="space-y-4">
                {!myGroup && (
                  <Link
                    to="/create-group"
                    className="block bg-green-100 hover:bg-green-200 p-4 rounded-2xl border-3 border-green-500 font-bold text-green-800 text-center transition-colors duration-200"
                  >
                    ➕ Create Group
                  </Link>
                )}
                {myGroup && (
                  <Link
                    to="/my-group"
                    className="block bg-blue-100 hover:bg-blue-200 p-4 rounded-2xl border-3 border-blue-500 font-bold text-blue-800 text-center transition-colors duration-200"
                  >
                    👥 My Group
                  </Link>
                )}
                <div className="bg-purple-100 p-4 rounded-2xl border-3 border-purple-500 font-bold text-purple-800 text-center opacity-50">
                  🏆 Achievements (Coming Soon)
                </div>
                <div className="bg-orange-100 p-4 rounded-2xl border-3 border-orange-500 font-bold text-orange-800 text-center opacity-50">
                  💡 Project Ideas (Coming Soon)
                </div>
              </div>
            </div>

            {/* Recent Notifications */}
            <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
              <h3 className="text-xl font-black text-gray-900 mb-6">🔔 Recent Notifications</h3>
              <div className="space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-2xl border-2 ${
                        notification.isRead ? 'bg-gray-50 border-gray-300' : 'bg-blue-50 border-blue-500'
                      }`}
                    >
                      <h4 className="font-bold text-sm text-gray-900">{notification.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.sentAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <div className="text-2xl mb-2">📭</div>
                    <p className="text-sm font-semibold">No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
