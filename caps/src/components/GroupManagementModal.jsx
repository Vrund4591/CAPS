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
  User,
  Mail,
  Send,
  UserX
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { apiUrl } from '../utils/api';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderData, setReminderData] = useState({
    semesters: [],
    departments: [],
    deadline: '',
    customMessage: ''
  });
  const [studentsWithoutGroups, setStudentsWithoutGroups] = useState([]);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
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
        search: searchTerm,
        sortBy,
        sortOrder
      });

      // Remove empty parameters
      Array.from(params.entries()).forEach(([key, value]) => {
        if (!value) params.delete(key);
      });

      const response = await fetch(apiUrl(`/api/groups/admin/all?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
        setPagination(data.pagination || {});
      } else {
        console.error('Failed to fetch groups:', response.status);
        // Fallback to regular groups endpoint with client-side filtering
        const fallbackResponse = await fetch(apiUrl('/api/groups'), {
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
            
            return matchesSearch && matchesStatus && matchesProjectType && matchesDepartment &&
                   matchesSemester && matchesTeamSize;
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
      const response = await fetch(apiUrl(`/api/groups/admin/${groupId}/force-delete`), {
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
    setSearchTerm('');
  };

  const fetchStudentsWithoutGroups = async () => {
    setPreviewLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (reminderData.semesters.length > 0) {
        params.append('semesters', reminderData.semesters.join(','));
      }
      if (reminderData.departments.length > 0) {
        params.append('departments', reminderData.departments.join(','));
      }

      const response = await fetch(apiUrl(`/api/groups/admin/students-without-groups?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStudentsWithoutGroups(data.students || []);
      }
    } catch (error) {
      console.error('Fetch students without groups error:', error);
    }
    setPreviewLoading(false);
  };

  const sendGroupReminder = async () => {
    setReminderLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/groups/admin/send-group-reminder'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reminderData)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Reminders Sent!', `Successfully sent reminder emails to ${data.count} students`);
        setShowReminderModal(false);
        setReminderData({
          semesters: [],
          departments: [],
          deadline: '',
          customMessage: ''
        });
      } else {
        const errorData = await response.json();
        toast.error('Send Failed', errorData.message || 'Failed to send reminder emails');
      }
    } catch (error) {
      console.error('Send reminder error:', error);
      toast.error('Network Error', 'Please check your connection and try again.');
    }
    setReminderLoading(false);
  };

  const handleReminderDataChange = (field, value) => {
    setReminderData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleSemester = (semester) => {
    setReminderData(prev => ({
      ...prev,
      semesters: prev.semesters.includes(semester)
        ? prev.semesters.filter(s => s !== semester)
        : [...prev.semesters, semester]
    }));
  };

  const toggleDepartment = (department) => {
    setReminderData(prev => ({
      ...prev,
      departments: prev.departments.includes(department)
        ? prev.departments.filter(d => d !== department)
        : [...prev.departments, department]
    }));
  };

  const generateEmailPreview = () => {
    const deadlineText = reminderData.deadline ? `\n\n⏰ **Important Deadline:** ${reminderData.deadline}` : '';
    const customText = reminderData.customMessage ? `\n\n📝 **Additional Information:**\n${reminderData.customMessage}` : '';

    return `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FFFFF4; padding: 20px;">
        <div style="background-color: #F59E0B; padding: 30px 20px; border-radius: 20px 20px 0 0; border: 4px solid #000; border-bottom: none; text-align: center; position: relative;">
          <div style="position: absolute; top: 15px; right: 15px; width: 20px; height: 20px; background-color: #FFD700; border-radius: 50%; border: 3px solid #000;"></div>
          <div style="position: absolute; bottom: 15px; left: 15px; width: 15px; height: 15px; background-color: #FF6B6B; border-radius: 3px; border: 3px solid #000;"></div>
          <h1 style="color: white; font-size: 36px; font-weight: 900; margin: 0; text-shadow: 3px 3px 0px #000;">CAPS</h1>
          <p style="color: #FFFFF4; font-size: 12px; font-weight: 800; margin: 5px 0 0 0; letter-spacing: 2px; text-transform: uppercase;">COLLABORATIVE ASSIGNMENT & PROJECT SYSTEM</p>
        </div>
        
        <div style="background-color: white; padding: 30px; border: 4px solid #000; border-top: none; border-bottom: none;">
          <h2 style="color: #F59E0B; font-size: 24px; font-weight: 900; margin: 0 0 20px 0; text-align: center;">Group Formation Reminder! 📋</h2>
          
          <p style="color: #1F2937; font-size: 16px; font-weight: 500; margin-bottom: 20px;">Dear Student,</p>
          <p style="color: #1F2937; font-size: 16px; font-weight: 500, margin-bottom: 20px;">📢 <strong>Important Reminder!</strong> We noticed that you haven't joined or created a project group yet.</p>
          
          <div style="background-color: #FFFFF4; border: 3px solid #000; border-radius: 15px; padding: 20px; margin: 20px 0;">
            <div style="margin: 8px 0; font-weight: 600;">
              <div style="color: #6B7280; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">What You Need to Do</div>
              <div style="color: #1F2937; font-weight: 700; font-size: 16px;">Join an existing group OR create a new group with your classmates</div>
            </div>
            <div style="margin: 8px 0; font-weight: 600;">
              <div style="color: #6B7280; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Maximum Group Size</div>
              <div style="color: #1F2937; font-weight: 700; font-size: 16px;">4 students per group</div>
            </div>
            <div style="margin: 8px 0; font-weight: 600;">
              <div style="color: #6B7280; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Project Types Available</div>
              <div style="color: #1F2937; font-weight: 700; font-size: 16px;">UDP (User Defined Project) or IDP (Industry Defined Project)</div>
            </div>
            ${reminderData.deadline ? `
              <div style="margin: 8px 0; font-weight: 600;">
                <div style="color: #6B7280; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">⏰ Deadline</div>
                <div style="color: #EF4444; font-weight: 900; font-size: 16px;">${reminderData.deadline}</div>
              </div>
            ` : ''}
          </div>
          
          ${reminderData.customMessage ? `
            <div style="background-color: #FEF3C7; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #F59E0B;">
              <div style="color: #6B7280; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">📝 Additional Information</div>
              <div style="color: #1F2937; font-weight: 600; margin-top: 5px; white-space: pre-line;">${reminderData.customMessage}</div>
            </div>
          ` : ''}
          
          <div style="background-color: #F59E0B; color: white; padding: 8px 16px; border-radius: 20px; border: 3px solid #000; font-weight: 900; font-size: 14px; display: inline-block; margin: 10px 0;">⚠️ Action Required - Create or Join Group</div>
          
          <p style="color: #1F2937; font-size: 16px; font-weight: 500, margin-bottom: 20px;">Don't miss out on this collaborative learning experience! Log in to CAPS now to create your group or join an existing one. 🚀</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="#" style="display: inline-block; background-color: #F59E0B; color: white; text-decoration: none; padding: 15px 30px; border-radius: 15px; border: 4px solid #000; font-weight: 900; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 6px 6px 0px #000;">Access CAPS Now</a>
          </div>
          
          <p style="color: #7C3AED; font-weight: bold; margin-top: 30px;">Need help? Contact your faculty or the CAPS support team! 💪</p>
        </div>
        
        <div style="background-color: #1F2937; color: white; padding: 25px; text-align: center; border: 4px solid #000; border-radius: 0 0 20px 20px; border-top: none;">
          <div style="position: relative;">
            <div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); width: 40px; height: 4px; background-color: #F59E0B; border-radius: 2px;"></div>
            <p style="font-size: 12px; font-weight: 600; margin: 0; opacity: 0.8;">
              This is an automated notification from the CAPS system.<br>
              © CAPS - Making collaboration awesome! 🚀
            </p>
          </div>
        </div>
      `;
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (projectTypeFilter !== 'ALL') params.append('projectType', projectTypeFilter);
      if (departmentFilter !== 'ALL') params.append('department', departmentFilter);

      const response = await fetch(apiUrl(`/api/groups/export/csv?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'CAPS_Groups_Export.csv';
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
                onClick={() => setShowReminderModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-2xl transition-colors flex items-center gap-2 px-4"
                title="Send Group Formation Reminders"
              >
                <UserX className="w-5 h-5" />
                <span className="font-bold">Send Reminders</span>
              </button>
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
          </div>

          {/* Second row with remaining filters */}
          <div className="grid lg:grid-cols-4 gap-4 mb-4">
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

            <button
              onClick={handleExportCSV}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>

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

      {/* Group Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <UserX className="w-6 h-6 text-orange-600" />
                Send Group Formation Reminders
              </h3>
              <button
                onClick={() => setShowReminderModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-2xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid gap-6">
              {/* Filter Options */}
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-300">
                  <h4 className="font-bold text-blue-900 mb-3">Target Students</h4>
                  
                  {/* Semester Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Select Semesters (leave empty for all)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1,2,3,4,5,6,7,8].map(sem => (
                        <button
                          key={sem}
                          type="button"
                          onClick={() => toggleSemester(sem)}
                          className={`p-2 rounded-xl border-2 font-bold text-sm transition-colors ${
                            reminderData.semesters.includes(sem)
                              ? 'bg-blue-500 border-blue-600 text-white'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                          }`}
                        >
                          Sem {sem}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Department Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Select Departments (leave empty for all)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['IT', 'CE', 'MECH', 'CIVIL', 'ENTC'].map(dept => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => toggleDepartment(dept)}
                          className={`p-2 rounded-xl border-2 font-bold text-sm transition-colors ${
                            reminderData.departments.includes(dept)
                              ? 'bg-green-500 border-green-600 text-white'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={fetchStudentsWithoutGroups}
                    disabled={previewLoading}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {previewLoading ? 'Loading...' : 'Preview Target Students'}
                  </button>
                </div>

                {/* Message Options */}
                <div className="bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-300">
                  <h4 className="font-bold text-yellow-900 mb-3">Message Details</h4>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Deadline (optional)
                    </label>
                    <input
                      type="text"
                      value={reminderData.deadline}
                      onChange={(e) => handleReminderDataChange('deadline', e.target.value)}
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-yellow-500 focus:outline-none font-semibold"
                      placeholder="e.g., December 15, 2024 at 11:59 PM"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Custom Message (optional)
                    </label>
                    <textarea
                      value={reminderData.customMessage}
                      onChange={(e) => handleReminderDataChange('customMessage', e.target.value)}
                      rows="4"
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-yellow-500 focus:outline-none font-semibold"
                      placeholder="Add any additional instructions or information for students..."
                    />
                  </div>

                  {/* Email Preview Button */}
                  <button
                    onClick={() => setShowEmailPreview(true)}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview Email
                  </button>
                </div>
              </div>

              {/* Preview Students - Only show when there are students or loading */}
              {(studentsWithoutGroups.length > 0 || previewLoading || (reminderData.semesters.length > 0 || reminderData.departments.length > 0)) && (
                <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-300">
                  <h4 className="font-bold text-gray-900 mb-3">
                    Students Without Groups ({studentsWithoutGroups.length})
                  </h4>
                  
                  {previewLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Loading students...</p>
                    </div>
                  ) : studentsWithoutGroups.length > 0 ? (
                    <div className="space-y-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {studentsWithoutGroups.map((student) => (
                        <div key={student.id} className="bg-white p-3 rounded-xl border border-gray-200">
                          <div className="font-bold text-sm">{student.name}</div>
                          <div className="text-xs text-gray-600">{student.enrollmentNo}</div>
                          <div className="text-xs text-gray-600">
                            Sem {student.semester} | {student.class}-{student.division}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <UserX className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm font-semibold">
                        {reminderData.semesters.length > 0 || reminderData.departments.length > 0
                          ? 'No students found matching the criteria'
                          : 'Click "Preview Target Students" to see who will receive reminders'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6 pt-6 border-t-2 border-gray-300">
              <div className="text-sm text-gray-600">
                {studentsWithoutGroups.length > 0 && (
                  <p className="font-semibold">
                    Ready to send reminders to {studentsWithoutGroups.length} students
                  </p>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={sendGroupReminder}
                  disabled={reminderLoading || studentsWithoutGroups.length === 0}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {reminderLoading ? 'Sending...' : `Send Reminders (${studentsWithoutGroups.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {showEmailPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border-4 border-black max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-indigo-50 p-6 border-b-3 border-indigo-500">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Eye className="w-6 h-6 text-indigo-600" />
                    Email Preview
                  </h3>
                  <p className="text-indigo-700 font-semibold mt-1">
                    This is how the reminder email will look to students
                  </p>
                </div>
                <button
                  onClick={() => setShowEmailPreview(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-2xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Email Preview Content */}
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              <div className="bg-gray-100 p-4 rounded-xl border-2 border-gray-300 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-800">Email Subject:</h4>
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">
                    System Generated
                  </span>
                </div>
                <p className="text-gray-700 font-semibold">
                  🎯 Group Formation Reminder{reminderData.deadline ? ` - Deadline: ${reminderData.deadline}` : ''}
                </p>
              </div>

              <div className="bg-white border-2 border-gray-300 rounded-xl overflow-hidden">
                <div className="bg-gray-50 p-3 border-b border-gray-300">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="font-bold">From:</span> CAPS System 🎓 &lt;noreply@caps.edu&gt;
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Users className="w-4 h-4" />
                    <span className="font-bold">To:</span> {studentsWithoutGroups.length} students without groups
                  </div>
                </div>
                
                <div 
                  className="p-4 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: generateEmailPreview() }}
                />
              </div>

              {/* Email Stats */}
              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-300 text-center">
                  <div className="text-2xl font-black text-blue-800">{studentsWithoutGroups.length}</div>
                  <div className="text-blue-700 font-bold text-sm">Recipients</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border-2 border-green-300 text-center">
                  <div className="text-2xl font-black text-green-800">
                    {reminderData.semesters.length > 0 ? reminderData.semesters.length : 'All'}
                  </div>
                  <div className="text-green-700 font-bold text-sm">Semesters</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-300 text-center">
                  <div className="text-2xl font-black text-purple-800">
                    {reminderData.departments.length > 0 ? reminderData.departments.length : 'All'}
                  </div>
                  <div className="text-purple-700 font-bold text-sm">Departments</div>
                </div>
              </div>

              {/* Preview Info */}
              <div className="mt-4 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-300">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-yellow-800 text-sm">
                    <p className="font-bold mb-2">Email Preview Notes:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• This preview shows the actual HTML email that will be sent</li>
                      <li>• The CAPS branding and styling will be preserved</li>
                      <li>• Each student will receive a personalized copy</li>
                      <li>• Links and buttons in the actual email will be functional</li>
                      {reminderData.deadline && <li>• Deadline information is prominently displayed</li>}
                      {reminderData.customMessage && <li>• Your custom message is included in the email body</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Modal Footer */}
            <div className="bg-gray-50 p-6 border-t-2 border-gray-300 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <p className="font-semibold">
                  Ready to send to {studentsWithoutGroups.length} students
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEmailPreview(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black transition-all duration-200"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => {
                    setShowEmailPreview(false);
                    sendGroupReminder();
                  }}
                  disabled={reminderLoading || studentsWithoutGroups.length === 0}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {reminderLoading ? 'Sending...' : 'Send Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
