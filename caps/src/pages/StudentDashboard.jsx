import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Clipboard, 
  Rocket, 
  Plus, 
  Zap, 
  Bell, 
  Trophy, 
  Lightbulb,
  Mail,
  User,
  Calendar,
  X
} from 'lucide-react';
import Header from '../components/Header';

const StudentDashboard = ({ user, onLogout }) => {
  const [myGroup, setMyGroup] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
        } else if (groupResponse.status !== 404) {
          console.error('Error fetching group:', groupResponse.status);
        }
      } catch (error) {
        console.error('Group fetch error:', error);
        // User doesn't have a group yet or network error
      }

      // Fetch notifications
      try {
        const notificationResponse = await fetch('http://localhost:5001/api/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (notificationResponse.ok) {
          const notificationData = await notificationResponse.json();
          setNotifications(notificationData.notifications?.slice(0, 3) || []);
        } else {
          console.error('Error fetching notifications:', notificationResponse.status);
          setNotifications([]);
        }
      } catch (error) {
        console.error('Notifications fetch error:', error);
        setNotifications([]);
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

  const handleDeleteGroup = async () => {
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/groups/${myGroup.groupId}/delete`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMyGroup(null);
        setShowDeleteModal(false);
        // Refresh dashboard data
        fetchDashboardData();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Delete group failed:', error);
      alert('Network error. Please try again.');
    }
    setDeleteLoading(false);
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
      <Header user={user} onLogout={onLogout} hasGroup={!!myGroup} />
      
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
            Welcome back, {user.name}! 
            <Users className="w-10 h-10 text-blue-500" />
          </h1>
          <p className="text-xl text-gray-600 font-semibold">
            Ready to collaborate on some awesome projects?
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Group Status */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Clipboard className="w-6 h-6 text-blue-500" />
                Your Group Status
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
                        <span className="font-bold text-gray-700">Faculty:</span> {myGroup.faculty?.user?.name || 'Not assigned'}
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">Members:</span> {myGroup.members?.length || 0}/4
                      </div>
                    </div>
                    
                    {/* Show rejection reason if rejected */}
                    {myGroup.status === 'REJECTED' && myGroup.rejectionReason && (
                      <div className="mt-4 p-4 bg-red-50 rounded-2xl border-2 border-red-300">
                        <h4 className="font-bold text-red-800 mb-2">Faculty Feedback:</h4>
                        <p className="text-red-700 text-sm whitespace-pre-line">{myGroup.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-4">
                    <Link
                      to="/my-group"
                      className="bg-blue-500 hover:bg-blue-600 text-white font-black py-3 px-6 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                    >
                      View Group Details
                    </Link>
                    
                    {myGroup.status === 'REJECTED' && (
                      <Link
                        to={`/create-group?edit=${myGroup.groupId}`}
                        className="bg-green-500 hover:bg-green-600 text-white font-black py-3 px-6 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                      >
                        Recreate Group
                      </Link>
                    )}
                    
                    {(myGroup.status === 'PENDING' || myGroup.status === 'REJECTED') && (
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="bg-red-500 hover:bg-red-600 text-white font-black py-3 px-6 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                      >
                        Delete Group
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4 flex justify-center">
                    <Rocket className="w-24 h-24 text-blue-500" />
                  </div>
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
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Quick Actions
              </h3>
              <div className="space-y-4">
                {!myGroup && (
                  <Link
                    to="/create-group"
                    className="block bg-green-100 hover:bg-green-200 p-4 rounded-2xl border-3 border-green-500 font-bold text-green-800 text-center transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create Group
                  </Link>
                )}
                {myGroup && (
                  <Link
                    to="/my-group"
                    className="block bg-blue-100 hover:bg-blue-200 p-4 rounded-2xl border-3 border-blue-500 font-bold text-blue-800 text-center transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <Users className="w-5 h-5" />
                    My Group
                  </Link>
                )}
                <div className="bg-purple-100 p-4 rounded-2xl border-3 border-purple-500 font-bold text-purple-800 text-center opacity-50 flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Achievements (Coming Soon)
                </div>
                <div className="bg-orange-100 p-4 rounded-2xl border-3 border-orange-500 font-bold text-orange-800 text-center opacity-50 flex items-center justify-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Project Ideas (Coming Soon)
                </div>
              </div>
            </div>

            {/* Recent Notifications */}
            <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-500" />
                Recent Notifications
              </h3>
              <div className="space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-2xl border-2 ${
                        notification.isRead ? 'bg-gray-300' : 
                        notification.type === 'GROUP_REJECTED' ? 'bg-red-50 border-red-500' :
                        notification.type === 'GROUP_APPROVED' ? 'bg-green-50 border-green-500' :
                        'bg-blue-50 border-blue-500'
                      }`}
                    >
                      <h4 className="font-bold text-sm text-gray-900">{notification.title}</h4>
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.sentAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <div className="text-2xl mb-2 flex justify-center">
                      <Mail className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-semibold">No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black max-w-md w-full mx-4">
            <h3 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-2">
              <X className="w-6 h-6 text-red-500" />
              Delete Group
            </h3>
            <p className="text-gray-600 mb-6 font-semibold">
              Are you sure you want to delete your group "{myGroup?.title}"? This action cannot be undone and all group members will be notified.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-2xl border-3 border-black transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={deleteLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-2xl border-3 border-black transition-all duration-200 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
