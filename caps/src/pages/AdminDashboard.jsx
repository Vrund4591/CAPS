import React, { useState, useEffect } from 'react';
import Header from '../components/Header';

const AdminDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGroups: 0,
    pendingGroups: 0,
    activeGroups: 0
  });
  const [authorizeForm, setAuthorizeForm] = useState({
    email: '',
    role: 'STUDENT'
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all groups for stats
      const groupsResponse = await fetch('http://localhost:5001/api/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        const groups = groupsData.groups;
        
        setStats({
          totalGroups: groups.length,
          pendingGroups: groups.filter(g => g.status === 'PENDING').length,
          activeGroups: groups.filter(g => g.status === 'ACTIVE').length,
          totalUsers: 0 // This would need a separate endpoint
        });
      }

    } catch (error) {
      console.error('Dashboard data fetch failed:', error);
    }
    setLoading(false);
  };

  const handleAuthorizeUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/users/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(authorizeForm)
      });

      if (response.ok) {
        setMessage(`User ${authorizeForm.email} authorized successfully as ${authorizeForm.role}`);
        setAuthorizeForm({ email: '', role: 'STUDENT' });
      } else {
        const data = await response.json();
        setMessage(data.message || 'Failed to authorize user');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    }

    setTimeout(() => setMessage(''), 5000);
  };

  const handleInputChange = (e) => {
    setAuthorizeForm({
      ...authorizeForm,
      [e.target.name]: e.target.value
    });
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
            Admin Dashboard 🔧
          </h1>
          <p className="text-xl text-gray-600 font-semibold">
            System administration and user management
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* System Stats */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black mb-8">
              <h2 className="text-2xl font-black text-gray-900 mb-6">
                📊 System Statistics
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-100 p-6 rounded-2xl border-3 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-black text-blue-800">{stats.totalGroups}</div>
                      <div className="text-blue-700 font-bold">Total Groups</div>
                    </div>
                    <div className="text-4xl">👥</div>
                  </div>
                </div>

                <div className="bg-yellow-100 p-6 rounded-2xl border-3 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-black text-yellow-800">{stats.pendingGroups}</div>
                      <div className="text-yellow-700 font-bold">Pending Approvals</div>
                    </div>
                    <div className="text-4xl">⏳</div>
                  </div>
                </div>

                <div className="bg-green-100 p-6 rounded-2xl border-3 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-black text-green-800">{stats.activeGroups}</div>
                      <div className="text-green-700 font-bold">Active Groups</div>
                    </div>
                    <div className="text-4xl">✅</div>
                  </div>
                </div>

                <div className="bg-purple-100 p-6 rounded-2xl border-3 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-black text-purple-800">∞</div>
                      <div className="text-purple-700 font-bold">System Health</div>
                    </div>
                    <div className="text-4xl">💜</div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Actions */}
            <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
              <h2 className="text-2xl font-black text-gray-900 mb-6">
                ⚙️ System Actions
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-indigo-100 p-4 rounded-2xl border-3 border-indigo-500 text-center">
                  <div className="text-2xl mb-2">📋</div>
                  <h3 className="font-bold text-indigo-800 mb-2">Generate Reports</h3>
                  <button className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black text-sm">
                    Coming Soon
                  </button>
                </div>

                <div className="bg-orange-100 p-4 rounded-2xl border-3 border-orange-500 text-center">
                  <div className="text-2xl mb-2">🔄</div>
                  <h3 className="font-bold text-orange-800 mb-2">System Backup</h3>
                  <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black text-sm">
                    Coming Soon
                  </button>
                </div>

                <div className="bg-pink-100 p-4 rounded-2xl border-3 border-pink-500 text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-bold text-pink-800 mb-2">Analytics</h3>
                  <button className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black text-sm">
                    Coming Soon
                  </button>
                </div>

                <div className="bg-teal-100 p-4 rounded-2xl border-3 border-teal-500 text-center">
                  <div className="text-2xl mb-2">🛠️</div>
                  <h3 className="font-bold text-teal-800 mb-2">Maintenance</h3>
                  <button className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black text-sm">
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* User Authorization */}
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
              <h3 className="text-xl font-black text-gray-900 mb-6">👤 Authorize New User</h3>
              
              {message && (
                <div className={`p-4 rounded-2xl border-3 mb-4 font-bold ${
                  message.includes('successfully') 
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : 'bg-red-100 border-red-500 text-red-700'
                }`}>
                  {message}
                </div>
              )}

              <form onSubmit={handleAuthorizeUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={authorizeForm.email}
                    onChange={handleInputChange}
                    className="w-full p-3 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                    placeholder="user@college.edu"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    value={authorizeForm.role}
                    onChange={handleInputChange}
                    className="w-full p-3 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-3 px-6 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                >
                  🔑 Authorize User
                </button>
              </form>

              <div className="mt-6 p-4 bg-gray-100 rounded-2xl border-2 border-gray-400">
                <h4 className="font-bold text-gray-800 mb-2">📝 Instructions:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Enter the user's college email address</li>
                  <li>• Select appropriate role (Student/Faculty/Admin)</li>
                  <li>• User can then register with this email</li>
                  <li>• Each email can only be used once</li>
                </ul>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
              <h3 className="text-xl font-black text-gray-900 mb-6">⚡ Quick Actions</h3>
              <div className="space-y-3">
                <div className="bg-blue-100 p-3 rounded-2xl border-2 border-blue-500 text-center">
                  <div className="font-bold text-blue-800 text-sm">View All Groups</div>
                  <button className="mt-2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    Coming Soon
                  </button>
                </div>
                
                <div className="bg-green-100 p-3 rounded-2xl border-2 border-green-500 text-center">
                  <div className="font-bold text-green-800 text-sm">Manage Users</div>
                  <button className="mt-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    Coming Soon
                  </button>
                </div>
                
                <div className="bg-purple-100 p-3 rounded-2xl border-2 border-purple-500 text-center">
                  <div className="font-bold text-purple-800 text-sm">System Settings</div>
                  <button className="mt-2 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
