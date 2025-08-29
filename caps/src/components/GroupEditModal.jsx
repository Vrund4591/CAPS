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

const GroupEditModal = ({ isOpen, onClose, group, onGroupUpdated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectType: 'UDP',
    frontendTech: '',
    backendTech: '',
    status: 'PENDING'
  });
  const [availableStudents, setAvailableStudents] = useState([]);
  const [currentMembers, setCurrentMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && group) {
      // Initialize form data
      setFormData({
        title: group.title || '',
        description: group.description || '',
        projectType: group.projectType || 'UDP',
        frontendTech: group.frontendTech || '',
        backendTech: group.backendTech || '',
        status: group.status || 'PENDING'
      });
      
      // Initialize current members
      setCurrentMembers(group.members || []);
      
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
        setAvailableStudents(data.students);
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
    if (currentMembers.length >= 4) {
      setError('Maximum 4 members allowed in a group');
      return;
    }

    if (currentMembers.some(member => member.student.id === student.id)) {
      setError('Student is already a member of this group');
      return;
    }

    const newMember = {
      id: Date.now(), // Temporary ID for new members
      student: student,
      isLeader: currentMembers.length === 0, // First member becomes leader
      isNew: true // Flag to identify new members
    };

    setCurrentMembers([...currentMembers, newMember]);
    setError('');
  };

  const handleRemoveMember = (memberId) => {
    const memberToRemove = currentMembers.find(m => m.id === memberId);
    
    // Don't allow removing if it's the only member
    if (currentMembers.length === 1) {
      setError('Group must have at least one member');
      return;
    }

    const updatedMembers = currentMembers.filter(m => m.id !== memberId);
    
    // If removing the leader, make the first remaining member the leader
    if (memberToRemove?.isLeader && updatedMembers.length > 0) {
      updatedMembers[0].isLeader = true;
    }

    setCurrentMembers(updatedMembers);
    setError('');
  };

  const handleMakeLeader = (memberId) => {
    const updatedMembers = currentMembers.map(member => ({
      ...member,
      isLeader: member.id === memberId
    }));
    setCurrentMembers(updatedMembers);
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Prepare member data
      const memberData = currentMembers.map(member => ({
        studentId: member.student.id,
        isLeader: member.isLeader,
        isNew: member.isNew || false
      }));

      const updateData = {
        ...formData,
        members: memberData
      };

      const response = await fetch(`http://localhost:5001/api/groups/${group.groupId}/update-faculty`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedGroup = await response.json();
        onGroupUpdated(updatedGroup.group);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update group');
      }
    } catch (error) {
      console.error('Update group failed:', error);
      setError('Network error. Please try again.');
    }
    setSaveLoading(false);
  };

  const filteredStudents = availableStudents.filter(student => {
    // First filter by search term
    const matchesSearch = student.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.enrollmentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.division.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Then exclude students who are already members of this group
    const isAlreadyMember = currentMembers.some(member => member.student.id === student.id);
    
    // Also exclude students who are in other active groups (but allow those in pending/rejected groups)
    const isInOtherActiveGroup = student.groupMember && 
      student.groupMember.group.status === 'ACTIVE' && 
      student.groupMember.group.id !== group?.id;
    
    return matchesSearch && !isAlreadyMember && !isInOtherActiveGroup;
  });

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
                  Current Members ({currentMembers.length}/4)
                </h3>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {currentMembers.map((member) => (
                    <div key={member.id} className={`p-3 rounded-xl border-2 ${
                      member.isLeader ? 'bg-yellow-100 border-yellow-500' : 'bg-white border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm flex items-center gap-2">
                            {member.student.user.name}
                            {member.isLeader && <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">Leader</span>}
                            {member.isNew && <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">New</span>}
                          </h4>
                          <p className="text-xs text-gray-600">{member.student.enrollmentNo}</p>
                          <p className="text-xs text-gray-600">{member.student.class}-{member.student.division}</p>
                        </div>
                        <div className="flex space-x-1">
                          {!member.isLeader && (
                            <button
                              onClick={() => handleMakeLeader(member.id)}
                              className="text-xs bg-blue-500 text-white px-2 py-1 rounded font-bold hover:bg-blue-600"
                            >
                              Make Leader
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-xs bg-red-500 text-white px-2 py-1 rounded font-bold hover:bg-red-600"
                          >
                            <UserMinus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Members */}
              <div className="bg-gray-50 p-6 rounded-2xl border-3 border-gray-300">
                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Add New Members
                </h3>
                
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
                  />
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
                      
                      return (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300">
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
                            disabled={currentMembers.length >= 4}
                            className="bg-green-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <UserPlus className="w-3 h-3" />
                            Add
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm font-semibold">
                        {searchTerm ? 'No students match your search' : 
                         currentMembers.length >= 4 ? 'Group is full (4/4 members)' :
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
            <p className="font-semibold">Group: {group?.groupId} | Members: {currentMembers.length}/4</p>
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
              disabled={saveLoading || !formData.title.trim() || !formData.description.trim() || currentMembers.length === 0}
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
