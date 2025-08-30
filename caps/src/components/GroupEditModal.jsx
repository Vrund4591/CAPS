/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Users, 
  Search,
  UserPlus,
  UserMinus,
  AlertCircle,
  Monitor,
  Clipboard
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const GroupEditModal = ({ isOpen, onClose, group, onGroupUpdated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectType: 'UDP',
    frontendTech: '',
    backendTech: '',
    status: 'PENDING',
    members: []
  });
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && group) {
      // Initialize form data
      setFormData({
        title: group.title || '',
        description: group.description || '',
        projectType: group.projectType || 'UDP',
        frontendTech: group.frontendTech || '',
        backendTech: group.backendTech || '',
        status: group.status || 'PENDING',
        members: group.members?.map(member => ({
          studentId: member.student.id,
          isLeader: member.isLeader
        })) || []
      });
      
      // Fetch available students
      fetchAvailableStudents();
    }
  }, [isOpen, group]);

  const fetchAvailableStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/groups/available-students-faculty', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableStudents(data.students || []);
      }
    } catch (error) {
      console.error('Error fetching available students:', error);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddMember = (student) => {
    if (formData.members.length >= 4) {
      toast.error('Team Full', 'Maximum 4 members allowed in a group');
      setError('Maximum 4 members allowed in a group');
      return;
    }

    if (formData.members.some(member => member.studentId === student.id)) {
      toast.warning('Already Added', 'Student is already a member of this group');
      setError('Student is already a member of this group');
      return;
    }

    const newMember = {
      studentId: student.id,
      isLeader: formData.members.length === 0, // First member becomes leader
    };

    setFormData(prev => ({
      ...prev,
      members: [...prev.members, newMember]
    }));
    toast.success('Member Added', `${student.user.name} has been added to the group`);
    setError('');
  };

  const handleRemoveMember = (studentId) => {
    const removedMember = formData.members.find(m => m.studentId === studentId);
    const studentName = availableStudents.find(s => s.id === studentId)?.user?.name || 'Student';
    
    const updatedMembers = formData.members.filter(m => m.studentId !== studentId);
    
    // If removing the leader, make the first remaining member the leader
    if (updatedMembers.length > 0 && formData.members.find(m => m.studentId === studentId)?.isLeader) {
      updatedMembers[0].isLeader = true;
    }

    setFormData(prev => ({
      ...prev,
      members: updatedMembers
    }));
    toast.info('Member Removed', `${studentName} has been removed from the group`);
    setError('');
  };

  const handleMakeLeader = (studentId) => {
    const updatedMembers = formData.members.map(member => ({
      ...member,
      isLeader: member.studentId === studentId
    }));
    setFormData(prev => ({
      ...prev,
      members: updatedMembers
    }));
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5001/api/groups/${group.groupId}/update-faculty`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedGroup = await response.json();
        toast.success('Group Updated!', 'Group information has been successfully updated');
        onGroupUpdated(updatedGroup.group);
        onClose();
      } else {
        const errorData = await response.json();
        toast.error('Update Failed', errorData.message || 'Failed to update group');
        setError(errorData.message || 'Failed to update group');
      }
    } catch (error) {
      console.error('Update group failed:', error);
      toast.error('Network Error', 'Please check your connection and try again.');
      setError('Network error. Please try again.');
    }
    setSaveLoading(false);
  };

  const filteredStudents = availableStudents.filter(student => {
    // First filter by search term
    const matchesSearch = !searchTerm || 
      student.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.enrollmentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.division.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by class - extract department from class field for comparison
    const matchesClass = classFilter === 'ALL' || (() => {
      if (classFilter.includes('-')) {
        // If filter includes hyphen, match exact class
        return student.class === classFilter;
      } else {
        // If filter is just department, extract from student's class
        const classParts = student.class?.split('-');
        return classParts && classParts.length > 1 && classParts[1] === classFilter;
      }
    })();
    
    // Filter by semester
    const matchesSemester = semesterFilter === 'ALL' || student.semester?.toString() === semesterFilter;
    
    // Filter by division
    const matchesDivision = divisionFilter === 'ALL' || student.division === divisionFilter;
    
    // Filter by availability
    const matchesAvailability = availabilityFilter === 'ALL' || 
      (availabilityFilter === 'AVAILABLE' && !student.groupMember) ||
      (availabilityFilter === 'IN_GROUP' && student.groupMember);
    
    // Then exclude students who are already members of this group
    const isAlreadyMember = formData.members.some(member => member.studentId === student.id);
    
    // Also exclude students who are in other active groups (but allow those in pending/rejected groups)
    const isInOtherActiveGroup = student.groupMember && 
      student.groupMember.group.status === 'ACTIVE' && 
      student.groupMember.group.id !== group?.id;
    
    return matchesSearch && matchesClass && matchesSemester && matchesDivision && 
           matchesAvailability && !isAlreadyMember && !isInOtherActiveGroup;
  });

  const handleQuickFilter = (filterType) => {
    // Get current group leader's data for comparison
    const leaderData = group?.members?.find(member => member.isLeader)?.student;
    
    switch (filterType) {
      case 'sameClass':
        setClassFilter(leaderData?.class || 'ALL');
        break;
      case 'sameDivision':
        setDivisionFilter(leaderData?.division || 'ALL');
        break;
      case 'sameSemester':
        setSemesterFilter(leaderData?.semester?.toString() || 'ALL');
        break;
      case 'availableOnly':
        setAvailabilityFilter('AVAILABLE');
        break;
      case 'clearFilters':
        setClassFilter('ALL');
        setSemesterFilter('ALL');
        setDivisionFilter('ALL');
        setAvailabilityFilter('ALL');
        setSearchTerm('');
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-black max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-50 p-6 border-b-3 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Edit Group: {group?.title}
              </h2>
              <p className="text-blue-700 font-semibold mt-1">
                Modify group information and manage team members
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-2xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-3 border-red-500 rounded-2xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-700 font-bold">{error}</p>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Group Information */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-blue-50 p-6 rounded-2xl border-3 border-blue-500">
                <h3 className="text-lg font-black text-blue-900 mb-4 flex items-center gap-2">
                  <Clipboard className="w-5 h-5" />
                  Basic Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Group Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Project Type *
                    </label>
                    <select
                      name="projectType"
                      value={formData.projectType}
                      onChange={handleInputChange}
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                    >
                      <option value="UDP">UDP - User Defined Project</option>
                      <option value="IDP">IDP - Industry Defined Project</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="ACTIVE">Active</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Project Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Technology Stack */}
              <div className="bg-purple-50 p-6 rounded-2xl border-3 border-purple-500">
                <h3 className="text-lg font-black text-purple-900 mb-4 flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Technology Stack
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Frontend Technologies
                    </label>
                    <input
                      type="text"
                      name="frontendTech"
                      value={formData.frontendTech}
                      onChange={handleInputChange}
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
                      placeholder="React, Angular, Vue.js, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Backend Technologies
                    </label>
                    <input
                      type="text"
                      name="backendTech"
                      value={formData.backendTech}
                      onChange={handleInputChange}
                      className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-semibold"
                      placeholder="Node.js, Python, Java, etc."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Team Management */}
            <div className="space-y-6">
              {/* Current Members */}
              <div className="bg-green-50 p-6 rounded-2xl border-3 border-green-500">
                <h3 className="text-lg font-black text-green-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Current Members ({formData.members.length}/4)
                </h3>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {formData.members.map((member) => {
                    // Find the student data for this member
                    const studentData = availableStudents.find(s => s.id === member.studentId) || 
                      group?.members?.find(m => m.student.id === member.studentId)?.student;
                    
                    if (!studentData) return null;
                    
                    return (
                      <div key={member.studentId} className={`p-3 rounded-xl border-2 ${
                        member.isLeader ? 'bg-yellow-100 border-yellow-500' : 'bg-white border-gray-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-sm flex items-center gap-2">
                              {studentData.user?.name || studentData.name || 'Unknown'}
                              {member.isLeader && <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">Leader</span>}
                            </h4>
                            <p className="text-xs text-gray-600">{studentData.enrollmentNo || 'N/A'}</p>
                            <p className="text-xs text-gray-600">{studentData.class || 'N/A'}-{studentData.division || 'N/A'}</p>
                          </div>
                          <div className="flex space-x-1">
                            {!member.isLeader && (
                              <button
                                onClick={() => handleMakeLeader(member.studentId)}
                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded font-bold hover:bg-blue-600"
                              >
                                Make Leader
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMember(member.studentId)}
                              className="text-xs bg-red-500 text-white px-2 py-1 rounded font-bold hover:bg-red-600"
                            >
                              <UserMinus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add New Members */}
              <div className="bg-gray-50 p-6 rounded-2xl border-3 border-gray-300">
                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Add New Members
                </h3>
                
                {/* Search with Advanced Filters */}
                <div className="mb-4 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students by name, enrollment, class, or division..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                    />
                  </div>
                  
                  {/* Quick Filter Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button 
                      type="button"
                      onClick={() => handleQuickFilter('sameClass')}
                      className={`px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-200 transition-colors ${
                        classFilter !== 'ALL' ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      Same Class
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleQuickFilter('sameDivision')}
                      className={`px-3 py-1 rounded-full text-xs font-bold hover:bg-green-200 transition-colors ${
                        divisionFilter !== 'ALL' ? 'bg-green-200 text-green-800' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      Same Division
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleQuickFilter('sameSemester')}
                      className={`px-3 py-1 rounded-full text-xs font-bold hover:bg-purple-200 transition-colors ${
                        semesterFilter !== 'ALL' ? 'bg-purple-200 text-purple-800' : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      Same Semester
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleQuickFilter('availableOnly')}
                      className={`px-3 py-1 rounded-full text-xs font-bold hover:bg-yellow-200 transition-colors ${
                        availabilityFilter === 'AVAILABLE' ? 'bg-yellow-200 text-yellow-800' : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      Available Only
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleQuickFilter('clearFilters')}
                      className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold hover:bg-gray-200 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                {/* Available Students */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Loading students...</p>
                    </div>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => {
                      const isInOtherGroup = student.groupMember && student.groupMember.group.id !== group?.id;
                      const groupStatus = student.groupMember?.group?.status;
                      const canAddMember = formData.members.length < 4;
                      
                      return (
                        <div key={student.id} className={`flex items-center justify-between p-3 rounded-xl border-2 ${
                          canAddMember ? 'bg-white border-gray-200 hover:border-blue-300' : 'bg-gray-100 border-gray-300'
                        }`}>
                          <div>
                            <h4 className="font-bold text-sm flex items-center gap-2">
                              {student.user.name}
                              {isInOtherGroup && (
                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                  groupStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                  groupStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  In {groupStatus} Group
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-gray-600">{student.enrollmentNo} | {student.class}-{student.division}</p>
                            {isInOtherGroup && (
                              <p className="text-xs text-blue-600">Current group: {student.groupMember.group.title}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddMember(student)}
                            disabled={!canAddMember}
                            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
                              canAddMember 
                                ? 'bg-green-500 text-white hover:bg-green-600' 
                                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            }`}
                            title={!canAddMember ? 'Maximum 4 members allowed in a group' : 'Add to group'}
                          >
                            <UserPlus className="w-3 h-3" />
                            {canAddMember ? 'Add' : 'Full'}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm font-semibold">
                        {searchTerm ? 'No students match your search' : 
                         formData.members.length >= 4 ? 'Group is full (4/4 members)' :
                         'No available students'}
                      </p>
                      {searchTerm && (
                        <p className="text-xs text-gray-400 mt-1">
                          Current members are excluded from search results
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 border-t-2 border-gray-300 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p className="font-semibold">Group: {group?.groupId} | Members: {formData.members.length}/4</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveLoading || !formData.title.trim() || !formData.description.trim() || formData.members.length === 0}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saveLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupEditModal;
