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
import { useToast } from '../context/ToastContext';

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

  // New state for CRUD operations
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    studentData: {
      enrollmentNo: '',
      class: '',
      division: '',
      semester: '',
      phoneNumber: ''
    },
    facultyData: {
      department: ''
    }
  });
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    email: '',
    role: '',
    studentData: {
      enrollmentNo: '',
      class: '',
      division: '',
      semester: '',
      phoneNumber: ''
    },
    facultyData: {
      department: ''
    }
  });

  const { toast } = useToast();

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
      
      // Always use client-side filtering for now since server-side may not be fully implemented
      await fetchUsersWithClientSideFiltering(token);
    } catch (error) {
      console.error('Fetch users error:', error);
      setUsers([]);
      setPagination({});
    }
    setLoading(false);
  };

  const fetchUsersWithClientSideFiltering = async (token) => {
    try {
      // Fetch all users without filters for client-side filtering
      const response = await fetch('http://localhost:5001/api/users/all?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        let allUsers = data.users || [];

        // Apply client-side filtering
        const filteredUsers = allUsers.filter(user => {
          // Search filter
          const matchesSearch = !searchTerm.trim() || 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.student?.enrollmentNo && user.student.enrollmentNo.toLowerCase().includes(searchTerm.toLowerCase()));

          // Role filter - FIXED: This was the main issue
          const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;

          // Status filter (assuming all users are active since we don't have isActive field)
          const matchesStatus = statusFilter === 'ALL' || statusFilter === 'ACTIVE';

          // Department filter - only apply when a specific department is selected
          let matchesDepartment = true; // Default to true when no department filter is applied
          
          if (departmentFilter !== 'ALL') {
            let userDepartment = null;
            
            // For students, extract department from class field (e.g., "BE-IT" -> "IT")
            if (user.student?.class) {
              const classParts = user.student.class.split('-');
              if (classParts.length > 1) {
                userDepartment = classParts[1]; // Extract department part (IT, CE, MECH, etc.)
              }
            } 
            // For faculty, check faculty department
            else if (user.faculty?.department) {
              userDepartment = user.faculty.department;
            } 
            // Fallback: check direct department field
            else if (user.department) {
              userDepartment = user.department;
            }

            matchesDepartment = userDepartment === departmentFilter;
          }

          // Semester filter - only apply to students and when a specific semester is selected
          let matchesSemester = true; // Default to true when no semester filter is applied
          
          if (semesterFilter !== 'ALL') {
            if (user.role === 'STUDENT') {
              const userSemester = user.student?.semester;
              matchesSemester = userSemester && userSemester.toString() === semesterFilter;
            } else {
              // For non-students, semester filter doesn't apply, so they pass this filter
              matchesSemester = true;
            }
          }

          // Academic year filter - only apply when a specific year is selected
          let matchesAcademicYear = true; // Default to true when no academic year filter is applied
          
          if (academicYearFilter !== 'ALL') {
            const userDate = new Date(user.createdAt);
            const userYear = userDate.getFullYear();
            const userMonth = userDate.getMonth(); // 0-based month
            
            // Determine academic year based on creation date
            // Academic year typically starts in June/July
            let academicStartYear;
            if (userMonth >= 5) { // June or later (month 5+)
              academicStartYear = userYear;
            } else { // Before June
              academicStartYear = userYear - 1;
            }
            
            const academicYearString = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
            matchesAcademicYear = academicYearString === academicYearFilter;
          }

          return matchesSearch && matchesRole && matchesStatus && matchesDepartment && 
                 matchesSemester && matchesAcademicYear;
        });

        // Apply sorting
        filteredUsers.sort((a, b) => {
          let aValue = a[sortBy];
          let bValue = b[sortBy];
          
          if (sortBy === 'createdAt') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
          } else if (sortBy === 'name') {
            aValue = aValue ? aValue.toLowerCase() : '';
            bValue = bValue ? bValue.toLowerCase() : '';
          } else if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue ? bValue.toLowerCase() : '';
          }
          
          if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });

        // Apply pagination
        const startIndex = (currentPage - 1) * 20;
        const endIndex = startIndex + 20;
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

        setUsers(paginatedUsers);
        setPagination({
          currentPage,
          totalPages: Math.ceil(filteredUsers.length / 20),
          totalUsers: filteredUsers.length,
          hasNext: endIndex < filteredUsers.length,
          hasPrev: currentPage > 1
        });
      } else {
        console.error('Failed to fetch users:', response.status);
        setUsers([]);
        setPagination({});
      }
    } catch (error) {
      console.error('Client-side filtering error:', error);
      setUsers([]);
      setPagination({});
    }
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
    if (!window.confirm('Are you sure you want to delete this user?')) return;

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
        console.error('Delete user error:', data);
        alert(data.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Network error:', error);
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

  // CRUD Operations
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });

      if (response.ok) {
        const data = await response.json();
        alert('User created successfully!');
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          email: '',
          password: '',
          role: 'STUDENT',
          studentData: {
            enrollmentNo: '',
            class: '',
            division: '',
            semester: '',
            phoneNumber: ''
          },
          facultyData: {
            department: ''
          }
        });
        fetchUsers();
        onUserUpdated();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to create user');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/users/${editForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const data = await response.json();
        alert('User updated successfully!');
        setShowEditModal(false);
        setEditForm({
          id: '',
          name: '',
          email: '',
          role: '',
          studentData: {
            enrollmentNo: '',
            class: '',
            division: '',
            semester: '',
            phoneNumber: ''
          },
          facultyData: {
            department: ''
          }
        });
        fetchUsers();
        onUserUpdated();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to update user');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/users/${userId}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setViewingUser(data.user);
        setShowViewModal(true);
      } else {
        const data = await response.json();
        console.error('View user error:', data);
        alert(data.message || 'Failed to fetch user details');
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Network error. Please try again.');
    }
  };

  const openEditModal = (user) => {
    setEditForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentData: {
        enrollmentNo: user.student?.enrollmentNo || '',
        class: user.student?.class || '',
        division: user.student?.division || '',
        semester: user.student?.semester?.toString() || '',
        phoneNumber: user.student?.phoneNumber || ''
      },
      facultyData: {
        department: user.faculty?.department || ''
      }
    });
    setShowEditModal(true);
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Build query parameters based on current filters
      const params = new URLSearchParams();
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (departmentFilter !== 'ALL') params.append('department', departmentFilter);
      if (semesterFilter !== 'ALL') params.append('semester', semesterFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const response = await fetch(`http://localhost:5001/api/users/export/csv?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Get the blob data
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Get filename from response headers or use default
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
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        
        toast.success('Export Complete', `Downloaded ${filename} successfully`);
      } else {
        const errorData = await response.json();
        toast.error('Export Failed', errorData.message || 'Failed to export CSV');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export Error', 'Failed to download CSV file');
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
                onClick={() => setShowCreateModal(true)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-2xl transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Create User
              </button>
              <button
                onClick={() => setShowBulkAuthorizeModal(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-2xl transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Bulk Authorize
              </button>
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
              onClick={handleExportCSV}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
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
              <option value="EXTC">Electronics Engineering</option>
              <option value="EE">Electrical Engineering</option>
              <option value="PROD">Production Engineering</option>
              <option value="AUTO">Automobile Engineering</option>
            </select>

            <select
              value={semesterFilter}
              onChange={(e) => handleSemesterFilterChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(sem => (
                <option key={sem} value={sem.toString()}>Semester {sem}</option>
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
              <option value="2020-21">2020-21</option>
            </select>
          </div>

          {/* Filter Summary */}
          {(departmentFilter !== 'ALL' || semesterFilter !== 'ALL' || academicYearFilter !== 'ALL') && (
            <div className="mb-4 flex flex-wrap gap-2">
              {departmentFilter !== 'ALL' && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                  Dept: {departmentFilter}
                </span>
              )}
              {semesterFilter !== 'ALL' && (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                  Semester: {semesterFilter}
                </span>
              )}
              {academicYearFilter !== 'ALL' && (
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold">
                  Year: {academicYearFilter}
                </span>
              )}
              <button
                onClick={() => {
                  setDepartmentFilter('ALL');
                  setSemesterFilter('ALL');
                  setAcademicYearFilter('ALL');
                }}
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-gray-300 transition-colors"
              >
                Clear Additional Filters
              </button>
            </div>
          )}

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
                                {user.student.semester && <span> | Sem {user.student.semester}</span>}
                                {(user.student.department || user.department) && <span> | {user.student.department || user.department}</span>}
                              </div>
                            )}
                            {user.faculty && (
                              <div className="text-xs text-gray-500">
                                {(user.faculty.department || user.department)} Department
                                {user.faculty.designation && <span> | {user.faculty.designation}</span>}
                              </div>
                            )}
                            {user.role === 'FACULTY' && !user.faculty && user.department && (
                              <div className="text-xs text-gray-500">
                                {user.department} Department
                              </div>
                            )}
                            {user.role === 'STUDENT' && !user.student && user.department && (
                              <div className="text-xs text-gray-500">
                                Department: {user.department}
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
                              onClick={() => handleViewUser(user.id)}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(user)}
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
                {searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL' || 
                 departmentFilter !== 'ALL' || semesterFilter !== 'ALL' || academicYearFilter !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'No users have been registered yet'}
              </p>
              {(searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL' || 
                departmentFilter !== 'ALL' || semesterFilter !== 'ALL' || academicYearFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setRoleFilter('ALL');
                    setStatusFilter('ALL');
                    setDepartmentFilter('ALL');
                    setSemesterFilter('ALL');
                    setAcademicYearFilter('ALL');
                  }}
                  className="mt-3 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-xl transition-colors"
                >
                  Clear All Filters
                </button>
              )}
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-green-600" />
              Create New User
            </h3>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none font-semibold"
                    required
                    minLength="6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none font-semibold"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              {/* Student specific fields */}
              {createForm.role === 'STUDENT' && (
                <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-300">
                  <h4 className="font-bold text-blue-800 mb-3">Student Information</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Enrollment No</label>
                      <input
                        type="text"
                        value={createForm.studentData.enrollmentNo}
                        onChange={(e) => setCreateForm({
                          ...createForm, 
                          studentData: {...createForm.studentData, enrollmentNo: e.target.value}
                        })}
                        className="w-full p-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Class</label>
                      <input
                        type="text"
                        value={createForm.studentData.class}
                        onChange={(e) => setCreateForm({
                          ...createForm, 
                          studentData: {...createForm.studentData, class: e.target.value}
                        })}
                        placeholder="e.g., BE-IT"
                        className="w-full p-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Division</label>
                      <input
                        type="text"
                        value={createForm.studentData.division}
                        onChange={(e) => setCreateForm({
                          ...createForm, 
                          studentData: {...createForm.studentData, division: e.target.value}
                        })}
                        placeholder="e.g., A"
                        className="w-full p-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Semester</label>
                      <select
                        value={createForm.studentData.semester}
                        onChange={(e) => setCreateForm({
                          ...createForm, 
                          studentData: {...createForm.studentData, semester: e.target.value}
                        })}
                        className="w-full p-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                      >
                        <option value="">Select Semester</option>
                        {[1,2,3,4,5,6,7,8].map(sem => (
                          <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={createForm.studentData.phoneNumber}
                        onChange={(e) => setCreateForm({
                          ...createForm, 
                          studentData: {...createForm.studentData, phoneNumber: e.target.value}
                        })}
                        className="w-full p-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Faculty specific fields */}
              {createForm.role === 'FACULTY' && (
                <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-300">
                  <h4 className="font-bold text-purple-800 mb-3">Faculty Information</h4>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Department</label>
                    <select
                      value={createForm.facultyData.department}
                      onChange={(e) => setCreateForm({
                        ...createForm, 
                        facultyData: {...createForm.facultyData, department: e.target.value}
                      })}
                      className="w-full p-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
                    >
                      <option value="">Select Department</option>
                      <option value="IT">Information Technology</option>
                      <option value="CE">Computer Engineering</option>
                      <option value="MECH">Mechanical Engineering</option>
                      <option value="CIVIL">Civil Engineering</option>
                      <option value="ENTC">Electronics & Telecommunication</option>
                    </select>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-6 h-6 text-yellow-600" />
              Edit User
            </h3>
            
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-yellow-500 focus:outline-none font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-yellow-500 focus:outline-none font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-yellow-500 focus:outline-none font-semibold"
                >
                  <option value="STUDENT">Student</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {/* Student specific fields */}
              {editForm.role === 'STUDENT' && (
                <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-300">
                  <h4 className="font-bold text-blue-800 mb-3">Student Information</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Enrollment No</label>
                      <input
                        type="text"
                        value={editForm.studentData.enrollmentNo}
                        onChange={(e) => setEditForm({
                          ...editForm, 
                          studentData: {...editForm.studentData, enrollmentNo: e.target.value}
                        })}
                        className="w-full p-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Class</label>
                      <input
                        type="text"
                        value={editForm.studentData.class}
                        onChange={(e) => setEditForm({
                          ...editForm, 
                          studentData: {...editForm.studentData, class: e.target.value}
                        })}
                        placeholder="e.g., BE-IT"
                        className="w-full p-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Division</label>
                      <input
                        type="text"
                        value={editForm.studentData.division}
                        onChange={(e) => setEditForm({
                          ...editForm, 
                          studentData: {...editForm.studentData, division: e.target.value}
                        })}
                        placeholder="e.g., A"
                        className="w-full p-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Semester</label>
                      <select
                        value={editForm.studentData.semester}
                        onChange={(e) => setEditForm({
                          ...editForm, 
                          studentData: {...editForm.studentData, semester: e.target.value}
                        })}
                        className="w-full p-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                      >
                        <option value="">Select Semester</option>
                        {[1,2,3,4,5,6,7,8].map(sem => (
                          <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={editForm.studentData.phoneNumber}
                        onChange={(e) => setEditForm({
                          ...editForm, 
                          studentData: {...editForm.studentData, phoneNumber: e.target.value}
                        })}
                        className="w-full p-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Faculty specific fields */}
              {editForm.role === 'FACULTY' && (
                <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-300">
                  <h4 className="font-bold text-purple-800 mb-3">Faculty Information</h4>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Department</label>
                    <select
                      value={editForm.facultyData.department}
                      onChange={(e) => setEditForm({
                        ...editForm, 
                        facultyData: {...editForm.facultyData, department: e.target.value}
                      })}
                      className="w-full p-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
                    >
                      <option value="">Select Department</option>
                      <option value="IT">Information Technology</option>
                      <option value="CE">Computer Engineering</option>
                      <option value="MECH">Mechanical Engineering</option>
                      <option value="CIVIL">Civil Engineering</option>
                      <option value="ENTC">Electronics & Telecommunication</option>
                    </select>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-xl"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Eye className="w-6 h-6 text-blue-600" />
                User Details
              </h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-3">Basic Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-bold text-gray-600">Name:</span>
                    <p className="font-semibold">{viewingUser.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-600">Email:</span>
                    <p className="font-semibold">{viewingUser.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-600">Role:</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border-2 ${getRoleColor(viewingUser.role)}`}>
                      {viewingUser.role}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-600">Joined:</span>
                    <p className="font-semibold">{new Date(viewingUser.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Student Information */}
              {viewingUser.student && (
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h4 className="font-bold text-blue-800 mb-3">Student Information</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-bold text-gray-600">Enrollment No:</span>
                      <p className="font-semibold">{viewingUser.student.enrollmentNo}</p>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-600">Class:</span>
                      <p className="font-semibold">{viewingUser.student.class}</p>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-600">Division:</span>
                      <p className="font-semibold">{viewingUser.student.division}</p>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-600">Semester:</span>
                      <p className="font-semibold">{viewingUser.student.semester}</p>
                    </div>
                    {viewingUser.student.phoneNumber && (
                      <div className="md:col-span-2">
                        <span className="text-sm font-bold text-gray-600">Phone:</span>
                        <p className="font-semibold">{viewingUser.student.phoneNumber}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Group Information for Students */}
                  {viewingUser.student.groupMember && (
                    <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                      <span className="text-sm font-bold text-blue-700">Current Group:</span>
                      <p className="font-semibold text-blue-800">
                        {viewingUser.student.groupMember.group.title}
                        {viewingUser.student.groupMember.isLeader && (
                          <span className="ml-2 text-xs bg-blue-200 px-2 py-1 rounded-full">Leader</span>
                        )}
                      </p>
                      <p className="text-sm text-blue-600">
                        Status: {viewingUser.student.groupMember.group.status}
                      </p>
                      {viewingUser.student.groupMember.group.faculty && (
                        <p className="text-sm text-blue-600">
                          Faculty: {viewingUser.student.groupMember.group.faculty.user.name}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Faculty Information */}
              {viewingUser.faculty && (
                <div className="bg-purple-50 p-4 rounded-xl">
                  <h4 className="font-bold text-purple-800 mb-3">Faculty Information</h4>
                  <div>
                    <span className="text-sm font-bold text-gray-600">Department:</span>
                    <p className="font-semibold">{viewingUser.faculty.department}</p>
                  </div>
                  
                  {/* Groups managed by Faculty */}
                  {viewingUser.faculty.groups && viewingUser.faculty.groups.length > 0 && (
                    <div className="mt-4">
                      <span className="text-sm font-bold text-purple-700">Managing Groups:</span>
                      <div className="space-y-2 mt-2">
                        {viewingUser.faculty.groups.map(group => (
                          <div key={group.id} className="p-2 bg-purple-100 rounded-lg">
                            <p className="font-semibold text-purple-800">{group.title}</p>
                            <p className="text-sm text-purple-600">
                              Status: {group.status} | Members: {group.members?.length || 0}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementModal;
