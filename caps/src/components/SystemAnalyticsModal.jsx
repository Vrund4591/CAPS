/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  Users, 
  UserCheck,
  Activity,
  Calendar,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const SystemAnalyticsModal = ({ isOpen, onClose, analytics }) => {
  const [timeframe, setTimeframe] = useState('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default analytics structure to prevent errors
  const defaultAnalytics = {
    overview: {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
      totalGroups: 0,
      activeGroups: 0,
      pendingGroups: 0,
      rejectedGroups: 0
    },
    roleDistribution: [],
    departmentDistribution: [],
    recentActivity: {
      groups: [],
      users: []
    }
  };

  const safeAnalytics = analytics || defaultAnalytics;

  const getRoleColor = (role) => {
    switch (role) {
      case 'STUDENT': return 'bg-blue-100 text-blue-800 border-blue-500';
      case 'FACULTY': return 'bg-purple-100 text-purple-800 border-purple-500';
      case 'ADMIN': return 'bg-red-100 text-red-800 border-red-500';
      default: return 'bg-gray-100 text-gray-800 border-gray-500';
    }
  };

  const getDepartmentColor = (index) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-yellow-100 text-yellow-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ];
    return colors[index % colors.length];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-500';
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-500';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-500';
      default: return 'bg-gray-100 text-gray-800 border-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-black max-w-7xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-purple-50 p-6 border-b-3 border-purple-500">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-purple-600" />
                System Analytics Dashboard
              </h2>
              <p className="text-purple-700 font-semibold mt-1">
                Comprehensive system insights and performance metrics
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-4 py-2 border-2 border-purple-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <button
                onClick={() => window.print()}
                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-2xl transition-colors"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-2xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(95vh-120px)] overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-3 border-red-500 rounded-2xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-700 font-bold">{error}</p>
              </div>
            </div>
          )}

          {/* Overview Statistics */}
          <div className="grid lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-2xl border-3 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-blue-800">
                    {safeAnalytics.overview.totalUsers}
                  </div>
                  <div className="text-blue-700 font-bold">Total Users</div>
                  <div className="text-sm text-blue-600">
                    +{safeAnalytics.overview.newUsers} this period
                  </div>
                </div>
                <Users className="w-10 h-10 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-2xl border-3 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-green-800">
                    {safeAnalytics.overview.activeGroups}
                  </div>
                  <div className="text-green-700 font-bold">Active Groups</div>
                  <div className="text-sm text-green-600">
                    {safeAnalytics.overview.totalGroups} total
                  </div>
                </div>
                <Activity className="w-10 h-10 text-green-600" />
              </div>
            </div>

            <div className="bg-yellow-50 p-6 rounded-2xl border-3 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-yellow-800">
                    {safeAnalytics.overview.pendingGroups}
                  </div>
                  <div className="text-yellow-700 font-bold">Pending Review</div>
                  <div className="text-sm text-yellow-600">
                    Requires attention
                  </div>
                </div>
                <Calendar className="w-10 h-10 text-yellow-600" />
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-2xl border-3 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-purple-800">
                    {safeAnalytics.overview.activeUsers}
                  </div>
                  <div className="text-purple-700 font-bold">Active Users</div>
                  <div className="text-sm text-purple-600">
                    {safeAnalytics.overview.totalUsers > 0 
                      ? Math.round((safeAnalytics.overview.activeUsers / safeAnalytics.overview.totalUsers) * 100)
                      : 0}% active
                  </div>
                </div>
                <UserCheck className="w-10 h-10 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Role Distribution */}
            <div className="bg-white p-6 rounded-2xl border-3 border-gray-300">
              <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-500" />
                User Role Distribution
              </h3>
              <div className="space-y-3">
                {safeAnalytics.roleDistribution && safeAnalytics.roleDistribution.length > 0 ? (
                  safeAnalytics.roleDistribution.map((role, index) => (
                    <div key={role.role || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${getRoleColor(role.role)}`}>
                          {role.role || 'Unknown'}
                        </span>
                        <span className="font-semibold text-gray-700">
                          {role._count?.role || 0} users
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {safeAnalytics.overview.totalUsers > 0 
                          ? Math.round(((role._count?.role || 0) / safeAnalytics.overview.totalUsers) * 100)
                          : 0}%
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <PieChart className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No role data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Department Distribution */}
            <div className="bg-white p-6 rounded-2xl border-3 border-gray-300">
              <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                Faculty Department Distribution
              </h3>
              <div className="space-y-3">
                {safeAnalytics.departmentDistribution && safeAnalytics.departmentDistribution.length > 0 ? (
                  safeAnalytics.departmentDistribution.map((dept, index) => (
                    <div key={dept.department || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getDepartmentColor(index)}`}>
                          {dept.department || 'Unknown'}
                        </span>
                        <span className="font-semibold text-gray-700">
                          {dept._count?.department || 0} faculty
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {safeAnalytics.departmentDistribution.reduce((sum, d) => sum + (d._count?.department || 0), 0) > 0
                          ? Math.round(((dept._count?.department || 0) / safeAnalytics.departmentDistribution.reduce((sum, d) => sum + (d._count?.department || 0), 0)) * 100)
                          : 0}%
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No department data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Recent Groups */}
            <div className="bg-white p-6 rounded-2xl border-3 border-gray-300">
              <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Recent Groups
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {safeAnalytics.recentActivity?.groups && safeAnalytics.recentActivity.groups.length > 0 ? (
                  safeAnalytics.recentActivity.groups.map((group) => (
                    <div key={group.id} className="p-3 bg-gray-50 rounded-xl border-2 border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm text-gray-900">{group.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(group.status)}`}>
                          {group.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Leader: {group.teamLeader?.user?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created {new Date(group.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No recent groups</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Users */}
            <div className="bg-white p-6 rounded-2xl border-3 border-gray-300">
              <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-500" />
                Recent Users
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {safeAnalytics.recentActivity?.users && safeAnalytics.recentActivity.users.length > 0 ? (
                  safeAnalytics.recentActivity.users.map((user) => (
                    <div key={user.id} className="p-3 bg-gray-50 rounded-xl border-2 border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{user.name}</h4>
                          <p className="text-xs text-gray-600">{user.email}</p>
                          <p className="text-xs text-gray-500">
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border-2 ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <UserCheck className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No recent users</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border-3 border-blue-300">
            <h3 className="text-xl font-black text-gray-900 mb-4">System Summary</h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-black text-blue-800">
                  {safeAnalytics.overview.totalGroups > 0 
                    ? Math.round((safeAnalytics.overview.activeGroups / safeAnalytics.overview.totalGroups) * 100)
                    : 0}%
                </div>
                <div className="text-blue-700 font-bold">Group Approval Rate</div>
              </div>
              <div>
                <div className="text-2xl font-black text-green-800">
                  {safeAnalytics.overview.totalUsers > 0 
                    ? Math.round((safeAnalytics.overview.activeUsers / safeAnalytics.overview.totalUsers) * 100)
                    : 0}%
                </div>
                <div className="text-green-700 font-bold">User Activity Rate</div>
              </div>
              <div>
                <div className="text-2xl font-black text-purple-800">
                  {safeAnalytics.overview.totalGroups > 0 
                    ? Math.round((safeAnalytics.overview.pendingGroups / safeAnalytics.overview.totalGroups) * 100)
                    : 0}%
                </div>
                <div className="text-purple-700 font-bold">Pending Review Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemAnalyticsModal;
