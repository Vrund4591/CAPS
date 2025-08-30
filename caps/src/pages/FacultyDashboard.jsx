/* eslint-disable no-unused-vars */
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
  Mail,
  Search,
  Filter,
  Eye,
  Calendar,
  FileText,
  Award,
  TrendingUp,
  UserCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw
} from 'lucide-react';
import Header from '../components/Header';
import AnnouncementModal from '../components/AnnouncementModal';
import GroupEditModal from '../components/GroupEditModal';
import { useToast } from '../context/ToastContext';

const FacultyDashboard = ({ user, onLogout }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectionModal, setRejectionModal] = useState({ open: false, groupId: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectTypeFilter, setProjectTypeFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [academicYearFilter, setAcademicYearFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch faculty groups
      try {
        const groupsResponse = await fetch('http://localhost:5001/api/groups', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (groupsResponse.ok) {
          const groupsData = await groupsResponse.json();
          setGroups(groupsData.groups || []);
        } else {
          console.error('Error fetching groups:', groupsResponse.status);
          setGroups([]);
        }
      } catch (error) {
        console.error('Groups fetch error:', error);
        setGroups([]);
      }

    } catch (error) {
      console.error('Dashboard data fetch failed:', error);
    }
    setLoading(false);
  };

  const handleGroupAction = async (groupId, status, reason = '') => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/groups/${groupId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status,
          ...(status === 'REJECTED' && { rejectionReason: reason })
        })
      });

      if (response.ok) {
        if (status === 'APPROVED') {
          toast.success('Group Approved!', 'The group has been successfully approved and students have been notified.');
        } else if (status === 'REJECTED') {
          toast.success('Group Rejected', 'The rejection feedback has been sent to the team leader.');
        }
        fetchDashboardData(); // Refresh data
        if (status === 'REJECTED') {
          setRejectionModal({ open: false, groupId: null });
          setRejectionReason('');
        }
      } else {
        const errorData = await response.json();
        toast.error('Action Failed', errorData.message || 'Failed to update group status');
      }
    } catch (error) {
      console.error('Group action failed:', error);
      toast.error('Network Error', 'Please check your connection and try again.');
    }
    setActionLoading(false);
  };

  const handleReject = (groupId) => {
    setRejectionModal({ open: true, groupId });
    setRejectionReason('');
  };

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      toast.warning('Missing Information', 'Please provide a reason for rejection');
      return;
    }
    handleGroupAction(rejectionModal.groupId, 'REJECTED', rejectionReason);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-500';
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-500';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-500';
      default: return 'bg-gray-100 text-gray-800 border-gray-500';
    }
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setShowEditModal(true);
  };

  const handleGroupUpdated = (updatedGroup) => {
    // Refresh the dashboard data
    fetchDashboardData();
  };

  // Filter and sort groups
  const filteredAndSortedGroups = groups
    .filter(group => {
      const matchesSearch = searchTerm === '' || 
        group.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.groupId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.teamLeader?.user?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || group.status === statusFilter;
      const matchesProjectType = projectTypeFilter === 'ALL' || group.projectType === projectTypeFilter;
      
      // Filter by student data from group members
      const matchesSemester = semesterFilter === 'ALL' || 
        group.members?.some(member => member.student?.semester?.toString() === semesterFilter);
      
      // Fix department filtering to check student class format
      const matchesDepartment = departmentFilter === 'ALL' || 
        group.faculty?.department === departmentFilter ||
        group.members?.some(member => {
          if (member.student?.class) {
            const classParts = member.student.class.split('-');
            return classParts.length > 1 && classParts[1] === departmentFilter;
          }
          return false;
        });
      
      // Filter by academic year (based on creation date)
      const matchesAcademicYear = academicYearFilter === 'ALL' || (() => {
        const createdYear = new Date(group.createdAt).getFullYear();
        const currentMonth = new Date().getMonth();
        let academicStartYear = createdYear;
        
        // If before April (month 3), consider previous academic year
        if (currentMonth < 3) {
          academicStartYear = createdYear - 1;
        }
        
        const academicYearString = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
        return academicYearString === academicYearFilter;
      })();
      
      return matchesSearch && matchesStatus && matchesProjectType && matchesSemester && 
             matchesDepartment && matchesAcademicYear;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const pendingGroups = groups.filter(group => group.status === 'PENDING');
  const activeGroups = groups.filter(group => group.status === 'ACTIVE');
  const rejectedGroups = groups.filter(group => group.status === 'REJECTED');
  const totalStudents = groups.reduce((sum, group) => sum + group.members.length, 0);

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
      <Header user={user} onLogout={onLogout} hasGroup={false} />
      
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
                Faculty Dashboard
                <GraduationCap className="w-10 h-10 text-blue-500" />
              </h1>
              <p className="text-xl text-gray-600 font-semibold">
                Welcome, Prof. {user.name}! Manage student groups and oversee project assignments
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-blue-800">{groups.length}</div>
                <div className="text-blue-700 font-bold">Total Groups</div>
              </div>
              <Users className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-yellow-800">{pendingGroups.length}</div>
                <div className="text-yellow-700 font-bold">Pending Approval</div>
              </div>
              <Clock className="w-10 h-10 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-green-800">{activeGroups.length}</div>
                <div className="text-green-700 font-bold">Active Groups</div>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-purple-800">{totalStudents}</div>
                <div className="text-purple-700 font-bold">Total Students</div>
              </div>
              <UserCheck className="w-10 h-10 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Group Management */}
          <div className="lg:col-span-3">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                  Group Management
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-2xl border-2 border-gray-400 transition-all duration-200"
                  >
                    {viewMode === 'cards' ? 'Table View' : 'Card View'}
                  </button>
                  <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>

              {/* Filters and Search */}
              <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-300 mb-6">
                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search groups..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                  >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="ACTIVE">Active</option>
                    <option value="REJECTED">Rejected</option>
                  </select>

                  <select
                    value={projectTypeFilter}
                    onChange={(e) => setProjectTypeFilter(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                  >
                    <option value="ALL">All Types</option>
                    <option value="UDP">UDP</option>
                    <option value="IDP">IDP</option>
                  </select>

                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field);
                      setSortOrder(order);
                    }}
                    className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                  >
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="title-asc">Title A-Z</option>
                    <option value="title-desc">Title Z-A</option>
                  </select>
                </div>

                {/* Additional Filter Row */}
                <div className="grid md:grid-cols-3 gap-4">
                  <select
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                  >
                    <option value="ALL">All Semesters</option>
                    {[1,2,3,4,5,6,7,8].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>

                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                  >
                    <option value="ALL">All Departments</option>
                    <option value="IT">Information Technology</option>
                    <option value="CE">Computer Engineering</option>
                    <option value="MECH">Mechanical Engineering</option>
                    <option value="CIVIL">Civil Engineering</option>
                    <option value="ENTC">Electronics & Telecommunication</option>
                  </select>

                  <select
                    value={academicYearFilter}
                    onChange={(e) => setAcademicYearFilter(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                  >
                    <option value="ALL">All Academic Years</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2023-24">2023-24</option>
                    <option value="2022-23">2022-23</option>
                    <option value="2021-22">2021-22</option>
                  </select>
                </div>

                {/* Filter Summary */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {statusFilter !== 'ALL' && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                      Status: {statusFilter}
                    </span>
                  )}
                  {projectTypeFilter !== 'ALL' && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                      Type: {projectTypeFilter}
                    </span>
                  )}
                  {semesterFilter !== 'ALL' && (
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold">
                      Semester: {semesterFilter}
                    </span>
                  )}
                  {departmentFilter !== 'ALL' && (
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold">
                      Dept: {departmentFilter}
                    </span>
                  )}
                  {academicYearFilter !== 'ALL' && (
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">
                      Year: {academicYearFilter}
                    </span>
                  )}
                  {(statusFilter !== 'ALL' || projectTypeFilter !== 'ALL' || semesterFilter !== 'ALL' || 
                    departmentFilter !== 'ALL' || academicYearFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setStatusFilter('ALL');
                        setProjectTypeFilter('ALL');
                        setSemesterFilter('ALL');
                        setDepartmentFilter('ALL');
                        setAcademicYearFilter('ALL');
                      }}
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-gray-300"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Group Display */}
              {filteredAndSortedGroups.length > 0 ? (
                viewMode === 'cards' ? (
                  <div className="space-y-6">
                    {filteredAndSortedGroups.map((group) => (
                      <div key={group.id} className={`p-6 rounded-2xl border-3 ${
                        group.status === 'PENDING' ? 'bg-yellow-50 border-yellow-500' :
                        group.status === 'ACTIVE' ? 'bg-green-50 border-green-500' :
                        'bg-red-50 border-red-500'
                      }`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-gray-900">{group.title}</h3>
                              <span className={`px-4 py-1 rounded-full border-2 font-bold text-sm ${getStatusColor(group.status)}`}>
                                {group.status}
                              </span>
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                                {group.projectType}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">Group ID: {group.groupId}</p>
                            <p className="text-gray-700 mb-3">{group.description}</p>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div><span className="font-bold">Team Leader:</span> {group.teamLeader.user.name}</div>
                              <div><span className="font-bold">Members:</span> {group.members.length}/4</div>
                              <div><span className="font-bold">Created:</span> {new Date(group.createdAt).toLocaleDateString()}</div>
                              <div>
                                <span className="font-bold">Tech Stack:</span> 
                                {group.frontendTech || group.backendTech ? 
                                  ` ${group.frontendTech || ''} ${group.backendTech || ''}`.trim() : 
                                  ' Not specified'
                                }
                              </div>
                            </div>

                            <div className="mt-3">
                              <span className="font-bold text-sm">Team Members:</span>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {group.members.map((member) => (
                                  <span key={member.id} className={`px-2 py-1 rounded-full text-xs font-bold ${
                                    member.isLeader ? 'bg-blue-100 text-blue-800 border-2 border-blue-500' : 
                                    'bg-gray-100 text-gray-700 border-2 border-gray-400'
                                  }`}>
                                    {member.student.user.name} {member.isLeader && '(Leader)'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedGroup(group);
                                setShowGroupDetails(true);
                              }}
                              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black transition-all duration-200 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            <button
                              onClick={() => handleEditGroup(group)}
                              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black transition-all duration-200 flex items-center gap-2"
                            >
                              <Users className="w-4 h-4" />
                              Edit
                            </button>
                          </div>

                          {group.status === 'PENDING' && (
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleGroupAction(group.groupId, 'APPROVED')}
                                disabled={actionLoading}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                              >
                                <Check className="w-4 h-4" />
                                {actionLoading ? 'Processing...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleReject(group.groupId)}
                                disabled={actionLoading}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                              >
                                <X className="w-4 h-4" />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>

                        {group.status === 'REJECTED' && group.rejectionReason && (
                          <div className="mt-4 p-3 bg-red-100 rounded-2xl border-2 border-red-300">
                            <h4 className="font-bold text-red-800 text-sm mb-1">Rejection Reason:</h4>
                            <p className="text-red-700 text-sm">{group.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Table view
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100 border-b-3 border-gray-300">
                          <th className="text-left py-3 px-4 font-bold">Group</th>
                          <th className="text-left py-3 px-4 font-bold">Leader</th>
                          <th className="text-left py-3 px-4 font-bold">Members</th>
                          <th className="text-left py-3 px-4 font-bold">Status</th>
                          <th className="text-left py-3 px-4 font-bold">Type</th>
                          <th className="text-left py-3 px-4 font-bold">Created</th>
                          <th className="text-left py-3 px-4 font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedGroups.map((group) => (
                          <tr key={group.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-bold">{group.title}</div>
                                <div className="text-sm text-gray-600">{group.groupId}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">{group.teamLeader.user.name}</td>
                            <td className="py-3 px-4">{group.members.length}/4</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(group.status)}`}>
                                {group.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">{group.projectType}</td>
                            <td className="py-3 px-4">{new Date(group.createdAt).toLocaleDateString()}</td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedGroup(group);
                                    setShowGroupDetails(true);
                                  }}
                                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-xl text-xs"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleEditGroup(group)}
                                  className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1 px-3 rounded-xl text-xs"
                                >
                                  Edit
                                </button>
                                {group.status === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() => handleGroupAction(group.groupId, 'APPROVED')}
                                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-xl text-xs"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleReject(group.groupId)}
                                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-xl text-xs"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 flex justify-center">
                    <Users className="w-16 h-16 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700 mb-2">No groups found</h3>
                  <p className="text-gray-600">
                    {searchTerm || statusFilter !== 'ALL' || projectTypeFilter !== 'ALL' 
                      ? 'Try adjusting your filters' 
                      : 'No groups have been created yet'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black">
              <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full bg-blue-100 hover:bg-blue-200 p-3 rounded-2xl border-2 border-blue-500 font-bold text-blue-800 text-center transition-colors duration-200 flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  Generate Report
                </button>
                <button className="w-full bg-green-100 hover:bg-green-200 p-3 rounded-2xl border-2 border-green-500 font-bold text-green-800 text-center transition-colors duration-200 flex items-center justify-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  View Analytics
                </button>
                <button 
                  onClick={() => setShowAnnouncementModal(true)}
                  className="w-full bg-purple-100 hover:bg-purple-200 p-3 rounded-2xl border-2 border-purple-500 font-bold text-purple-800 text-center transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Send Announcement
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Group Details Modal */}
      {showGroupDetails && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900">Group Details</h3>
              <button
                onClick={() => setShowGroupDetails(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-2xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-lg mb-3">{selectedGroup.title}</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-bold">Group ID:</span> {selectedGroup.groupId}</div>
                  <div><span className="font-bold">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedGroup.status)}`}>
                      {selectedGroup.status}
                    </span>
                  </div>
                  <div><span className="font-bold">Project Type:</span> {selectedGroup.projectType}</div>
                  <div><span className="font-bold">Created:</span> {new Date(selectedGroup.createdAt).toLocaleDateString()}</div>
                  <div><span className="font-bold">Frontend:</span> {selectedGroup.frontendTech || 'Not specified'}</div>
                  <div><span className="font-bold">Backend:</span> {selectedGroup.backendTech || 'Not specified'}</div>
                </div>
                
                <div className="mt-4">
                  <h5 className="font-bold mb-2">Description:</h5>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-2xl">{selectedGroup.description}</p>
                </div>
              </div>
              
              <div>
                <h5 className="font-bold text-lg mb-3">Team Members ({selectedGroup.members.length}/4)</h5>
                <div className="space-y-3">
                  {selectedGroup.members.map((member) => (
                    <div key={member.id} className={`p-3 rounded-2xl border-2 ${
                      member.isLeader ? 'bg-blue-500 border-blue-600' : 'bg-gray-50 border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h6 className="font-bold text-sm">{member.student.user.name}</h6>
                          <p className="text-xs text-gray-600">{member.student.user.email}</p>
                          <p className="text-xs text-gray-600">
                            {member.student.enrollmentNo} | {member.student.class}-{member.student.division}
                          </p>
                        </div>
                        {member.isLeader && (
                          <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                            Leader
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {selectedGroup.status === 'REJECTED' && selectedGroup.rejectionReason && (
              <div className="mt-6 p-4 bg-red-50 rounded-2xl border-2 border-red-300">
                <h5 className="font-bold text-red-800 mb-2">Rejection Reason:</h5>
                <p className="text-red-700 text-sm whitespace-pre-line">{selectedGroup.rejectionReason}</p>
              </div>
            )}
            
            {selectedGroup.status === 'PENDING' && (
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={() => {
                    handleGroupAction(selectedGroup.groupId, 'APPROVED');
                    setShowGroupDetails(false);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Approve Group
                </button>
                <button
                  onClick={() => {
                    setShowGroupDetails(false);
                    handleReject(selectedGroup.groupId);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-2xl border-3 border-black transition-all duration-200 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Reject Group
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black max-w-md w-full mx-4">
            <h3 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-2">
              <X className="w-6 h-6 text-red-500" />
              Reject Group Request
            </h3>
            <p className="text-gray-600 mb-6 font-semibold">
              Please provide a detailed reason for rejecting this group request. This will help students understand what needs to be improved.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter the reason for rejection (e.g., unclear project description, inappropriate team composition, missing technical details, etc.)"
              className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-red-500 focus:outline-none font-semibold resize-none"
              rows="4"
              maxLength="500"
            />
            <div className="text-sm text-gray-500 mb-6">
              {rejectionReason.length}/500 characters
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setRejectionModal({ open: false, groupId: null });
                  setRejectionReason('');
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-2xl border-3 border-black transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectionReason.trim() || actionLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-2xl border-3 border-black transition-all duration-200 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Edit Modal */}
      <GroupEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
        onGroupUpdated={handleGroupUpdated}
      />

      {/* Announcement Modal */}
      <AnnouncementModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        groups={groups}
        user={user}
      />
    </div>
  );
};

export default FacultyDashboard;
