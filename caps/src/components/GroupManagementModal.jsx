/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Search, 
  Filter,
  Eye,
  Edit3,
  Trash2,
  Crown,
  AlertCircle,
  RefreshCw,
  Download,
  Calendar,
  User
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const GroupManagementModal = ({ isOpen, onClose, onGroupUpdated }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectTypeFilter, setProjectTypeFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [teamSizeFilter, setTeamSizeFilter] = useState('ALL');
  const [academicYearFilter, setAcademicYearFilter] = useState('ALL');
  const [frontendTechFilter, setFrontendTechFilter] = useState('ALL');
  const [backendTechFilter, setBackendTechFilter] = useState('ALL');
  const [creationDateFilter, setCreationDateFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
    }
  }, [
    isOpen, 
    currentPage, 
    statusFilter, 
    projectTypeFilter, 
    departmentFilter, 
    semesterFilter, 
    teamSizeFilter, 
    academicYearFilter, 
    frontendTechFilter, 
    backendTechFilter, 
    creationDateFilter, 
    searchTerm, 
    sortBy, 
    sortOrder
  ]);

  // Add filter change handlers that reset pagination
  const handleFilterChange = (filterSetter) => {
    return (value) => {
      filterSetter(value);
      setCurrentPage(1); // Reset to first page when filter changes
    };
  };

  const handleStatusFilterChange = handleFilterChange(setStatusFilter);
  const handleProjectTypeFilterChange = handleFilterChange(setProjectTypeFilter);
  const handleDepartmentFilterChange = handleFilterChange(setDepartmentFilter);
  const handleSemesterFilterChange = handleFilterChange(setSemesterFilter);
  const handleTeamSizeFilterChange = handleFilterChange(setTeamSizeFilter);
  const handleAcademicYearFilterChange = handleFilterChange(setAcademicYearFilter);
  const handleFrontendTechFilterChange = handleFilterChange(setFrontendTechFilter);
  const handleBackendTechFilterChange = handleFilterChange(setBackendTechFilter);
  const handleCreationDateFilterChange = handleFilterChange(setCreationDateFilter);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleSortChange = (e) => {
    const [field, order] = e.target.value.split('-');
    setSortBy(field);
    setSortOrder(order);
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        status: statusFilter !== 'ALL' ? statusFilter : '',
        projectType: projectTypeFilter !== 'ALL' ? projectTypeFilter : '',
        department: departmentFilter !== 'ALL' ? departmentFilter : '',
        semester: semesterFilter !== 'ALL' ? semesterFilter : '',
        teamSize: teamSizeFilter !== 'ALL' ? teamSizeFilter : '',
        academicYear: academicYearFilter !== 'ALL' ? academicYearFilter : '',
        frontendTech: frontendTechFilter !== 'ALL' ? frontendTechFilter : '',
        backendTech: backendTechFilter !== 'ALL' ? backendTechFilter : '',
        creationDate: creationDateFilter !== 'ALL' ? creationDateFilter : '',
        search: searchTerm,
        sortBy,
        sortOrder
      });

      // Remove empty parameters
      Array.from(params.entries()).forEach(([key, value]) => {
        if (!value) params.delete(key);
      });

      const response = await fetch(`http://localhost:5001/api/groups/admin/all?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
        setPagination(data.pagination || {});
      } else {
        console.error('Failed to fetch groups:', response.status);
        // Fallback to regular groups endpoint with client-side filtering
        const fallbackResponse = await fetch('http://localhost:5001/api/groups', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          let filteredGroups = fallbackData.groups || [];
          
          // Apply client-side filtering
          filteredGroups = filteredGroups.filter(group => {
            const matchesSearch = !searchTerm || 
              group.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              group.groupId.toLowerCase().includes(searchTerm.toLowerCase()) ||
              group.teamLeader?.user?.name.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'ALL' || group.status === statusFilter;
            const matchesProjectType = projectTypeFilter === 'ALL' || group.projectType === projectTypeFilter;
            
            // Fix department filtering - check both faculty department and student classes
            const matchesDepartment = departmentFilter === 'ALL' || 
              group.faculty?.department === departmentFilter ||
              group.members?.some(member => {
                if (member.student?.class) {
                  const classParts = member.student.class.split('-');
                  return classParts.length > 1 && classParts[1] === departmentFilter;
                }
                return false;
              });
            
            const matchesSemester = semesterFilter === 'ALL' || 
              group.members?.some(member => member.student?.semester?.toString() === semesterFilter);
            
            const matchesTeamSize = teamSizeFilter === 'ALL' || 
              group.members?.length?.toString() === teamSizeFilter;
            
            const matchesFrontendTech = frontendTechFilter === 'ALL' || 
              (group.frontendTech && group.frontendTech.toLowerCase().includes(frontendTechFilter.toLowerCase()));
            
            const matchesBackendTech = backendTechFilter === 'ALL' || 
              (group.backendTech && group.backendTech.toLowerCase().includes(backendTechFilter.toLowerCase()));
            
            return matchesSearch && matchesStatus && matchesProjectType && matchesDepartment &&
                   matchesSemester && matchesTeamSize && matchesFrontendTech && matchesBackendTech;
          });
          
          setGroups(filteredGroups);
          setPagination({
            currentPage: 1,
            totalPages: 1,
            totalGroups: filteredGroups.length,
            hasNext: false,
            hasPrev: false
          });
        } else {
          setGroups([]);
          setPagination({});
        }
      }
    } catch (error) {
      console.error('Fetch groups error:', error);
      setGroups([]);
      setPagination({});
    }
    setLoading(false);
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to force delete this group? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/groups/admin/${groupId}/force-delete`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Group Deleted', 'Group has been permanently deleted from the system');
        fetchGroups();
        onGroupUpdated();
      } else {
        const data = await response.json();
        console.error('Delete group error:', data);
        toast.error('Delete Failed', data.message || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Network error:', error);
      toast.error('Network Error', 'Please check your connection and try again.');
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

  const handleClearAllFilters = () => {
    setStatusFilter('ALL');
    setProjectTypeFilter('ALL');
    setDepartmentFilter('ALL');
    setSemesterFilter('ALL');
    setTeamSizeFilter('ALL');
    setAcademicYearFilter('ALL');
    setFrontendTechFilter('ALL');
    setBackendTechFilter('ALL');
    setCreationDateFilter('ALL');
    setSearchTerm('');
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
                <Users className="w-6 h-6 text-purple-600" />
                Group Management
              </h2>
              <p className="text-purple-700 font-semibold mt-1">
                Manage all student groups and monitor project progress
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchGroups}
                className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-2xl transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
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

        {/* Filters and Actions */}
        <div className="bg-gray-50 p-4 border-b-2 border-gray-300">
          <div className="grid lg:grid-cols-6 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={projectTypeFilter}
              onChange={(e) => handleProjectTypeFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Types</option>
              <option value="UDP">UDP</option>
              <option value="IDP">IDP</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => handleDepartmentFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Departments</option>
              <option value="IT">Information Technology</option>
              <option value="CE">Computer Engineering</option>
              <option value="MECH">Mechanical Engineering</option>
              <option value="CIVIL">Civil Engineering</option>
              <option value="ENTC">Electronics & Telecommunication</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={handleSortChange}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="status-asc">Status A-Z</option>
              <option value="status-desc">Status Z-A</option>
            </select>

            <button
              onClick={() => {/* Export functionality */}}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Additional Advanced Filters */}
          <div className="grid lg:grid-cols-4 gap-4 mb-4">
            <select
              value={semesterFilter}
              onChange={(e) => handleSemesterFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>

            <select
              value={teamSizeFilter}
              onChange={(e) => handleTeamSizeFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Team Sizes</option>
              <option value="1">1 Member</option>
              <option value="2">2 Members</option>
              <option value="3">3 Members</option>
              <option value="4">4 Members (Full)</option>
            </select>

            <select
              value={academicYearFilter}
              onChange={(e) => handleAcademicYearFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Academic Years</option>
              <option value="2024-25">2024-25</option>
              <option value="2023-24">2023-24</option>
              <option value="2022-23">2022-23</option>
              <option value="2021-22">2021-22</option>
            </select>

            <select
              value={creationDateFilter}
              onChange={(e) => handleCreationDateFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Creation Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          {/* Technology Stack Filters */}
          <div className="grid lg:grid-cols-4 gap-4">
            <select
              value={frontendTechFilter}
              onChange={(e) => handleFrontendTechFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Frontend Tech</option>
              <option value="React">React</option>
              <option value="Angular">Angular</option>
              <option value="Vue">Vue.js</option>
              <option value="HTML">HTML/CSS/JS</option>
              <option value="Flutter">Flutter</option>
            </select>

            <select
              value={backendTechFilter}
              onChange={(e) => handleBackendTechFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Backend Tech</option>
              <option value="Node">Node.js</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="PHP">PHP</option>
              <option value="C#">C#/.NET</option>
            </select>

            <select
              value={creationDateFilter}
              onChange={(e) => handleCreationDateFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Creation Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>

            <button
              onClick={handleClearAllFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Groups Table */}
        <div className="p-6 max-h-[calc(95vh-300px)] overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 font-semibold">Loading groups...</p>
            </div>
          ) : groups.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b-3 border-gray-300">
                      <th className="text-left py-3 px-4 font-bold">Group</th>
                      <th className="text-left py-3 px-4 font-bold">Team Leader</th>
                      <th className="text-left py-3 px-4 font-bold">Members</th>
                      <th className="text-left py-3 px-4 font-bold">Faculty</th>
                      <th className="text-left py-3 px-4 font-bold">Status</th>
                      <th className="text-left py-3 px-4 font-bold">Created</th>
                      <th className="text-left py-3 px-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <tr key={group.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-bold text-gray-900">{group.title}</div>
                            <div className="text-sm text-gray-600">{group.groupId}</div>
                            <div className="text-xs text-purple-600">{group.projectType}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{group.teamLeader?.user?.name || 'Unknown'}</span>
                            <Crown className="w-4 h-4 text-yellow-500" />
                          </div>
                          <div className="text-sm text-gray-600">
                            {group.teamLeader?.enrollmentNo || group.teamLeader?.student?.enrollmentNo || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <span className="font-semibold">{group.members?.length || 0}/4</span>
                            <div className="text-xs text-gray-600 mt-1">
                              {group.members?.slice(0, 2).map((member, index) => (
                                <div key={index}>
                                  <h6 className="font-bold text-sm flex items-center gap-2">
                                    {member.student?.user?.name || member.user?.name || 'Unknown User'}
                                    {member.isLeader && <Crown className="w-4 h-4 text-yellow-500" />}
                                  </h6>
                                  <p className="text-xs text-gray-600">
                                    {member.student?.user?.email || member.user?.email || 'No email'}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {member.student?.enrollmentNo || 'N/A'} | {member.student?.class || 'N/A'}-{member.student?.division || 'N/A'}
                                  </p>
                                </div>
                              ))}
                              {group.members?.length > 2 && (
                                <div className="text-xs text-blue-600 mt-1">
                                  +{group.members.length - 2} more
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold">{group.faculty?.user?.name || 'Not assigned'}</div>
                          <div className="text-sm text-gray-600">{group.faculty?.department || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(group.status)}`}>
                            {group.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(group.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedGroup(group);
                                setShowGroupDetails(true);
                              }}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {/* Edit group */}}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded transition-colors"
                              title="Edit Group"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group.groupId)}
                              className="bg-red-500 hover:bg-red-600 text-white p-1 rounded transition-colors"
                              title="Force Delete Group"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, pagination.totalGroups)} of {pagination.totalGroups} groups
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={!pagination.hasPrev}
                      className="bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-gray-700 font-bold py-2 px-4 rounded-xl"
                    >
                      Previous
                    </button>
                    <span className="flex items-center px-4 font-bold">
                      Page {currentPage} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!pagination.hasNext}
                      className="bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-gray-700 font-bold py-2 px-4 rounded-xl"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">No groups found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'ALL' || projectTypeFilter !== 'ALL' || departmentFilter !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'No groups have been created yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Group Details Modal */}
      {showGroupDetails && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
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
                  <div><span className="font-bold">Faculty:</span> {selectedGroup.faculty?.user?.name || 'Not assigned'}</div>
                  <div><span className="font-bold">Department:</span> {selectedGroup.faculty?.department || 'N/A'}</div>
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
                <h5 className="font-bold text-lg mb-3">Team Members ({selectedGroup.members?.length || 0}/4)</h5>
                <div className="space-y-3">
                  {selectedGroup.members?.map((member) => (
                    <div key={member.id} className={`p-3 rounded-2xl border-2 ${
                      member.isLeader ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h6 className="font-bold text-sm flex items-center gap-2">
                            {member.student?.user?.name || member.user?.name || 'Unknown User'}
                            {member.isLeader && <Crown className="w-4 h-4 text-yellow-500" />}
                          </h6>
                          <p className="text-xs text-gray-600">
                            {member.student?.user?.email || member.user?.email || 'No email'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {member.student?.enrollmentNo || 'N/A'} | {member.student?.class || 'N/A'}-{member.student?.division || 'N/A'}
                          </p>
                        </div>
                        {member.isLeader && (
                          <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                            Leader
                          </span>
                        )}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-gray-500">
                      <User className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm font-semibold">No members found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {selectedGroup.status === 'REJECTED' && selectedGroup.rejectionReason && (
              <div className="mt-6 p-4 bg-red-50 rounded-2xl border-2 border-red-300">
                <h5 className="font-bold text-red-800 mb-2">Rejection Reason:</h5>
                <p className="text-red-700 text-sm whitespace-pre-line">{selectedGroup.rejectionReason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagementModal;
