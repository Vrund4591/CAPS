import React, { useState } from 'react';

const LandingPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'STUDENT',
    // Student fields
    enrollmentNo: '',
    class: '',
    division: '',
    semester: '',
    phoneNumber: '',
    // Faculty fields
    department: 'IT'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(`http://localhost:5001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.message || 'An error occurred');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="text-center lg:text-left">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
            <h1 className="text-6xl font-black text-gray-900 mb-4">
              CAPS
            </h1>
            <p className="text-xl font-bold text-gray-700 mb-6">
              Collaborative Assignment and Project System
            </p>
            <div className="space-y-4">
              <div className="bg-blue-100 p-4 rounded-2xl border-3 border-blue-500">
                <h3 className="font-bold text-blue-800">🎯 Modern Project Management</h3>
                <p className="text-blue-700">Streamline your assignments with cutting-edge tools</p>
              </div>
              <div className="bg-purple-100 p-4 rounded-2xl border-3 border-purple-500">
                <h3 className="font-bold text-purple-800">👥 Team Collaboration</h3>
                <p className="text-purple-700">Work together seamlessly with your peers</p>
              </div>
              <div className="bg-green-100 p-4 rounded-2xl border-3 border-green-500">
                <h3 className="font-bold text-green-800">🏆 Achievements & Badges</h3>
                <p className="text-green-700">Earn recognition for your hard work</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-black">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-gray-900 mb-2">
              {isLogin ? 'Welcome Back!' : 'Join CAPS'}
            </h2>
            <p className="text-gray-600 font-semibold">
              {isLogin ? 'Sign in to your account' : 'Create your account'}
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border-3 border-red-500 text-red-700 p-4 rounded-2xl mb-6 font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                placeholder="your.email@college.edu"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                placeholder="Enter your password"
                required
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {formData.role === 'STUDENT' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Enrollment No.
                      </label>
                      <input
                        type="text"
                        name="enrollmentNo"
                        value={formData.enrollmentNo}
                        onChange={handleInputChange}
                        className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                        placeholder="2021001"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Class
                      </label>
                      <input
                        type="text"
                        name="class"
                        value={formData.class}
                        onChange={handleInputChange}
                        className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                        placeholder="BE-IT"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Division
                      </label>
                      <input
                        type="text"
                        name="division"
                        value={formData.division}
                        onChange={handleInputChange}
                        className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                        placeholder="A"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Semester
                      </label>
                      <select
                        name="semester"
                        value={formData.semester}
                        onChange={handleInputChange}
                        className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                        required
                      >
                        <option value="">Select Semester</option>
                        {[1,2,3,4,5,6,7,8].map(sem => (
                          <option key={sem} value={sem}>{sem}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                        placeholder="+91 9876543210"
                        required
                      />
                    </div>
                  </div>
                )}

                {formData.role === 'FACULTY' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Department
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none font-semibold"
                      required
                    >
                      <option value="IT">Information Technology</option>
                      <option value="CE">Computer Engineering</option>
                    </select>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-4 px-6 rounded-2xl border-3 border-black shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-800 font-bold underline"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
