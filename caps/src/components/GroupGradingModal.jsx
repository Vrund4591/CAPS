import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Award, 
  Users,
  AlertCircle,
  Star,
  MessageSquare,
  CheckCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { apiUrl } from '../utils/api';

const GroupGradingModal = ({ isOpen, onClose, group, presentationSlot = 'PRESENTATION_1', onGradeSubmitted }) => {
  const [grades, setGrades] = useState([]);
  const [overallFeedback, setOverallFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [existingGrades, setExistingGrades] = useState(null);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && group) {
      fetchExistingGrades();
    }
  }, [isOpen, group, presentationSlot]);

  const fetchExistingGrades = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Fix endpoint to match backend API structure
      const response = await fetch(apiUrl(`/api/groups/${group?.groupId}/presentations`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Find grades for the current presentation slot
        const presentation = data.presentations?.find(p => p.slot === presentationSlot);
        if (presentation && presentation.grades) {
          const gradesMap = {};
          presentation.grades.forEach(grade => {
            gradesMap[grade.studentId] = {
              score: grade.score || 0,
              feedback: grade.feedback || ''
            };
          });
          setGrades(gradesMap);
        }
      } else if (response.status !== 404) {
        console.error('Failed to fetch existing grades:', response.status);
      }
    } catch (error) {
      console.error('Fetch grades error:', error);
    }
    setLoading(false);
  };

  const handleGradeChange = (studentId, field, value) => {
    if (field === 'grade') {
      // Validate grade range
      const numValue = parseInt(value);
      if (value !== '' && (isNaN(numValue) || numValue < 1 || numValue > 10)) {
        setErrors(prev => ({
          ...prev,
          [studentId]: 'Grade must be between 1 and 10'
        }));
        return;
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[studentId];
          return newErrors;
        });
      }
    }

    setGrades(prev => ({ 
      ...prev, 
      [studentId]: { 
        ...prev[studentId], 
        [field]: value 
      } 
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Check if overall feedback is provided
    if (!overallFeedback.trim()) {
      newErrors.overallFeedback = 'Overall group feedback is required';
      isValid = false;
    }

    // Check if all grades are provided and valid
    Object.keys(grades).forEach(studentId => {
      const grade = grades[studentId];
      if (!grade.score && grade.score !== 0) {
        newErrors[studentId] = 'Grade is required';
        isValid = false;
      } else {
        const numGrade = parseInt(grade.score);
        if (isNaN(numGrade) || numGrade < 1 || numGrade > 10) {
          newErrors[studentId] = 'Grade must be between 1 and 10';
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Validate grades with proper null checks
      const memberGrades = (group?.members || []).map(member => {
        // Fix: Add proper null checks for member structure
        const studentId = member?.student?.id || member?.studentId;
        const grade = grades[studentId] || { score: 0, feedback: '' };
        return {
          studentId,
          score: parseInt(grade.score) || 0,
          feedback: (grade.feedback || '').trim()
        };
      });

      // Check if all scores are valid
      const invalidScores = memberGrades.filter(g => g.score < 0 || g.score > 100);
      if (invalidScores.length > 0) {
        setError('All scores must be between 0 and 100');
        setSubmitLoading(false);
        return;
      }

      // Fix endpoint to match backend API structure
      const response = await fetch(apiUrl(`/api/groups/${group?.groupId}/grade`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          presentationSlot,
          grades: memberGrades
        })
      });

      // Improved error handling for HTML responses
      if (response.ok) {
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          // If not JSON, treat as success with default message
          result = { message: 'Grades submitted successfully' };
        }
        
        toast.success('Grades Submitted!', result.message || 'Grades have been successfully recorded');
        onGradeSubmitted();
        onClose();
      } else {
        // Handle non-JSON error responses
        let errorMessage = 'Failed to submit grades';
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } else {
          // If HTML error page, extract meaningful error
          const errorText = await response.text();
          if (response.status === 404) {
            errorMessage = 'Grading endpoint not found. Please contact administrator.';
          } else if (response.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          } else {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
        }
        
        setError(errorMessage);
        toast.error('Submission Failed', errorMessage);
      }
    } catch (error) {
      console.error('Submit grades error:', error);
      let errorMessage = 'Network error. Please check your connection and try again.';
      
      // Handle specific error types
      if (error.name === 'SyntaxError' && error.message.includes('Unexpected token')) {
        errorMessage = 'Server returned an unexpected response. The grading API may not be properly configured.';
      }
      
      setError(errorMessage);
      toast.error('Network Error', errorMessage);
    }
    setSubmitLoading(false);
  };

  const getPresentationTitle = (slot) => {
    switch (slot) {
      case 'PRESENTATION_1': return 'Presentation 1 - Project Proposal';
      case 'PRESENTATION_2': return 'Presentation 2 - Progress Review';
      case 'FINAL_PRESENTATION': return 'Final Presentation - Project Demo';
      default: return 'Presentation';
    }
  };

  const getGradeColor = (grade) => {
    const numGrade = parseInt(grade);
    if (numGrade >= 9) return 'text-green-600 bg-green-100';
    if (numGrade >= 7) return 'text-blue-600 bg-blue-100';
    if (numGrade >= 5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-black max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-yellow-50 p-6 border-b-3 border-yellow-500">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-600" />
                {existingGrades ? 'Update Grades' : 'Submit Grades'}
              </h2>
              <p className="text-yellow-700 font-semibold mt-1">
                {getPresentationTitle(presentationSlot)} - {group?.title}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Group ID: {group?.groupId} | Faculty: {group?.faculty?.user?.name}
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

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-250px)] overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 font-semibold">Loading grading data...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Student Grades */}
              <div className="bg-blue-50 p-6 rounded-2xl border-3 border-blue-500">
                <h3 className="text-lg font-black text-blue-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Individual Student Grades
                </h3>
                
                <div className="space-y-4">
                  {(group?.members || []).map((member) => {
                    // Fix: Add proper null checks for member structure
                    const studentId = member?.student?.id || member?.studentId;
                    const studentName = member?.student?.user?.name || member?.studentName || 'Unknown Student';
                    const enrollmentNo = member?.student?.enrollmentNo || member?.enrollmentNo || 'N/A';
                    const isLeader = member?.isLeader || false;
                    
                    return (
                      <div key={studentId} className="bg-white p-4 rounded-xl border-2 border-gray-300">
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="md:col-span-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-gray-900">{studentName}</h4>
                              {isLeader && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                                  Leader
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{enrollmentNo}</p>
                            
                            {/* Grade Input */}
                            <div className="mt-3">
                              <label className="block text-sm font-bold text-gray-700 mb-1">
                                Grade (1-10) *
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={grades[studentId]?.score || ''}
                                  onChange={(e) => handleGradeChange(studentId, 'score', e.target.value)}
                                  className={`w-20 p-2 border-2 rounded-xl focus:outline-none font-bold text-center ${
                                    errors[studentId] 
                                      ? 'border-red-500 focus:border-red-500' 
                                      : 'border-gray-300 focus:border-blue-500'
                                  } ${grades[studentId]?.score ? getGradeColor(grades[studentId]?.score) : ''}`}
                                  placeholder="1-10"
                                />
                                {grades[studentId]?.score && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-500" />
                                    <span className={`text-sm font-bold px-2 py-1 rounded-full ${getGradeColor(grades[studentId]?.score)}`}>
                                      {parseInt(grades[studentId]?.score) >= 9 ? 'Excellent' :
                                       parseInt(grades[studentId]?.score) >= 7 ? 'Good' :
                                       parseInt(grades[studentId]?.score) >= 5 ? 'Average' : 'Needs Improvement'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {errors[studentId] && (
                                <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {errors[studentId]}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                              Individual Feedback (Optional)
                            </label>
                            <textarea
                              value={grades[studentId]?.feedback || ''}
                              onChange={(e) => handleGradeChange(studentId, 'feedback', e.target.value)}
                              rows="3"
                              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold resize-none"
                              placeholder="Specific feedback for this student's contribution..."
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overall Group Feedback */}
              <div className="bg-green-50 p-6 rounded-2xl border-3 border-green-500">
                <h3 className="text-lg font-black text-green-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Overall Group Feedback *
                </h3>
                
                <textarea
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  rows="4"
                  className={`w-full p-4 border-2 rounded-xl focus:outline-none font-semibold resize-none ${
                    errors.overallFeedback 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:border-green-500'
                  }`}
                  placeholder="Provide comprehensive feedback on the group's overall performance, teamwork, presentation quality, project progress, etc..."
                  required
                />
                {errors.overallFeedback && (
                  <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.overallFeedback}
                  </p>
                )}
                
                <div className="mt-3 text-sm text-green-700">
                  <p className="font-semibold">💡 Feedback Guidelines:</p>
                  <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                    <li>Comment on presentation quality and content</li>
                    <li>Evaluate project progress and technical implementation</li>
                    <li>Assess teamwork and collaboration</li>
                    <li>Provide constructive suggestions for improvement</li>
                  </ul>
                </div>
              </div>

              {/* Grade Summary */}
              {(group?.members || []).some(member => {
                const studentId = member?.student?.id || member?.studentId;
                return grades[studentId]?.score;
              }) && (
                <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-300">
                  <h4 className="font-bold text-gray-900 mb-3">Grade Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <div className="text-2xl font-black text-blue-600">
                        {(group?.members || []).filter(member => {
                          const studentId = member?.student?.id || member?.studentId;
                          return grades[studentId]?.score;
                        }).length}
                      </div>
                      <div className="text-xs text-gray-600 font-bold">Graded</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <div className="text-2xl font-black text-green-600">
                        {(group?.members || []).filter(member => {
                          const studentId = member?.student?.id || member?.studentId;
                          return grades[studentId]?.score && parseInt(grades[studentId]?.score) >= 7;
                        }).length}
                      </div>
                      <div className="text-xs text-gray-600 font-bold">Good+ (7-10)</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <div className="text-2xl font-black text-purple-600">
                        {(() => {
                          const gradedMembers = (group?.members || []).filter(member => {
                            const studentId = member?.student?.id || member?.studentId;
                            return grades[studentId]?.score;
                          });
                          if (gradedMembers.length === 0) return '0.0';
                          const sum = gradedMembers.reduce((total, member) => {
                            const studentId = member?.student?.id || member?.studentId;
                            return total + (parseInt(grades[studentId]?.score) || 0);
                          }, 0);
                          return (sum / gradedMembers.length).toFixed(1);
                        })()}
                      </div>
                      <div className="text-xs text-gray-600 font-bold">Average</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <div className="text-2xl font-black text-orange-600">
                        {(group?.members || []).filter(member => {
                          const studentId = member?.student?.id || member?.studentId;
                          return (grades[studentId]?.feedback || '').trim();
                        }).length}
                      </div>
                      <div className="text-xs text-gray-600 font-bold">With Feedback</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-3 border-red-500 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-red-700 font-bold">{error}</p>
                      {error.includes('endpoint not found') && (
                        <p className="text-red-600 text-sm mt-1">
                          The grading system may not be fully set up yet. Please contact your system administrator.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitLoading || loading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      {existingGrades ? 'Updating...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {existingGrades ? 'Update Grades' : 'Submit Grades'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 border-t-2 border-gray-300 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p className="font-semibold">
              {existingGrades ? 'Update grades for' : 'Submit grades for'} {(group?.members || []).length} students
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Individual feedback is optional • Overall feedback is required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupGradingModal;
