/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  BarChart3, 
  Users, 
  Clock, 
  CheckCircle, 
  FileText,
  RotateCcw,
  PieChart,
  Wrench,
  User,
  Key,
  Zap,
  Search,
  Filter,
  Edit3,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  UserPlus,
  Shield,
  AlertTriangle,
  TrendingUp,
  Activity,
  Database,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  X
} from 'lucide-react';
import Header from '../components/Header';
import UserManagementModal from '../components/UserManagementModal';
import GroupManagementModal from '../components/GroupManagementModal';
import SystemAnalyticsModal from '../components/SystemAnalyticsModal';
import { useToast } from '../context/ToastContext';
import { apiUrl } from '../utils/api';

const AdminDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGroups: 0,
    pendingGroups: 0,
    activeGroups: 0,
    newUsers: 0,
    activeUsers: 0,
    rejectedGroups: 0
  });
  const [analytics, setAnalytics] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentGroups, setRecentGroups] = useState([]);
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [authorizeForm, setAuthorizeForm] = useState({
    email: '',
    role: 'STUDENT'
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const { toast } = useToast();
  const [showBulkAuthorizeModal, setShowBulkAuthorizeModal] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkRole, setBulkRole] = useState('STUDENT');
  const [csvFile, setCsvFile] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [showCsvUploadModal, setShowCsvUploadModal] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState([]);
  const [csvValidationErrors, setCsvValidationErrors] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchAnalytics();
    fetchAuthorizedUsers();
  }, []);

  // Add separate useEffect for filter-dependent operations
  useEffect(() => {
    if (selectedTab === 'users') {
      // Refetch authorized users when filters change in users tab
      fetchAuthorizedUsers();
    }
  }, [searchTerm, filterRole, selectedTab]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch analytics overview
      const analyticsResponse = await fetch(apiUrl('/api/users/analytics/overview'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setStats(analyticsData.overview);
        setRecentUsers(analyticsData.recentActivity.users || []);
        setRecentGroups(analyticsData.recentActivity.groups || []);
        setAnalytics(analyticsData);
      } else {
        // Set default values if analytics fails
        setStats({
          totalUsers: 0,
          totalGroups: 0,
          pendingGroups: 0,
          activeGroups: 0,
          newUsers: 0,
          activeUsers: 0,
          rejectedGroups: 0
        });
        setRecentUsers([]);
        setRecentGroups([]);
      }

    } catch (error) {
      console.error('Dashboard data fetch failed:', error.message);
      // Set default values on error
      setStats({
        totalUsers: 0,
        totalGroups: 0,
        pendingGroups: 0,
        activeGroups: 0,
        newUsers: 0,
        activeUsers: 0,
        rejectedGroups: 0
      });
      setRecentUsers([]);
      setRecentGroups([]);
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/users/analytics/overview?timeframe=30'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Analytics fetch failed:', error);
    }
  };

  const fetchAuthorizedUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/users/authorized'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuthorizedUsers(data.authorizedUsers || []);
      } else {
        setAuthorizedUsers([]);
      }
    } catch (error) {
      console.error('Authorized users fetch failed:', error);
      setAuthorizedUsers([]);
    }
  };

  const handleAuthorizeUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/users/authorize'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(authorizeForm)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('User Authorized!', `${authorizeForm.email} has been authorized as ${authorizeForm.role}`);
        setMessage(data.message || `User ${authorizeForm.email} will be authorized as ${authorizeForm.role}`);
        setAuthorizeForm({ email: '', role: 'STUDENT' });
        fetchAuthorizedUsers();
      } else {
        const data = await response.json();
        toast.error('Authorization Failed', data.message || 'Failed to authorize user');
        setMessage(data.message || 'Failed to authorize user');
      }
    } catch (error) {
      const errorMessage = `Error: ${error.message || 'Network error. Please try again.'}`;
      toast.error('Network Error', errorMessage);
      setMessage(errorMessage);
    }

    setTimeout(() => setMessage(''), 5000);
  };

  const handleRemoveAuthorizedUser = async (id) => {
    if (!window.confirm('Are you sure you want to remove this authorized user?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl(`/api/users/authorized/${id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('User Removed', 'Authorized user has been removed successfully');
        setMessage('Authorized user removed successfully');
        fetchAuthorizedUsers();
      } else {
        toast.error('Removal Failed', 'Failed to remove authorized user');
        setMessage('Failed to remove authorized user');
      }
    } catch (error) {
      toast.error('Network Error', 'Please check your connection and try again.');
      setMessage('Network error. Please try again.');
    }

    setTimeout(() => setMessage(''), 3000);
  };

  const handleInputChange = (e) => {
    setAuthorizeForm({
      ...authorizeForm,
      [e.target.name]: e.target.value
    });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'STUDENT': return 'bg-blue-100 text-blue-800 border-blue-500';
      case 'FACULTY': return 'bg-purple-100 text-purple-800 border-purple-500';
      case 'ADMIN': return 'bg-red-100 text-red-800 border-red-500';
      default: return 'bg-gray-100 text-gray-800 border-gray-500';
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

  const filteredAuthorizedUsers = authorizedUsers.filter(authUser => {
    const matchesSearch = authUser.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'ALL' || authUser.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleBulkAuthorize = async () => {
    const emails = bulkEmails.split(',').map(email => email.trim()).filter(email => email);
    if (emails.length === 0) {
      return toast.error('No emails provided', 'Please enter email addresses to authorize');
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/users/authorize/bulk'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emails, role: bulkRole })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Bulk Authorization Successful', `${data.authorizedCount} users authorized`);
        setBulkEmails('');
        fetchAuthorizedUsers();
      } else {
        const data = await response.json();
        toast.error('Bulk Authorization Failed', data.message || 'Failed to authorize users');
      }
    } catch (error) {
      toast.error('Network Error', 'Failed to authorize users. Please try again.');
      console.error('Bulk authorization error:', error);
    }
  };

  const handleCsvFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      previewCsvFile(file);
    } else {
      toast.error('Invalid File', 'Please select a valid CSV file');
      setCsvFile(null);
    }
  };

  const previewCsvFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        setCsvValidationErrors(['CSV file is empty']);
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Validate headers
      const requiredHeaders = ['email', 'role'];
      const optionalHeaders = ['name', 'class', 'semester', 'division', 'department'];
      const allValidHeaders = [...requiredHeaders, ...optionalHeaders];
      
      const invalidHeaders = headers.filter(h => h && !allValidHeaders.includes(h));
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      const errors = [];
      if (missingHeaders.length > 0) {
        errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
      }
      if (invalidHeaders.length > 0) {
        errors.push(`Invalid headers: ${invalidHeaders.join(', ')}`);
      }
      
      // Additional validation for header format
      if (headers.length === 0) {
        errors.push('No headers found in CSV file');
      }
      
      setCsvValidationErrors(errors);
      
      // Parse preview data (first 10 rows after header)
      const previewRows = lines.slice(1, 11).filter(line => line.trim());
      const previewData = previewRows.map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const row = { lineNumber: index + 2 };
        headers.forEach((header, i) => {
          if (header) row[header] = values[i] || '';
        });
        return row;
      });
      
      setCsvPreviewData(previewData);
      
      // Log for debugging
      console.log('CSV Headers:', headers);
      console.log('Preview Data:', previewData);
      console.log('Validation Errors:', errors);
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error('No File Selected', 'Please select a CSV file to upload');
      return;
    }

    if (csvValidationErrors.length > 0) {
      toast.error('Validation Errors', 'Please fix the CSV format errors before uploading');
      return;
    }

    setCsvUploading(true);
    const formData = new FormData();
    formData.append('csvFile', csvFile);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/users/authorize-csv'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          'CSV Upload Complete!', 
          `Successfully processed ${data.results.authorized.length} authorizations. ` +
          `Skipped: ${data.results.skipped.length}, Errors: ${data.results.errors.length}`
        );
        
        setCsvFile(null);
        setCsvPreviewData([]);
        setCsvValidationErrors([]);
        setShowCsvUploadModal(false);
        fetchAuthorizedUsers();
        
        // Show detailed results if there are errors
        if (data.results.errors.length > 0) {
          console.log('CSV Upload Errors:', data.results.errors);
          toast.error('Some Records Failed', `${data.results.errors.length} records had errors. Check console for details.`);
        }
      } else {
        console.error('CSV Upload Error Response:', data);
        toast.error('CSV Upload Failed', data.message || 'Failed to process CSV file');
      }
    } catch (error) {
      console.error('CSV upload network error:', error);
      toast.error('Network Error', 'Failed to upload CSV file. Please check your connection and try again.');
    } finally {
      setCsvUploading(false);
    }
  };

  const handleExportUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/users/export/csv'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'CAPS_Users_Export.csv';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        
        alert('Users exported successfully!');
      } else {
        alert('Failed to export users');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export users');
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

  return (
    <div className="min-h-screen" style={{backgroundColor: '#FFFFF4'}}>
      <Header user={user} onLogout={onLogout} />
      
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
                Admin Dashboard 
                <Settings className="w-10 h-10 text-red-500" />
              </h1>
              <p className="text-xl text-gray-600 font-semibold">
                Complete system administration and management
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={fetchDashboardData}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => setShowAnalyticsModal(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Analytics
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-6 rounded-3xl shadow-2xl border-4 border-black">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-blue-800">{stats.totalUsers}</div>
                <div className="text-blue-700 font-bold">Total Users</div>
                <div className="text-sm text-blue-600">+{stats.newUsers} this month</div>
              </div>
              <Users className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-100 to-green-200 p-6 rounded-3xl shadow-2xl border-4 border-black">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-green-800">{stats.activeGroups}</div>
                <div className="text-green-700 font-bold">Active Groups</div>
                <div className="text-sm text-green-600">{stats.totalGroups} total</div>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 p-6 rounded-3xl shadow-2xl border-4 border-black">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-yellow-800">{stats.pendingGroups}</div>
                <div className="text-yellow-700 font-bold">Pending Review</div>
                <div className="text-sm text-yellow-600">Requires attention</div>
              </div>
              <Clock className="w-12 h-12 text-yellow-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-6 rounded-3xl shadow-2xl border-4 border-black">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-purple-800">{stats.activeUsers}</div>
                <div className="text-purple-700 font-bold">Active Users</div>
                <div className="text-sm text-purple-600">{Math.round((stats.activeUsers/stats.totalUsers)*100)}% active</div>
              </div>
              <UserCheck className="w-12 h-12 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white p-2 rounded-3xl shadow-2xl border-4 border-black mb-8">
          <div className="flex space-x-2">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'User Management', icon: Users },
              { id: 'groups', label: 'Group Management', icon: Users },
              { id: 'system', label: 'System Settings', icon: Settings }
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex-1 py-3 px-4 rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                    selectedTab === tab.id
                      ? 'bg-blue-500 text-white border-3 border-black'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <div className="lg:col-span-2 space-y-8">
              {/* Recent Users */}
              <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <UserPlus className="w-6 h-6 text-green-500" />
                    Recent Users
                  </h2>
                  <button
                    onClick={() => setShowUserModal(true)}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200"
                  >
                    Manage All
                  </button>
                </div>
                
                <div className="space-y-4">
                  {recentUsers.map((recentUser) => (
                    <div key={recentUser.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border-2 border-gray-300">
                      <div>
                        <h3 className="font-bold text-gray-900">{recentUser.name}</h3>
                        <p className="text-sm text-gray-600">{recentUser.email}</p>
                        <p className="text-xs text-gray-500">
                          Joined {new Date(recentUser.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getRoleColor(recentUser.role)}`}>
                        {recentUser.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Groups */}
              <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-500" />
                    Recent Groups
                  </h2>
                  <button
                    onClick={() => setShowGroupModal(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200"
                  >
                    Manage All
                  </button>
                </div>
                
                <div className="space-y-4">
                  {recentGroups.length > 0 ? recentGroups.map((group) => (
                    <div key={group.id} className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-300">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">{group.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(group.status)}`}>
                          {group.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Leader: {group.teamLeader?.user?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created {new Date(group.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm font-semibold">No recent groups</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-8">
              {/* Authorize User */}
              <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-500" />
                  Quick Authorize
                </h3>
                
                {/* Action Buttons */}
                <div className="flex space-x-3 mb-4">
                  <button
                    onClick={() => setShowBulkAuthorizeModal(true)}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Bulk Text
                  </button>
                  <button
                    onClick={() => setShowCsvUploadModal(true)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    CSV Upload
                  </button>
                </div>
                
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
                  <input
                    type="email"
                    name="email"
                    value={authorizeForm.email}
                    onChange={handleInputChange}
                    className="w-full p-3 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                    placeholder="user@college.edu"
                    required
                  />

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

                  {/* Additional fields based on role */}
                  {authorizeForm.role === 'STUDENT' && (
                    <>
                      <input
                        type="text"
                        name="class"
                        value={authorizeForm.class || ''}
                        onChange={handleInputChange}
                        className="w-full p-3 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                        placeholder="Class (e.g., BE)"
                      />
                      
                      <select
                        name="semester"
                        value={authorizeForm.semester || ''}
                        onChange={handleInputChange}
                        className="w-full p-3 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                      >
                        <option value="">Select Semester</option>
                        {[1,2,3,4,5,6,7,8].map(sem => (
                          <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        name="division"
                        value={authorizeForm.division || ''}
                        onChange={handleInputChange}
                        className="w-full p-3 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                        placeholder="Division (e.g., A)"
                        maxLength="1"
                      />
                    </>
                  )}

                  {authorizeForm.role === 'FACULTY' && (
                    <select
                      name="department"
                      value={authorizeForm.department || 'IT'}
                      onChange={handleInputChange}
                      className="w-full p-3 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                    >
                      <option value="IT">Information Technology</option>
                      <option value="CE">Computer Engineering</option>
                      <option value="MECH">Mechanical Engineering</option>
                      <option value="CIVIL">Civil Engineering</option>
                      <option value="ENTC">Electronics & Telecommunication</option>
                    </select>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-3 px-6 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                  >
                    Authorize User
                  </button>
                </form>
              </div>

              {/* System Health */}
              <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  System Health
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">Database</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">Online</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">API Server</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">Healthy</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">Storage</span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-bold">78% Used</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">Last Backup</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">2 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'users' && (
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-500" />
                User Authorization Management
              </h2>
              <button
                onClick={() => setShowUserModal(true)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Manage All Users
              </button>
            </div>

            {/* Search and Filter */}
            <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-300 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search authorized users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                  />
                </div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                >
                  <option value="ALL">All Roles</option>
                  <option value="STUDENT">Students</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="ADMIN">Admins</option>
                </select>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-300">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black text-blue-800">
                      {filteredAuthorizedUsers.filter(u => !u.isUsed).length}
                    </div>
                    <div className="text-blue-700 font-bold text-sm">Pending Registrations</div>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-300">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black text-green-800">
                      {filteredAuthorizedUsers.filter(u => u.isUsed).length}
                    </div>
                    <div className="text-green-700 font-bold text-sm">Completed Registrations</div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-300">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black text-purple-800">{filteredAuthorizedUsers.length}</div>
                    <div className="text-purple-700 font-bold text-sm">Total Authorizations</div>
                  </div>
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Authorized Users List */}
            <div className="space-y-4">
              {filteredAuthorizedUsers.length > 0 ? (
                filteredAuthorizedUsers.map((authUser) => (
                  <div key={authUser.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border-2 border-gray-300 hover:border-blue-300 transition-colors">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-900">{authUser.email}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getRoleColor(authUser.role)}`}>
                          {authUser.role}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          authUser.isUsed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {authUser.isUsed ? 'Registered' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Authorized on {new Date(authUser.createdAt).toLocaleDateString()}
                        {authUser.isUsed && (
                          <span className="ml-2 text-green-600">• Registration completed</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {!authUser.isUsed && (
                        <button
                          onClick={() => handleRemoveAuthorizedUser(authUser.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl transition-colors"
                          title="Remove authorization"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-700 mb-2">
                    {searchTerm || filterRole !== 'ALL' ? 'No matching authorizations' : 'No authorized users yet'}
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm || filterRole !== 'ALL' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'Start by authorizing users in the Quick Authorize section below'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'groups' && (
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-500" />
                Advanced Group Management
              </h2>
              <button
                onClick={() => setShowGroupModal(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2"
              >
                <Eye className="w-5 h-5" />
                View All Groups
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-yellow-50 p-6 rounded-2xl border-3 border-yellow-500 text-center">
                <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                <div className="text-2xl font-black text-yellow-800 mb-2">{stats.pendingGroups}</div>
                <div className="text-yellow-700 font-bold mb-4">Pending Approval</div>
                <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-xl text-sm">
                  Review Pending
                </button>
              </div>

              <div className="bg-green-50 p-6 rounded-2xl border-3 border-green-500 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <div className="text-2xl font-black text-green-800 mb-2">{stats.activeGroups}</div>
                <div className="text-green-700 font-bold mb-4">Active Groups</div>
                <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl text-sm">
                  Manage Active
                </button>
              </div>

              <div className="bg-red-50 p-6 rounded-2xl border-3 border-red-500 text-center">
                <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <div className="text-2xl font-black text-red-800 mb-2">{stats.rejectedGroups}</div>
                <div className="text-red-700 font-bold mb-4">Rejected Groups</div>
                <button className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl text-sm">
                  Review Rejected
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'system' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* System Actions */}
            <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Settings className="w-6 h-6 text-gray-500" />
                System Operations
              </h2>
              
              <div className="grid gap-4">
                <div className="bg-indigo-100 p-6 rounded-2xl border-3 border-indigo-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Generate Reports
                      </h3>
                      <p className="text-sm text-indigo-700">Export system data and analytics</p>
                    </div>
                    <button className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black text-sm">
                      Generate
                    </button>
                  </div>
                </div>

                <div className="bg-orange-100 p-6 rounded-2xl border-3 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        Database Backup
                      </h3>
                      <p className="text-sm text-orange-700">Create system backup</p>
                    </div>
                    <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black text-sm">
                      Backup Now
                    </button>
                  </div>
                </div>

                <div className="bg-pink-100 p-6 rounded-2xl border-3 border-pink-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-pink-800 mb-2 flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Security Audit
                      </h3>
                      <p className="text-sm text-pink-700">Run security analysis</p>
                    </div>
                    <button className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black text-sm">
                      Run Audit
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* System Monitoring */}
            <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6 text-green-500" />
                System Monitoring
              </h2>
              
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-300">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-green-800">Server Status</h4>
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-bold">Online</span>
                  </div>
                  <div className="text-sm text-green-700">Uptime: 99.9% | Response: 45ms</div>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-300">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-blue-800">Database Performance</h4>
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-bold">Good</span>
                  </div>
                  <div className="text-sm text-blue-700">Queries: 1.2k/min | Cache hit: 94%</div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-300">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-yellow-800">Storage Usage</h4>
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-bold">78%</span>
                  </div>
                  <div className="text-sm text-yellow-700">Used: 7.8GB / 10GB available</div>
                </div>

                <div className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-300">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-purple-800">User Activity</h4>
                    <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full font-bold">High</span>
                  </div>
                  <div className="text-sm text-purple-700">Active sessions: 47 | Peak today: 89</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <UserManagementModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onUserUpdated={fetchDashboardData}
      />

      <GroupManagementModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onGroupUpdated={fetchDashboardData}
      />

      <SystemAnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        analytics={analytics}
      />

      {/* Bulk Authorize Modal */}
      {showBulkAuthorizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-gray-900">Bulk User Authorization</h3>
              <button
                onClick={() => setShowBulkAuthorizeModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email Addresses (comma separated)
              </label>
              <textarea
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none h-24"
                placeholder="user1@college.edu, user2@college.edu"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Role
              </label>
              <select
                value={bulkRole}
                onChange={(e) => setBulkRole(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              >
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowBulkAuthorizeModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-xl transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAuthorize}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Authorize Users
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Download className="w-6 h-6 text-green-600" />
                CSV Bulk Authorization
              </h3>
              <button
                onClick={() => setShowCsvUploadModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-2xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* CSV Format Instructions */}
            <div className="bg-blue-50 p-4 rounded-2xl border-3 border-blue-500 mb-6">
              <h4 className="font-bold text-blue-800 mb-3">📋 CSV Format Requirements</h4>
              <div className="text-sm text-blue-700 space-y-2">
                <p><strong>Required columns:</strong> email, role</p>
                <p><strong>Optional columns:</strong> name, class, semester, division, department</p>
                <p><strong>Valid roles:</strong> STUDENT, FACULTY, ADMIN</p>
                <div className="bg-blue-100 p-3 rounded-xl mt-3">
                  <p className="font-bold">Example CSV format:</p>
                  <code className="text-xs block mt-1">
                    email,role,name,class,semester,division,department<br/>
                    student1@college.edu,STUDENT,John Doe,BE-IT,5,A,<br/>
                    faculty1@college.edu,FACULTY,Dr. Smith,,,IT<br/>
                    admin1@college.edu,ADMIN,Admin User,,,,
                  </code>
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-blue-300">
                  <span className="text-blue-800 font-bold">💡 Need a template?</span>
                  <button
                    onClick={handleExportUsers}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Current Users as Template
                  </button>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileSelect}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none font-semibold"
                />
              </div>

              {/* Validation Errors */}
              {csvValidationErrors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-xl border-2 border-red-300">
                  <h5 className="font-bold text-red-800 mb-2">❌ Validation Errors:</h5>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    {csvValidationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Data */}
              {csvPreviewData.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-300">
                  <h5 className="font-bold text-gray-800 mb-3">📊 Preview (First 10 rows):</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="p-2 text-left">Line</th>
                          <th className="p-2 text-left">Email</th>
                          <th className="p-2 text-left">Role</th>
                          <th className="p-2 text-left">Name</th>
                          <th className="p-2 text-left">Class</th>
                          <th className="p-2 text-left">Semester</th>
                          <th className="p-2 text-left">Division</th>
                          <th className="p-2 text-left">Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreviewData.map((row, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">{row.lineNumber}</td>
                            <td className="p-2">{row.email}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                ['STUDENT', 'FACULTY', 'ADMIN'].includes(row.role) 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {row.role}
                              </span>
                            </td>
                            <td className="p-2">{row.name}</td>
                            <td className="p-2">{row.class}</td>
                            <td className="p-2">{row.semester}</td>
                            <td className="p-2">{row.division}</td>
                            <td className="p-2">{row.department}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCsvUploadModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCsvUpload}
                disabled={!csvFile || csvValidationErrors.length > 0 || csvUploading}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2"
              >
                {csvUploading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Upload & Authorize
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
