import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Clock, 
  CheckCircle, 
  Check, 
  X, 
  Users,
  BarChart3,
  Bell,
  Mail
} from 'lucide-react';
import Header from '../components/Header';

const FacultyDashboard = ({ user, onLogout }) => {
  const [groups, setGroups] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch faculty groups
      const groupsResponse = await fetch('http://localhost:5001/api/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        setGroups(groupsData.groups);
      }

      // Fetch notifications
      const notificationResponse = await fetch('http://localhost:5001/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (notificationResponse.ok) {
        const notificationData = await notificationResponse.json();
        setNotifications(notificationData.notifications.slice(0, 5));
      }

    } catch (error) {
      console.error('Dashboard data fetch failed:', error);
    }
    setLoading(false);
  };

  const handleGroupAction = async (groupId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/groups/${groupId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Group action failed:', error);
    }
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
      <div className="min-h-screen" style={{backgroundColor: '#FFFFF4'}}>
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

  const pendingGroups = groups.filter(group => group.status === 'PENDING');
  const activeGroups = groups.filter(group => group.status === 'ACTIVE');

  return (
    <div className="min-h-screen" style={{backgroundColor: '#FFFFF4'}}>
      <Header user={user} onLogout={onLogout} />
      
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
            Welcome, Prof. {user.name}! 
            <GraduationCap className="w-10 h-10 text-blue-500" />
          </h1>
          <p className="text-xl text-gray-600 font-semibold">
            Manage student groups and oversee project assignments
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Pending Group Requests */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black mb-8">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-yellow-500" />
                Pending Group Requests ({pendingGroups.length})
              </h2>
              
              {pendingGroups.length > 0 ? (
                <div className="space-y-6">
                  {pendingGroups.map((group) => (
                    <div key={group.id} className="bg-yellow-50 p-6 rounded-2xl border-3 border-yellow-500">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{group.title}</h3>
                          <p className="text-sm text-gray-600">Group ID: {group.groupId}</p>
                        </div>
                        <span className={`px-4 py-2 rounded-full border-2 font-bold text-sm ${getStatusColor(group.status)}`}>
                          {group.status}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 mb-4">{group.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div><span className="font-bold">Project Type:</span> {group.projectType}</div>
                        <div><span className="font-bold">Members:</span> {group.members.length}</div>
                        <div><span className="font-bold">Team Leader:</span> {group.teamLeader.user.name}</div>
                        <div><span className="font-bold">Created:</span> {new Date(group.createdAt).toLocaleDateString()}</div>
                      </div>

                      {group.frontendTech && (
                        <div className="mb-4">
                          <span className="font-bold text-sm">Frontend:</span> {group.frontendTech}
                        </div>
                      )}
                      
                      {group.backendTech && (
                        <div className="mb-4">
                          <span className="font-bold text-sm">Backend:</span> {group.backendTech}
                        </div>
                      )}

                      <div className="mb-4">
                        <span className="font-bold text-sm">Team Members:</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.members.map((member) => (
                            <span key={member.id} className={`px-3 py-1 rounded-full text-xs font-bold ${member.isLeader ? 'bg-blue-100 text-blue-800 border-2 border-blue-500' : 'bg-gray-100 text-gray-700 border-2 border-gray-400'}`}>
                              {member.student.user.name} {member.isLeader && '(Leader)'}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex space-x-4">
                        <button
                          onClick={() => handleGroupAction(group.groupId, 'APPROVED')}
                          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleGroupAction(group.groupId, 'REJECTED')}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4 flex justify-center">
                    <Users className="w-16 h-16 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700 mb-2">No pending requests</h3>
                  <p className="text-gray-600">All groups have been reviewed</p>
                </div>
              )}
            </div>

            {/* Active Groups */}
            <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                Active Groups ({activeGroups.length})
              </h2>
              
              {activeGroups.length > 0 ? (
                <div className="grid gap-4">
                  {activeGroups.map((group) => (
                    <div key={group.id} className="bg-green-50 p-4 rounded-2xl border-3 border-green-500">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-gray-900">{group.title}</h3>
                          <p className="text-sm text-gray-600">
                            Leader: {group.teamLeader.user.name} | Members: {group.members.length}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full border-2 font-bold text-sm ${getStatusColor(group.status)}`}>
                          {group.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4 flex justify-center">
                    <Users className="w-12 h-12" />
                  </div>
                  <p className="font-semibold">No active groups yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats & Notifications */}
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-500" />
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="bg-yellow-100 p-4 rounded-2xl border-3 border-yellow-500">
                  <div className="text-2xl font-black text-yellow-800">{pendingGroups.length}</div>
                  <div className="text-sm font-bold text-yellow-700">Pending Requests</div>
                </div>
                <div className="bg-green-100 p-4 rounded-2xl border-3 border-green-500">
                  <div className="text-2xl font-black text-green-800">{activeGroups.length}</div>
                  <div className="text-sm font-bold text-green-700">Active Groups</div>
                </div>
                <div className="bg-blue-100 p-4 rounded-2xl border-3 border-blue-500">
                  <div className="text-2xl font-black text-blue-800">{groups.length}</div>
                  <div className="text-sm font-bold text-blue-700">Total Groups</div>
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
                    <div className="text-2xl mb-2 flex justify-center">
                      <Mail className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-semibold">No notifications</p>
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

export default FacultyDashboard;
