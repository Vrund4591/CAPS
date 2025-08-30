/* eslint-disable no-constant-condition */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Search, 
  Filter,
  Edit3,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  Download,
  RefreshCw,
  UserPlus,
  AlertTriangle,
  Check
} from 'lucide-react';

const UserManagementModal = ({ isOpen, onClose, onUserUpdated }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [academicYearFilter, setAcademicYearFilter] = useState('ALL');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkAuthorizeModal, setShowBulkAuthorizeModal] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkRole, setBulkRole] = useState('STUDENT');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [
    isOpen, 
    currentPage, 
    roleFilter, 
    statusFilter, 
    searchTerm, 
    sortBy, 
    sortOrder,
    departmentFilter,
    semesterFilter,
    academicYearFilter
  ]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Build query parameters with all filters
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        role: roleFilter !== 'ALL' ? roleFilter : '',
        status: statusFilter !== 'ALL' ? statusFilter : '',
        search: searchTerm,
        department: departmentFilter !== 'ALL' ? departmentFilter : '',
        semester: semesterFilter !== 'ALL' ? semesterFilter : '',
        academicYear: academicYearFilter !== 'ALL' ? academicYearFilter : '',
        sortBy,
        sortOrder
      });

      // Remove empty parameters
      Array.from(params.entries()).forEach(([key, value]) => {
        if (!value) params.delete(key);
      });

      const response = await fetch(`http://localhost:5001/api/users/all?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setPagination(data.pagination || {});
      } else {
        console.error('Failed to fetch users:', response.status);
        setUsers([]);
        setPagination({});
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      setUsers([]);
      setPagination({});
    }
    setLoading(false);
  };

  // Add filter change handlers that reset pagination
  const handleFilterChange = (filterSetter) => {
    return (value) => {
      filterSetter(value);
      setCurrentPage(1); // Reset to first page when filter changes
    };
  };

  // Replace direct filter setters with handlers
  const handleRoleFilterChange = handleFilterChange(setRoleFilter);
  const handleStatusFilterChange = handleFilterChange(setStatusFilter);
  const handleDepartmentFilterChange = handleFilterChange(setDepartmentFilter);
  const handleSemesterFilterChange = handleFilterChange(setSemesterFilter);
  const handleAcademicYearFilterChange = handleFilterChange(setAcademicYearFilter);

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

  const handleUserSelect = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchUsers();
        onUserUpdated();
        alert('User deleted successfully');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete user');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleBulkAction = async () => {
    if (selectedUsers.size === 0 || !bulkAction) return;

    if (!confirm(`Are you sure you want to ${bulkAction} ${selectedUsers.size} users?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/users/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: bulkAction,
          userIds: Array.from(selectedUsers)
        })
      });

      if (response.ok) {
        const data = await response.json();
        fetchUsers();
        onUserUpdated();
        setSelectedUsers(new Set());
        setBulkAction('');
        alert(data.message);
      } else {
        const data = await response.json();
        alert(data.message || 'Bulk action failed');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleBulkAuthorize = async () => {
    if (!bulkEmails.trim()) {
      alert('Please enter email addresses');
      return;
    }

    const emails = bulkEmails
      .split('\n')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    if (emails.length === 0) {
      alert('Please enter valid email addresses');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/users/bulk-authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          emails,
          role: bulkRole
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Bulk authorization completed!\nAuthorized: ${data.results.authorized.length}\nSkipped: ${data.results.skipped.length}\nErrors: ${data.results.errors.length}`);
        setBulkEmails('');
        setShowBulkAuthorizeModal(false);
        onUserUpdated();
      } else {
        const data = await response.json();
        alert(data.message || 'Bulk authorization failed');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'STUDENT': return 'bg-blue-100 text-blue-800 border-blue-500';
      case 'FACULTY': return 'bg-purple-100 text-purple-800 border-purple-500';
      case 'ADMIN': return 'bg-red-100 text-red-800 border-red-500';
      default: return 'bg-gray-100 text-gray-800 border-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-black max-w-7xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-50 p-6 border-b-3 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                User Management
              </h2>
              <p className="text-blue-700 font-semibold mt-1">
                Manage all system users and their permissions
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchUsers}
                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-2xl transition-colors"
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
          <div className="grid lg:grid-cols-5 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => handleRoleFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="FACULTY">Faculty</option>
              <option value="ADMIN">Admins</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={handleSortChange}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="email-asc">Email A-Z</option>
              <option value="email-desc">Email Z-A</option>
            </select>

            <button
              onClick={() => {/* Export functionality */}}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Additional Filters for Students and Faculty */}
          <div className="grid lg:grid-cols-3 gap-4 mb-4">
            <select
              value={departmentFilter}
              onChange={(e) => handleDepartmentFilterChange(e.target.value)}
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
              value={semesterFilter}
              onChange={(e) => handleSemesterFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>

            <select
              value={academicYearFilter}
              onChange={(e) => handleAcademicYearFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Academic Years</option>
              <option value="2024-25">2024-25</option>
              <option value="2023-24">2023-24</option>
              <option value="2022-23">2022-23</option>
              <option value="2021-22">2021-22</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.size > 0 && (
            <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-xl border-2 border-blue-300">
              <span className="font-bold text-blue-800">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
              </span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1 border-2 border-blue-400 rounded-lg font-semibold"
              >
                <option value="">Choose Action</option>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
                <option value="delete">Delete</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg disabled:opacity-50"
              >
                Apply
              </button>
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-lg"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="p-6 max-h-[calc(95vh-300px)] overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 font-semibold">Loading users...</p>
            </div>
          ) : users.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b-3 border-gray-300">
                      <th className="text-left py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.size === users.length && users.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-bold">User</th>
                      <th className="text-left py-3 px-4 font-bold">Role</th>
                      <th className="text-left py-3 px-4 font-bold">Status</th>
                      <th className="text-left py-3 px-4 font-bold">Joined</th>
                      <th className="text-left py-3 px-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleUserSelect(user.id)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-bold text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-600">{user.email}</div>
                            {user.student && (
                              <div className="text-xs text-gray-500">
                                {user.student.enrollmentNo} | {user.student.class}-{user.student.division}
                              </div>
                            )}
                            {user.faculty && (
                              <div className="text-xs text-gray-500">
                                {user.faculty.department} Department
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            true // Since we don't have isActive field, assume all are active
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {/* View user details */}}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {/* Edit user */}}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded transition-colors"
                              title="Edit User"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {user.role !== 'ADMIN' && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-red-500 hover:bg-red-600 text-white p-1 rounded transition-colors"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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
                    Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, pagination.totalUsers)} of {pagination.totalUsers} users
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
              <h3 className="text-xl font-bold text-gray-700 mb-2">No users found</h3>
              <p className="text-gray-600">
                {searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'No users have been registered yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Authorization Modal */}
      {showBulkAuthorizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black max-w-md w-full mx-4">
            <h3 className="text-xl font-black text-gray-900 mb-4">Bulk Authorize Users</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Email Addresses (one per line)
                </label>
                <textarea
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  placeholder="user1@college.edu&#10;user2@college.edu&#10;user3@college.edu"
                  rows="6"
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
                >
                  <option value="STUDENT">Student</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowBulkAuthorizeModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAuthorize}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-xl"
              >
                Authorize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementModal;
               