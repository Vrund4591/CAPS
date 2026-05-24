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
import { useToast } from '../context/ToastContext';
import { apiUrl } from '../utils/api';

const StudentDashboard = ({ user, onLogout }) => {
  const [myGroup, setMyGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch user's group
      try {
        const groupResponse = await fetch(apiUrl('/api/groups/my-group'), {
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
      const response = await fetch(apiUrl(`/api/groups/${myGroup.groupId}/delete`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMyGroup(null);
        setShowDeleteModal(false);
        toast.success('Group Deleted', 'Your group has been successfully deleted.');
        fetchDashboardData();
      } else {
        const errorData = await response.json();
        toast.error('Delete Failed', errorData.message || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Delete group failed:', error);
      toast.error('Network Error', 'Please check your connection and try again.');
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
        <div className="max-w-screen mx-auto">
          {/* Welcome Section */}
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
                  <Rocket className="w-10 h-10 text-blue-500" />
                  Student Dashboard
                </h1>
                <p className="text-xl text-gray-600 font-semibold">
                  Welcome back, {user.name}! Ready to collaborate and innovate? 🚀
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 font-semibold">
                  {user.profile?.enrollmentNo && (
                    <div>📝 {user.profile.enrollmentNo}</div>
                  )}
                  {user.profile?.class && user.profile?.division && (
                    <div>🎓 {user.profile.class}-{user.profile.division}</div>
                  )}
                  {user.profile?.semester && (
                    <div>📚 Semester {user.profile.semester}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Group Status Section */}
            <div className="lg:col-span-2">
              {myGroup ? (
                <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                      <Users className="w-6 h-6 text-blue-500" />
                      My Group
                    </h2>
                    <span className={`px-4 py-2 rounded-full border-3 font-bold ${getStatusColor(myGroup.status)}`}>
                      {myGroup.status}
                    </span>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-2xl border-3 border-blue-500 mb-6">
                    <h3 className="text-xl font-bold text-blue-900 mb-2">{myGroup.title}</h3>
                    <p className="text-blue-700 mb-4">{myGroup.description}</p>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div><span className="font-bold">Group ID:</span> {myGroup.groupId}</div>
                      <div><span className="font-bold">Project Type:</span> {myGroup.projectType}</div>
                      <div><span className="font-bold">Members:</span> {myGroup.members?.length || 0}/4</div>
                      <div><span className="font-bold">Faculty:</span> {myGroup.faculty?.user?.name}</div>
                    </div>
                  </div>

                  {/* Status-specific messages */}
                  {myGroup.status === 'PENDING' && (
                    <div className="bg-yellow-50 p-4 rounded-2xl border-3 border-yellow-500 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-bold text-yellow-800">Waiting for Approval</h4>
                      </div>
                      <p className="text-yellow-700 text-sm">
                        Your group is under review by {myGroup.faculty?.user?.name}. You'll be notified once approved!
                      </p>
                    </div>
                  )}

                  {myGroup.status === 'ACTIVE' && (
                    <div className="bg-green-50 p-4 rounded-2xl border-3 border-green-500 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5 text-green-600" />
                        <h4 className="font-bold text-green-800">Group Approved!</h4>
                      </div>
                      <p className="text-green-700 text-sm">
                        Congratulations! Your group is now active. Start collaborating on your project!
                      </p>
                    </div>
                  )}

                  {myGroup.status === 'REJECTED' && (
                    <div className="bg-red-50 p-4 rounded-2xl border-3 border-red-500 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <X className="w-5 h-5 text-red-600" />
                        <h4 className="font-bold text-red-800">Group Rejected</h4>
                      </div>
                      <p className="text-red-700 text-sm mb-3">
                        Your group request was rejected. Please review the feedback and create a new group.
                      </p>
                      {myGroup.rejectionReason && (
                        <div className="bg-white p-3 rounded-xl border-2 border-red-300">
                          <p className="text-red-800 text-sm font-semibold">Feedback:</p>
                          <p className="text-red-700 text-sm">{myGroup.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Team Members */}
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Team Members ({myGroup.members?.length || 0}/4)
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {myGroup.members?.map((member) => (
                        <div 
                          key={member.id}
                          className={`p-3 rounded-xl border-2 ${
                            member.isLeader 
                              ? 'bg-yellow-50 border-yellow-500' 
                              : 'bg-gray-50 border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-bold text-gray-900">{member.student?.user?.name}</h5>
                              <p className="text-xs text-gray-600">{member.student?.enrollmentNo}</p>
                            </div>
                            {member.isLeader && (
                              <Crown className="w-4 h-4 text-yellow-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to="/my-group"
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2"
                    >
                      <Clipboard className="w-4 h-4" />
                      View Details
                    </Link>
                    
                    {(myGroup.status === 'PENDING' || myGroup.status === 'REJECTED') && (
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Delete Group
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
                  <div className="text-center">
                    <div className="text-6xl mb-6 flex justify-center">
                      <Users className="w-24 h-24 text-blue-500" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-4">No Group Yet</h2>
                    <p className="text-xl text-gray-600 mb-8">
                      Ready to start your collaborative journey? Create a group or join an existing one!
                    </p>
                    <Link
                      to="/create-group"
                      className="bg-blue-500 hover:bg-blue-600 text-white font-black py-4 px-8 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Create New Group
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  {!myGroup && (
                    <Link
                      to="/create-group"
                      className="w-full bg-blue-100 hover:bg-blue-200 p-3 rounded-2xl border-2 border-blue-500 font-bold text-blue-800 text-center transition-colors duration-200 flex items-center justify-center gap-2 block"
                    >
                      <Plus className="w-4 h-4" />
                      Create Group
                    </Link>
                  )}
                  
                  {myGroup && (
                    <Link
                      to="/my-group"
                      className="w-full bg-green-100 hover:bg-green-200 p-3 rounded-2xl border-2 border-green-500 font-bold text-green-800 text-center transition-colors duration-200 flex items-center justify-center gap-2 block"
                    >
                      <Users className="w-4 h-4" />
                      My Group
                    </Link>
                  )}
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-500" />
                  Notifications
                </h3>
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded-2xl border-2 border-blue-300">
                    <p className="text-blue-800 font-bold text-sm">📅 Upcoming Presentation</p>
                    <p className="text-blue-700 text-xs">Project presentations next week</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-2xl border-2 border-green-300">
                    <p className="text-green-800 font-bold text-sm">✅ Guidelines Updated</p>
                    <p className="text-green-700 text-xs">New project submission guidelines</p>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-orange-500" />
                  Pro Tips
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="bg-orange-50 p-3 rounded-2xl border-2 border-orange-300">
                    <p className="text-orange-800 font-bold">💡 Team Communication</p>
                    <p className="text-orange-700 text-xs">Regular meetings lead to better project outcomes</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-2xl border-2 border-purple-300">
                    <p className="text-purple-800 font-bold">🎯 Project Planning</p>
                    <p className="text-purple-700 text-xs">Break down tasks and set clear deadlines</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Group Confirmation Modal */}
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
