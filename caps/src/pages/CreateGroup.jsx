import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, 
  Clipboard, 
  Monitor, 
  Users, 
  User,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  X // Added missing X import
} from 'lucide-react';
import Header from '../components/Header';

// Memoized Search Bar component to prevent unnecessary re-renders
const SearchBar = React.memo(({ 
  searchTerm, 
  onSearchChange, 
  onClearSearch 
}) => {
  return (
    <div className="mb-6">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={onSearchChange}
          className="w-full pl-10 pr-10 py-3 border-3 border-gray-300 rounded-2xl focus:border-green-500 focus:outline-none font-semibold"
          placeholder="Search students by name, enrollment number, class, or division..."
        />
        {searchTerm && (
          <button
            type="button"
            onClick={onClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

// Memoized Search Results Info component
const SearchResultsInfo = React.memo(({ 
  searchTerm, 
  resultsCount 
}) => {
  if (!searchTerm) return null;

  return (
    <div className="mb-4 text-sm text-gray-600 font-semibold">
      {resultsCount > 0 ? (
        `Found ${resultsCount} student${resultsCount !== 1 ? 's' : ''} matching "${searchTerm}"`
      ) : (
        `No students found matching "${searchTerm}"`
      )}
    </div>
  );
});

SearchResultsInfo.displayName = 'SearchResultsInfo';

// Memoized Pagination Info component
const PaginationInfo = React.memo(({ 
  startIndex, 
  endIndex, 
  totalStudents 
}) => {
  if (totalStudents === 0) return null;

  return (
    <div className="mb-4 text-sm text-gray-600 font-semibold">
      Showing {startIndex}-{endIndex} of {totalStudents} students
    </div>
  );
});

PaginationInfo.displayName = 'PaginationInfo';

// Memoized Empty State component
const EmptyState = React.memo(({ 
  hasSearchTerm, 
  onClearSearch 
}) => {
  return (
    <div className="text-center py-12 text-gray-500">
      <div className="text-4xl mb-4 flex justify-center">
        <User className="w-12 h-12" />
      </div>
      <p className="font-semibold">
        {hasSearchTerm ? 'No students match your search' : 'No students available'}
      </p>
      {hasSearchTerm && (
        <button
          type="button"
          onClick={onClearSearch}
          className="mt-2 text-blue-500 hover:text-blue-700 font-bold underline"
        >
          Clear search to see all students
        </button>
      )}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

// Memoized Students Grid component
const StudentsGrid = React.memo(({ 
  students, 
  formData, 
  isEditing, 
  originalGroup, 
  onToggle 
}) => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[400px]">
      {students.map((student) => {
        const isSelected = formData.teamMemberIds.includes(student.id);
        const wasPreviouslySelected = isEditing && originalGroup && 
          originalGroup.members.some(member => 
            member.student.id === student.id && !member.isLeader
          );
        
        return (
          <StudentCard
            key={student.id}
            student={student}
            isSelected={isSelected}
            wasPreviouslySelected={wasPreviouslySelected}
            onToggle={onToggle}
          />
        );
      })}
    </div>
  );
});

StudentsGrid.displayName = 'StudentsGrid';

// Memoized StudentCard component for better performance
const StudentCard = React.memo(({ 
  student, 
  isSelected, 
  wasPreviouslySelected, 
  onToggle 
}) => {
  return (
    <div
      className={`p-4 rounded-2xl border-3 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-green-200 border-green-600'
          : wasPreviouslySelected
          ? 'bg-yellow-100 border-yellow-500 hover:border-green-500'
          : 'bg-white border-gray-300 hover:border-green-500'
      }`}
      onClick={() => onToggle(student.id)}
    >
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(student.id)}
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
});

StudentCard.displayName = 'StudentCard';

// Memoized Pagination component
const Pagination = React.memo(({ 
  currentPage, 
  totalPages, 
  onPageChange 
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center space-x-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-xl border-2 border-gray-400 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      
      <div className="flex space-x-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-2 rounded-xl border-2 font-bold text-sm transition-colors ${
              currentPage === page
                ? 'bg-blue-500 border-blue-600 text-white'
                : 'bg-white border-gray-400 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ))}
      </div>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-xl border-2 border-gray-400 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
});

Pagination.displayName = 'Pagination';

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
  
  // Search and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(9); // 3x3 grid per page
  
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

  // Optimized search change handler with debouncing
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleTeamMemberToggle = useCallback((studentId) => {
    setFormData(prevData => ({
      ...prevData,
      teamMemberIds: prevData.teamMemberIds.includes(studentId)
        ? prevData.teamMemberIds.filter(id => id !== studentId)
        : [...prevData.teamMemberIds, studentId]
    }));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

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

  // Memoized filtered students with more specific dependencies
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return availableStudents;
    
    const searchLower = searchTerm.toLowerCase();
    return availableStudents.filter(student => 
      student.user.name.toLowerCase().includes(searchLower) ||
      student.enrollmentNo.toLowerCase().includes(searchLower) ||
      student.class.toLowerCase().includes(searchLower) ||
      student.division.toLowerCase().includes(searchLower)
    );
  }, [availableStudents, searchTerm]);

  // Memoized paginated students
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage, studentsPerPage]);

  // Memoized pagination info
  const paginationInfo = useMemo(() => ({
    totalStudents: filteredStudents.length,
    totalPages: Math.ceil(filteredStudents.length / studentsPerPage),
    startIndex: (currentPage - 1) * studentsPerPage + 1,
    endIndex: Math.min(currentPage * studentsPerPage, filteredStudents.length)
  }), [filteredStudents.length, currentPage, studentsPerPage]);

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
                  <>
                    {/* Optimized Search Bar */}
                    <SearchBar
                      searchTerm={searchTerm}
                      onSearchChange={handleSearchChange}
                      onClearSearch={clearSearch}
                    />

                    {/* Optimized Search Results Info */}
                    <SearchResultsInfo
                      searchTerm={searchTerm}
                      resultsCount={filteredStudents.length}
                    />

                    {/* Optimized Pagination Info */}
                    <PaginationInfo
                      startIndex={paginationInfo.startIndex}
                      endIndex={paginationInfo.endIndex}
                      totalStudents={paginationInfo.totalStudents}
                    />

                    {/* Students Grid or Empty State */}
                    {paginatedStudents.length > 0 ? (
                      <StudentsGrid
                        students={paginatedStudents}
                        formData={formData}
                        isEditing={isEditing}
                        originalGroup={originalGroup}
                        onToggle={handleTeamMemberToggle}
                      />
                    ) : (
                      <EmptyState
                        hasSearchTerm={!!searchTerm}
                        onClearSearch={clearSearch}
                      />
                    )}

                    {/* Pagination */}
                    <Pagination
                      currentPage={currentPage}
                      totalPages={paginationInfo.totalPages}
                      onPageChange={handlePageChange}
                    />
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-4 flex justify-center">
                      <User className="w-12 h-12" />
                    </div>
                    <p className="font-semibold">No available students found</p>
                    <p className="text-sm">All students may already be in groups</p>
                  </div>
                )}

                <div className="mt-6 text-sm text-green-700 font-semibold">
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

                {/* Quick Selection Actions */}
                {formData.teamMemberIds.length > 0 && (
                  <div className="mt-4 flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, teamMemberIds: [] }))}
                      className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold hover:bg-red-200 transition-colors"
                    >
                      Clear All Selections
                    </button>
                  </div>
                )}
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

export default React.memo(CreateGroup);
