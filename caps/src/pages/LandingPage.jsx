import React, { useState } from 'react';
import { Target, Users, Trophy, BookOpen, Coffee, Zap, Star, Code, Calendar, Award } from 'lucide-react';

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
      setError(`Network error: ${error.message}. Please try again.`);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen p-38" style={{backgroundColor: '#FFFFF4'}}>
      {/* Hero Section with College Vibes */}
      <div className="max-w-7xl mx-auto">
        
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Enhanced Branding */}
          <div className="text-center lg:text-left">
            <div className="flex flex-col justify-center bg-white p-8 rounded-3xl shadow-brutal border-4 border-black relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute top-4 right-4 w-16 h-16 bg-blue-200 rounded-full border-4 border-black"></div>
              <div className="absolute bottom-4 left-4 w-12 h-12 bg-purple-200 rounded-xl border-4 border-black"></div>
          
              <h1 className="text-7xl font-black text-gray-900 mb-4 leading-none">
                CAPS
              </h1>
              <div className="bg-yellow-300 inline-block px-6 py-2 rounded-xl border-3 border-black font-black text-black mb-6 shadow-brutal">
                COLLABORATIVE ASSIGNMENT & PROJECT SYSTEM
              </div>
              <div className="flex justify-center item-center ml-30 w-72 h-72 opacity-100">
                <img
                  src="/Designer-Desk-2--Streamline-Free-Illustrations.svg" 
                  alt="Designer Desk" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Right Side - Enhanced Auth Form */}
          <div className="bg-white p-8 rounded-3xl shadow-brutal border-4 border-black relative">
            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full border-3 border-black"></div>
            <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-pink-400 rounded-xl border-3 border-black"></div>
            
            {/* Smart People Illustration */}
            <div className="absolute bottom-0 left-0 w-40 h-40 opacity-10 transform -rotate-6">
              <img 
                src="/Smart-People-1--Streamline-Free-Illustrations.svg" 
                alt="Smart People" 
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="text-center mb-8 relative z-10">
              <div className="inline-block bg-gradient-to-r px-6 py-3 rounded-2xl border-4 border-black shadow-brutal mb-4">
                <h2 className="text-3xl font-black">
                  {isLogin ? 'WELCOME BACK!' : 'JOIN THE SQUAD'}
                </h2>
              </div>
              <p className="text-gray-800 font-bold text-lg">
                {isLogin ? 'Ready to crush some deadlines?' : 'Time to level up your college game!'}
              </p>
            </div>

            {error && (
              <div className="bg-red-400 border-4 border-black text-black p-4 rounded-2xl mb-6 font-black shadow-brutal">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-4 border-4 border-gray-800 rounded-2xl focus:border-blue-500 focus:outline-none font-bold bg-gray-50 shadow-brutal"
                  placeholder="your.email@college.edu"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-wide">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-4 border-4 border-gray-800 rounded-2xl focus:border-blue-500 focus:outline-none font-bold bg-gray-50 shadow-brutal"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-wide">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full p-4 border-4 border-gray-800 rounded-2xl focus:border-blue-500 focus:outline-none font-bold bg-gray-50 shadow-brutal"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-wide">
                      Role
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full p-4 border-4 border-gray-800 rounded-2xl focus:border-blue-500 focus:outline-none font-bold bg-gray-50 shadow-brutal"
                    >
                      <option value="STUDENT">Student</option>
                      <option value="FACULTY">Faculty</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  {formData.role === 'STUDENT' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-wide">
                          Enrollment No.
                        </label>
                        <input
                          type="text"
                          name="enrollmentNo"
                          value={formData.enrollmentNo}
                          onChange={handleInputChange}
                          className="w-full p-4 border-4 border-gray-800 rounded-2xl focus:border-blue-500 focus:outline-none font-bold bg-gray-50 shadow-brutal"
                          placeholder="2021001"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-wide">
                          Class
                        </label>
                        <input
                          type="text"
                          name="class"
                          value={formData.class}
                          onChange={handleInputChange}
                          className="w-full p-4 border-4 border-gray-800 rounded-2xl focus:border-blue-500 focus:outline-none font-bold bg-gray-50 shadow-brutal"
                          placeholder="BE-IT"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-wide">
                          Division
                        </label>
                        <input
                          type="text"
                          name="division"
                          value={formData.division}
                          onChange={handleInputChange}
                          className="w-full p-4 border-4 border-gray-800 rounded-2xl focus:border-blue-500 focus:outline-none font-bold bg-gray-50 shadow-brutal"
                          placeholder="A"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-wide">
                          Semester
                        </label>
                        <select
                          name="semester"
                          value={formData.semester}
                          onChange={handleInputChange}
                          className="w-full p-4 border-4 border-gray-800 rounded-2xl focus:border-blue-500 focus:outline-none font-bold bg-gray-50 shadow-brutal"
                          required
                        >
                          <option value="">Select Semester</option>
                          {[1,2,3,4,5,6,7,8].map(sem => (
                            <option key={sem} value={sem}>{sem}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-wide">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          className="w-full p-4 border-4 border-gray-800 rounded-2xl focus:border-blue-500 focus:outline-none font-bold bg-gray-50 shadow-brutal"
                          placeholder="+91 9876543210"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {formData.role === 'FACULTY' && (
                    <div>
                      <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-wide">
                        Department
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full p-4 border-4 border-gray-800 rounded-2xl focus:border-blue-500 focus:outline-none font-bold bg-gray-50 shadow-brutal"
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
                // inline-block bg-gradient-to-r from-purple-400 to-blue-500 px-6 py-3 rounded-2xl border-4 border-black shadow-brutal mb-4
                className="w-full bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-600 hover:to-purple-700 text-white font-black py-5 px-8 rounded-2xl border-4 border-black shadow-brutal hover:shadow-xl transform hover:-translate-y-2 transition-all duration-200 disabled:opacity-50 text-lg uppercase tracking-wide"
              >
                {loading ? 'PROCESSING...' : (isLogin ? ' SIGN IN' : 'CREATE ACCOUNT')}
              </button>
            </form>

            <div className="mt-8 text-center relative z-10">
              <div className="bg-gray-100 p-4 rounded-2xl border-3 border-gray-400 shadow-brutal">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-black hover:text-blue-800 font-black underline text-lg"
                >
                  {isLogin ? "New here? Create account!" : "Already have account? Sign in!"}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LandingPage;