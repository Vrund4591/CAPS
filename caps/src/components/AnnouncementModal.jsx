import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Users, 
  CheckCircle, 
  Search,
  Send,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const AnnouncementModal = ({ isOpen, onClose, groups, user }) => {
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewEmails, setPreviewEmails] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setSelectedGroups(new Set());
      setSearchTerm('');
      setEmailSubject('');
      setEmailBody('');
      setPreviewEmails([]);
    }
  }, [isOpen]);

  useEffect(() => {
    // Update preview emails when groups are selected
    if (selectedGroups.size > 0) {
      fetchEmailPreview();
    } else {
      setPreviewEmails([]);
    }
  }, [selectedGroups]);

  const fetchEmailPreview = async () => {
    if (selectedGroups.size === 0) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/groups/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          groupIds: Array.from(selectedGroups)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewEmails(data.emails);
      }
    } catch (error) {
      console.error('Error fetching email preview:', error);
    }
    setLoading(false);
  };

  const filteredGroups = groups.filter(group => 
    group.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.groupId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.teamLeader.user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGroupToggle = (groupId) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filteredGroups.map(g => g.id)));
    }
  };

  const handleSendEmail = () => {
    if (previewEmails.length === 0) {
      toast.warning('No Recipients', 'Please select at least one group');
      return;
    }

    if (!emailSubject.trim()) {
      toast.warning('Missing Subject', 'Please enter an email subject');
      return;
    }

    // Prepare email content
    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(
      `${emailBody}\n\n` +
      `---\n` +
      `Best regards,\n` +
      `Prof. ${user.name}\n` +
      `${user.faculty?.department || ''} Department`
    );
    
    // Create mailto link with all email addresses
    const emailList = previewEmails.join(',');
    const mailtoLink = `mailto:${emailList}?subject=${subject}&body=${body}`;
    
    // Open default email client
    window.location.href = mailtoLink;
    
    toast.success('Email Client Opened', `Announcement ready to send to ${previewEmails.length} students`);
    
    // Close modal after opening email client
    onClose();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-500';
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-500';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-500';
      default: return 'bg-gray-100 text-gray-800 border-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-black max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-purple-50 p-6 border-b-3 border-purple-500">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <Mail className="w-6 h-6 text-purple-600" />
                Send Announcement
              </h2>
              <p className="text-purple-700 font-semibold mt-1">
                Select groups and compose your announcement email
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

        <div className="grid lg:grid-cols-2 gap-6 p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Group Selection */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Select Groups ({selectedGroups.size}/{filteredGroups.length})
              </h3>
              <button
                onClick={handleSelectAll}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-xl text-sm transition-colors"
              >
                {selectedGroups.size === filteredGroups.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-semibold"
              />
            </div>

            {/* Groups List */}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedGroups.has(group.id)
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-gray-50 border-gray-300 hover:border-blue-300'
                  }`}
                  onClick={() => handleGroupToggle(group.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedGroups.has(group.id)}
                        onChange={() => handleGroupToggle(group.id)}
                        className="w-4 h-4"
                      />
                      <div>
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                          {group.title}
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(group.status)}`}>
                            {group.status}
                          </span>
                        </h4>
                        <p className="text-sm text-gray-600">
                          {group.groupId} • Leader: {group.teamLeader.user.name} • {group.members.length} members
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredGroups.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2" />
                <p className="font-semibold">No groups found</p>
              </div>
            )}
          </div>

          {/* Email Composition */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-green-500" />
              Compose Email
            </h3>

            {/* Email Preview */}
            {previewEmails.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-2xl border-2 border-blue-300">
                <h4 className="font-bold text-blue-800 text-sm mb-2">
                  Recipients ({previewEmails.length} students):
                </h4>
                <div className="text-xs text-blue-700 max-h-20 overflow-y-auto">
                  {previewEmails.join(', ')}
                </div>
              </div>
            )}

            {/* Subject */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Subject *
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none font-semibold"
                required
              />
            </div>

            {/* Body */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Compose your announcement message..."
                rows="8"
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none font-semibold resize-none"
              />
            </div>

            {/* Instructions */}
            <div className="mb-4 p-3 bg-yellow-50 rounded-2xl border-2 border-yellow-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
                <div className="text-yellow-800 text-sm">
                  <p className="font-bold mb-1">How it works:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Select the groups you want to send the announcement to</li>
                    <li>• Compose your subject and message</li>
                    <li>• Click "Send Email" to open your default email client</li>
                    <li>• All selected group members will be added to the "To" field</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 border-t-2 border-gray-300 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedGroups.size > 0 && previewEmails.length > 0 && (
              <span className="font-semibold">
                Ready to send to {previewEmails.length} student{previewEmails.length !== 1 ? 's' : ''} 
                from {selectedGroups.size} group{selectedGroups.size !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-2xl border-2 border-black transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEmail}
              disabled={selectedGroups.size === 0 || !emailSubject.trim() || loading}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-2xl border-3 border-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {loading ? 'Loading...' : 'Send Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;
