import React, { useState } from 'react';
import { Bell, Send, AlertCircle, CheckCircle } from 'lucide-react';
import adminService from '../../../services/adminService';

const SystemAnnouncements = () => {
  const [formData, setFormData] = useState({
    title: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      setError('Both title and message are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await adminService.createSystemAnnouncement(
        formData.title.trim(),
        formData.message.trim()
      );

      setSuccess(response.message);
      setFormData({ title: '', message: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear messages when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const announcementTemplates = [
    {
      title: 'System Maintenance',
      message: 'The system will be under maintenance on [DATE] from [TIME] to [TIME]. Please save your work and log out before the maintenance window.'
    },
    {
      title: 'New Feature Announcement',
      message: 'We are excited to announce a new feature: [FEATURE_NAME]. This feature allows you to [DESCRIPTION]. Please check it out and let us know your feedback.'
    },
    {
      title: 'Academic Calendar Update',
      message: 'Important update regarding the academic calendar: [DETAILS]. Please review the changes and plan accordingly.'
    },
    {
      title: 'Exam Schedule Released',
      message: 'The examination schedule for [SEMESTER/YEAR] has been released. Please check your dashboard for detailed timings and venues.'
    }
  ];

  const useTemplate = (template) => {
    setFormData({
      title: template.title,
      message: template.message
    });
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Bell className="h-8 w-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Announcements</h2>
          <p className="text-gray-600">Send important notifications to all users</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Announcement Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Announcement</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter announcement title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={255}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {formData.title.length}/255 characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Announcement Message *
                </label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  placeholder="Enter your announcement message here..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                  maxLength={2000}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {formData.message.length}/2000 characters
                </div>
              </div>

              {/* Success Message */}
              {success && (
                <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-green-700">{success}</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {/* Preview */}
              {(formData.title || formData.message) && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-start space-x-3">
                      <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">
                          {formData.title || 'Announcement Title'}
                        </h5>
                        <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                          {formData.message || 'Announcement message will appear here...'}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          System • Just now
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ title: '', message: '' });
                    setError(null);
                    setSuccess(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.title.trim() || !formData.message.trim()}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  <span>{loading ? 'Sending...' : 'Send Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Templates Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Templates</h3>
            <p className="text-sm text-gray-600 mb-4">
              Click on a template to use it as a starting point for your announcement.
            </p>
            
            <div className="space-y-3">
              {announcementTemplates.map((template, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => useTemplate(template)}
                >
                  <h4 className="font-medium text-gray-900 text-sm mb-1">
                    {template.title}
                  </h4>
                  <p className="text-xs text-gray-600 line-clamp-3">
                    {template.message}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Important Note:</p>
                  <p>
                    System announcements will be sent to all users immediately. 
                    Please review your message carefully before sending.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemAnnouncements;