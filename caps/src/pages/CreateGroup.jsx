import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, 
  Clipboard, 
  Monitor, 
  Users, 
  User,
  Plus
} from 'lucide-react';
import Header from '../components/Header';

const CreateGroup = ({ user, onLogout }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    facultyId: '',
    projectType: 'UDP',
    frontendTech: '',
    backendTech: '',
    teamMemberIds: []
  });
  const [faculty, setFaculty] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [originalGroup, setOriginalGroup] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    
    // Check if editing an existing group
    const urlParams = new URLSearchParams(window.location.search);
    const editGroupId = urlParams.get('edit');
    if (editGroupId) {
      setIsEditing(true);
      fetchGroupForEditing(editGroupId);
    }
  }, []);

  const fetchGroupForEditing = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/groups/my-group', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const group = data.group;
        
        if (group.groupId === groupId && group.status === 'REJECTED') {
          setOriginalGroup(group);
          
          // Get the current team member IDs (excluding leader)
          const currentMemberIds = group.members
            .filter(member => !member.isLeader)
            .map(member => member.student.id);
          
          setFormData({
            title: group.title,
            description: group.description,
            facultyId: group.facultyId,
            projectType: group.projectType,
            frontendTech: group.frontendTech || '',
            backendTech: group.backendTech || '',
            teamMemberIds: currentMemberIds
          });
          
          // Fetch all students including the ones in the rejected group
          await fetchAllStudentsForEditing(currentMemberIds);
        } else {
          setError('Group not found or cannot be edited');
          navigate('/student-dashboard');
        }
      }
    } catch (error) {
      setError('Failed to load group data: ' + error.message);
    }
  };

  const fetchAllStudentsForEditing = async (currentMemberIds) => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch available students
      const studentsResponse = await fetch('http://localhost:5001/api/groups/available-students', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch students from the rejected group
      const rejectedGroupResponse = await fetch('http://localhost:5001/api/groups/rejected-group-members', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ memberIds: currentMemberIds })
      });
      
      let allAvailableStudents = [];
      let rejectedGroupMembers = [];
      
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        allAvailableStudents = studentsData.students.filter(student => student.id !== user.profile.id);
      }
      
      if (rejectedGroupResponse.ok) {
        const rejectedData = await rejectedGroupResponse.json();
        rejectedGroupMembers = rejectedData.students || [];
      }
      
      // Combine available students with rejected group members, removing duplicates
      const combinedStudents = [...allAvailableStudents];
      rejectedGroupMembers.forEach(rejectedMember => {
        if (!combinedStudents.find(student => student.id === rejectedMember.id)) {
          combinedStudents.push(rejectedMember);
        }
      });
      
      setAvailableStudents(combinedStudents);
      
    } catch (error) {
      console.error('Error fetching students for editing:', error);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch faculty
      const facultyResponse = await fetch('http://localhost:5001/api/users/faculty', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (facultyResponse.ok) {
        const facultyData = await facultyResponse.json();
        setFaculty(facultyData.faculty);
      }

      // Fetch available students
      const studentsResponse = await fetch('http://localhost:5001/api/groups/available-students', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setAvailableStudents(studentsData.students.filter(student => student.id !== user.profile.id));
      }

    } catch (error) {
      setError('Failed to load data: ' + error.message);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleTeamMemberToggle = (studentId) => {
    setFormData(prevData => ({
      ...prevData,
      teamMemberIds: prevData.teamMemberIds.includes(studentId)
        ? prevData.teamMemberIds.filter(id => id !== studentId)
        : [...prevData.teamMemberIds, studentId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isEditing) {
      setShowConfirmDialog(true);
      return;
    }
    
    await createGroup();
  };

  const createGroup = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.teamMemberIds.length > 3) {
      setError('Maximum 4 members allowed (including you as team leader)');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // If editing, first delete the old group
      if (isEditing && originalGroup) {
        await fetch(`http://localhost:5001/api/groups/${originalGroup.groupId}/delete`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      
      const response = await fetch('http://localhost:5001/api/groups/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(isEditing ? 'Group recreated successfully! Redirecting to dashboard...' : 'Group created successfully! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/student-dashboard');
        }, 2000);
      } else {
        setError(data.message || 'Failed to create group');
      }
    } catch (error) {
      setError(`Network error: ${error.message}. Please try again.`);
    }

    setLoading(false);
    setShowConfirmDialog(false);
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: '#FFFFF4'}}>
      <Header user={user} onLogout={onLogout} />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-screen mx-auto">
          {/* Header */}
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black mb-8">
            <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
              <Rocket className="w-10 h-10 text-blue-500" />
              {isEditing ? 'Recreate Group' : 'Create New Group'}
            </h1>
            <p className="text-xl text-gray-600 font-semibold">
              {isEditing ? 'Improve your project based on faculty feedback and resubmit' : 'Start your collaborative journey by forming a project team'}
            </p>
            
            {isEditing && originalGroup && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-2xl border-2 border-yellow-400">
                <h3 className="font-bold text-yellow-800 mb-2">Previous Rejection Reason:</h3>
                <p className="text-yellow-700 text-sm whitespace-pre-line">{originalGroup.rejectionReason}</p>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
            {error && (
              <div className="bg-red-100 border-3 border-red-500 text-red-700 p-4 rounded-2xl mb-6 font-bold">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 border-3 border-green-500 text-green-700 p-4 rounded-2xl mb-6 font-bold">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="bg-blue-50 p-6 rounded-2xl border-3 border-blue-500">
                <h2 className="text-2xl font-black text-blue-900 mb-6 flex items-center gap-2">
                  <Clipboard className="w-6 h-6 text-blue-600" />
                  Basic Information
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Group Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                      placeholder="Enter your project title"
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
                      className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                      required
                    >
                      <option value="UDP">UDP - User Defined Project</option>
                      <option value="IDP">IDP - Industry Defined Project</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Project Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                    placeholder="Describe your project idea and goals..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Faculty Supervisor *
                  </label>
                  <select
                    name="facultyId"
                    value={formData.facultyId}
                    onChange={handleInputChange}
                    className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                    required
                  >
                    <option value="">Select Faculty</option>
                    {faculty.map((fac) => (
                      <option key={fac.id} value={fac.id}>
                        {fac.user.name} ({fac.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Technology Stack */}
              <div className="bg-purple-50 p-6 rounded-2xl border-3 border-purple-500">
                <h2 className="text-2xl font-black text-purple-900 mb-6 flex items-center gap-2">
                  <Monitor className="w-6 h-6 text-purple-600" />
                  Technology Stack
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Frontend Technologies
                    </label>
                    <input
                      type="text"
                      name="frontendTech"
                      value={formData.frontendTech}
                      onChange={handleInputChange}
                      className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-purple-500 focus:outline-none font-semibold"
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
                      className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-purple-500 focus:outline-none font-semibold"
                      placeholder="Node.js, Python, Java, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="bg-green-50 p-6 rounded-2xl border-3 border-green-500">
                <h2 className="text-2xl font-black text-green-900 mb-6 flex items-center gap-2">
                  <Users className="w-6 h-6 text-green-600" />
                  Team Members
                </h2>
                <p className="text-green-700 font-semibold mb-6">
                  Select up to 3 additional team members (You will be the team leader by default)
                  {isEditing && (
                    <span className="block text-sm mt-1 text-green-600">
                      Previously selected members are shown below. You can add or remove members as needed.
                    </span>
                  )}
                </p>
                
                {availableStudents.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableStudents.map((student) => {
                      const isSelected = formData.teamMemberIds.includes(student.id);
                      const wasPreviouslySelected = isEditing && originalGroup && 
                        originalGroup.members.some(member => 
                          member.student.id === student.id && !member.isLeader
                        );
                      
                      return (
                        <div
                          key={student.id}
                          className={`p-4 rounded-2xl border-3 cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'bg-green-200 border-green-600'
                              : wasPreviouslySelected
                              ? 'bg-yellow-100 border-yellow-500 hover:border-green-500'
                              : 'bg-white border-gray-300 hover:border-green-500'
                          }`}
                          onClick={() => handleTeamMemberToggle(student.id)}
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTeamMemberToggle(student.id)}
                              className="mr-3 w-5 h-5"
                            />
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                {student.user.name}
                                {wasPreviouslySelected && !isSelected && (
                                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-bold">
                                    Was Member
                                  </span>
                                )}
                                {isSelected && wasPreviouslySelected && (
                                  <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-bold">
                                    Current
                                  </span>
                                )}
                              </h3>
                              <p className="text-sm text-gray-600">{student.enrollmentNo}</p>
                              <p className="text-sm text-gray-600">{student.class} - {student.division}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-4 flex justify-center">
                      <User className="w-12 h-12" />
                    </div>
                    <p className="font-semibold">No available students found</p>
                    <p className="text-sm">All students may already be in groups</p>
                  </div>
                )}

                <div className="mt-4 text-sm text-green-700 font-semibold">
                  Selected: {formData.teamMemberIds.length}/3 members
                  {isEditing && originalGroup && (
                    <div className="mt-2 text-xs">
                      <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded mr-2">
                        Yellow: Previously selected members
                      </span>
                      <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded">
                        Green: Currently selected
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="text-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-black py-4 px-8 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:transform-none flex items-center gap-2 justify-center"
                >
                  <Rocket className="w-5 h-5" />
                  {loading ? (isEditing ? 'Recreating Group...' : 'Creating Group...') : (isEditing ? 'Recreate Group' : 'Create Group')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black max-w-md w-full mx-4">
            <h3 className="text-2xl font-black text-gray-900 mb-4">Confirm Group Recreation</h3>
            <p className="text-gray-600 mb-6 font-semibold">
              This will delete your current rejected group and create a new one with the updated information. All previous group data will be lost.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-2xl border-3 border-black transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-2xl border-3 border-black transition-all duration-200"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateGroup;
