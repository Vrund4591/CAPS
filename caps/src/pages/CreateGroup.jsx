import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

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
      setError('Failed to load data');
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
        setSuccess('Group created successfully! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/student-dashboard');
        }, 2000);
      } else {
        setError(data.message || 'Failed to create group');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Header user={user} onLogout={onLogout} />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black mb-8">
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              🚀 Create New Group
            </h1>
            <p className="text-xl text-gray-600 font-semibold">
              Start your collaborative journey by forming a project team
            </p>
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
                <h2 className="text-2xl font-black text-blue-900 mb-6">📋 Basic Information</h2>
                
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
                      <option value="UDP">UDP - University Defined Project</option>
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
                <h2 className="text-2xl font-black text-purple-900 mb-6">💻 Technology Stack</h2>
                
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
                <h2 className="text-2xl font-black text-green-900 mb-6">👥 Team Members</h2>
                <p className="text-green-700 font-semibold mb-6">
                  Select up to 3 additional team members (You will be the team leader by default)
                </p>
                
                {availableStudents.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableStudents.map((student) => (
                      <div
                        key={student.id}
                        className={`p-4 rounded-2xl border-3 cursor-pointer transition-all duration-200 ${
                          formData.teamMemberIds.includes(student.id)
                            ? 'bg-green-200 border-green-600'
                            : 'bg-white border-gray-300 hover:border-green-500'
                        }`}
                        onClick={() => handleTeamMemberToggle(student.id)}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.teamMemberIds.includes(student.id)}
                            onChange={() => handleTeamMemberToggle(student.id)}
                            className="mr-3 w-5 h-5"
                          />
                          <div>
                            <h3 className="font-bold text-gray-900">{student.user.name}</h3>
                            <p className="text-sm text-gray-600">{student.enrollmentNo}</p>
                            <p className="text-sm text-gray-600">{student.class} - {student.division}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-4">👤</div>
                    <p className="font-semibold">No available students found</p>
                    <p className="text-sm">All students may already be in groups</p>
                  </div>
                )}

                <div className="mt-4 text-sm text-green-700 font-semibold">
                  Selected: {formData.teamMemberIds.length}/3 members
                </div>
              </div>

              {/* Submit Button */}
              <div className="text-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-black py-4 px-8 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
                >
                  {loading ? 'Creating Group...' : '🚀 Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroup;
