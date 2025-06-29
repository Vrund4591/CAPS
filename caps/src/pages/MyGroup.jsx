import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

const MyGroup = ({ user, onLogout }) => {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    } catch (error) {
      setError('Failed to load group data');
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

  const getStatusMessage = (status) => {
    switch (status) {
      case 'PENDING': return 'Your group is waiting for faculty approval. You will be notified once approved.';
      case 'ACTIVE': return 'Congratulations! Your group has been approved and is now active.';
      case 'REJECTED': return 'Unfortunately, your group request was rejected. Please contact your faculty for more information.';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <Header user={user} onLogout={onLogout} />
        
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black text-center">
              <div className="text-6xl mb-4">🚀</div>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Header user={user} onLogout={onLogout} />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2">
                  👥 My Group
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
              <h3 className="font-black text-lg mb-2">
                {group.status === 'PENDING' ? '⏳ Waiting for Approval' : '❌ Request Rejected'}
              </h3>
              <p className="font-semibold">{getStatusMessage(group.status)}</p>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Group Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Project Details */}
              <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
                <h2 className="text-2xl font-black text-gray-900 mb-6">📋 Project Details</h2>
                
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
                <h2 className="text-2xl font-black text-gray-900 mb-6">👥 Team Members</h2>
                
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
                          <h3 className="font-bold text-gray-900">
                            {member.student.user.name}
                            {member.isLeader && <span className="text-yellow-600 ml-2">👑</span>}
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
                <h3 className="text-xl font-black text-gray-900 mb-4">🎓 Faculty Supervisor</h3>
                <div className="bg-indigo-50 p-4 rounded-2xl border-3 border-indigo-500">
                  <h4 className="font-bold text-indigo-900">{group.faculty.user.name}</h4>
                  <p className="text-sm text-indigo-700">{group.faculty.user.email}</p>
                  <p className="text-sm text-indigo-700">{group.faculty.department} Department</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
                <h3 className="text-xl font-black text-gray-900 mb-4">⚡ Quick Actions</h3>
                <div className="space-y-3">
                  <div className="bg-blue-100 p-3 rounded-2xl border-2 border-blue-500 text-center">
                    <div className="font-bold text-blue-800 text-sm mb-2">📁 Project Files</div>
                    <button className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      Coming Soon
                    </button>
                  </div>
                  
                  <div className="bg-green-100 p-3 rounded-2xl border-2 border-green-500 text-center">
                    <div className="font-bold text-green-800 text-sm mb-2">💬 Team Chat</div>
                    <button className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      Coming Soon
                    </button>
                  </div>
                  
                  <div className="bg-purple-100 p-3 rounded-2xl border-2 border-purple-500 text-center">
                    <div className="font-bold text-purple-800 text-sm mb-2">📊 Progress Tracker</div>
                    <button className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>

              {/* Group Stats */}
              <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
                <h3 className="text-xl font-black text-gray-900 mb-4">📊 Group Stats</h3>
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
    </div>
  );
};

export default MyGroup;
