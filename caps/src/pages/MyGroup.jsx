import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Rocket, 
  Clipboard, 
  Clock, 
  X, 
  Crown,
  User,
  Mail,
  Calendar,
  FileText,
  MessageCircle,
  BarChart3,
  GraduationCap,
  Zap
} from 'lucide-react';
import Header from '../components/Header';
import { useToast } from '../context/ToastContext';

const MyGroup = ({ user, onLogout }) => {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchGroupData();
  }, []);

  const fetchGroupData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/groups/my-group', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGroup(data.group);
      } else {
        setError('You are not part of any group yet');
      }
    } catch (err) {
      setError(`Failed to load group data: ${err.message}`);
    }
    setLoading(false);
  };

  const handleDeleteGroup = async () => {
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/groups/${group.groupId}/delete`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Group Deleted', 'Your group has been successfully deleted');
        navigate('/student-dashboard');
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-500';
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-500';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-500';
      default: return 'bg-gray-100 text-gray-800 border-gray-500';
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'PENDING': return 'Your group is waiting for faculty approval. You will be notified once approved.';
      case 'ACTIVE': return 'Congratulations! Your group has been approved and is now active.';
      case 'REJECTED': return 'Unfortunately, your group request was rejected. Please check the rejection reason below and create a new group with improvements.';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#FFFFF4'}}>
        <Header user={user} onLogout={onLogout} />
        <div className="flex items-center justify-center h-96">
          <div className="bg-white p-8 rounded-2xl shadow-lg border-4 border-black">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 font-bold text-gray-800">Loading group details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#FFFFF4'}}>
        <Header user={user} onLogout={onLogout} />
        
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black text-center">
              <div className="text-6xl mb-4 flex justify-center">
                <Rocket className="w-24 h-24 text-blue-500" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-4">No Group Found</h1>
              <p className="text-xl text-gray-600 mb-8">
                You're not part of any group yet. Create a new group to start collaborating!
              </p>
              <Link
                to="/create-group"
                className="bg-blue-500 hover:bg-blue-600 text-white font-black py-4 px-8 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                Create New Group
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#FFFFF4'}}>
      <Header user={user} onLogout={onLogout} hasGroup={!!group} />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-screen mx-auto">
          {/* Header */}
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
                  <Users className="w-10 h-10 text-blue-500" />
                  My Group
                </h1>
                <p className="text-xl text-gray-600 font-semibold">
                  View your group details and collaboration progress
                </p>
              </div>
              <span className={`px-6 py-3 rounded-full border-3 font-black text-lg ${getStatusColor(group.status)}`}>
                {group.status}
              </span>
            </div>
          </div>

          {/* Status Message */}
          {group.status !== 'ACTIVE' && (
            <div className={`p-6 rounded-3xl border-3 mb-8 ${getStatusColor(group.status)}`}>
              <h3 className="font-black text-lg mb-2 flex items-center gap-2">
                {group.status === 'PENDING' ? (
                  <>
                    <Clock className="w-5 h-5" />
                    Waiting for Approval
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5" />
                    Request Rejected
                  </>
                )}
              </h3>
              <p className="font-semibold mb-3">{getStatusMessage(group.status)}</p>
              
              {group.status === 'REJECTED' && group.rejectionReason && (
                <div className="bg-white p-4 rounded-2xl border-2 border-red-400 mt-4">
                  <h4 className="font-bold text-red-800 mb-2">Faculty Feedback:</h4>
                  <p className="text-red-700 font-semibold whitespace-pre-line">{group.rejectionReason}</p>
                </div>
              )}
              
              {group.status === 'REJECTED' && (
                <div className="mt-6 flex space-x-4">
                  <Link
                    to={`/create-group?edit=${group.groupId}`}
                    className="bg-green-500 hover:bg-green-600 text-white font-black py-3 px-6 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex items-center gap-2"
                  >
                    Recreate Group
                  </Link>
                  {/* <Link
                    to="/create-group"
                    className="bg-blue-500 hover:bg-blue-600 text-white font-black py-3 px-6 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex items-center gap-2"
                  >
                    <Rocket className="w-5 h-5" />
                    Start Fresh
                  </Link> */}
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="bg-red-500 hover:bg-red-600 text-white font-black py-3 px-6 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex items-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Delete
                  </button>
                </div>
              )}
              
              {group.status === 'PENDING' && (
                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="bg-red-500 hover:bg-red-600 text-white font-black py-3 px-6 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex items-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Delete Group
                  </button>
                  <div className="bg-gray-100 p-3 rounded-2xl border-2 border-gray-300 text-gray-600 text-sm font-semibold">
                    💡 You can delete your group while it's pending if you want to create a new one
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Group Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Project Details */}
              <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
                <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <Clipboard className="w-6 h-6 text-blue-500" />
                  Project Details
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{group.title}</h3>
                    <p className="text-gray-700 leading-relaxed">{group.description}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 p-4 rounded-2xl border-3 border-blue-500">
                      <h4 className="font-bold text-blue-800 mb-2">Group Information</h4>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-bold">Group ID:</span> {group.groupId}</div>
                        <div><span className="font-bold">Project Type:</span> {group.projectType}</div>
                        <div><span className="font-bold">Created:</span> {new Date(group.createdAt).toLocaleDateString()}</div>
                        <div><span className="font-bold">Members:</span> {group.members.length}/4</div>
                      </div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-2xl border-3 border-purple-500">
                      <h4 className="font-bold text-purple-800 mb-2">Technology Stack</h4>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-bold">Frontend:</span> {group.frontendTech || 'Not specified'}</div>
                        <div><span className="font-bold">Backend:</span> {group.backendTech || 'Not specified'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
                <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-500" />
                  Team Members ({group.members.length}/4)
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {group.members.map((member) => (
                    <div 
                      key={member.id}
                      className={`p-6 rounded-2xl border-3 ${
                        member.isLeader 
                          ? 'bg-yellow-50 border-yellow-500' 
                          : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white ${
                          member.isLeader ? 'bg-yellow-500' : 'bg-gray-500'
                        }`}>
                          {member.student.user.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            {member.student.user.name}
                            {member.isLeader && <Crown className="w-4 h-4 text-yellow-600" />}
                          </h3>
                          <p className="text-sm text-gray-600">{member.student.user.email}</p>
                          <p className="text-sm text-gray-600">
                            {member.student.enrollmentNo} | {member.student.class}-{member.student.division}
                          </p>
                          {member.isLeader && (
                            <span className="inline-block mt-1 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-bold rounded-full">
                              Team Leader
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Faculty Supervisor */}
              <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                  Faculty Supervisor
                </h3>
                <div className="bg-indigo-50 p-4 rounded-2xl border-3 border-indigo-500">
                  <h4 className="font-bold text-indigo-900">{group.faculty.user.name}</h4>
                  <p className="text-sm text-indigo-700">{group.faculty.user.email}</p>
                  <p className="text-sm text-indigo-700">{group.faculty.department} Department</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  {group.status === 'ACTIVE' && (
                    <div className="bg-green-100 p-3 rounded-2xl border-2 border-green-500 text-center">
                      <div className="text-2xl mb-2 flex justify-center">
                        <FileText className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="font-bold text-green-800 text-sm mb-2">Project Active</div>
                      <div className="text-xs text-green-700">Your group is approved and ready for project work!</div>
                    </div>
                  )}
                  <div className="bg-blue-100 p-3 rounded-2xl border-2 border-blue-500 text-center">
                    <div className="text-2xl mb-2 flex justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="font-bold text-blue-800 text-sm mb-2">Project Files</div>
                    <button className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      Coming Soon
                    </button>
                  </div>
                  
                  <div className="bg-green-100 p-3 rounded-2xl border-2 border-green-500 text-center">
                    <div className="text-2xl mb-2 flex justify-center">
                      <MessageCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="font-bold text-green-800 text-sm mb-2">Team Chat</div>
                    <button className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      Coming Soon
                    </button>
                  </div>
                  
                  <div className="bg-purple-100 p-3 rounded-2xl border-2 border-purple-500 text-center">
                    <div className="text-2xl mb-2 flex justify-center">
                      <BarChart3 className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="font-bold text-purple-800 text-sm mb-2">Progress Tracker</div>
                    <button className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>

              {/* Group Stats */}
              <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-500" />
                  Group Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-700">Days Active:</span>
                    <span className="text-gray-900 font-black">
                      {Math.ceil((new Date() - new Date(group.createdAt)) / (1000 * 60 * 60 * 24))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-700">Team Size:</span>
                    <span className="text-gray-900 font-black">{group.members.length}/4</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-700">Project Type:</span>
                    <span className="text-gray-900 font-black">{group.projectType}</span>
                  </div>
                </div>
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
              Are you sure you want to delete your group "{group?.title}"? This action cannot be undone and all group members will be notified.
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

export default MyGroup;
