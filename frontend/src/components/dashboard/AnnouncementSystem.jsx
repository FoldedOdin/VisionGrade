import React, { useState, useEffect } from 'react';
import facultyService from '../../services/facultyService';

const AnnouncementSystem = ({ subject }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    if (subject) {
      loadSubjectStudents();
    }
  }, [subject]);

  const loadSubjectStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await facultyService.getSubjectStudents(subject.id);
      if (response.success) {
        setStudents(response.data.students);
      }
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      setError('Please enter both title and message for the announcement.');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const response = await facultyService.sendSubjectAnnouncement(
        subject.id,
        title.trim(),
        message.trim()
      );

      if (response.success) {
        setSuccess(`Announcement sent successfully to ${students.length} students!`);
        setTitle('');
        setMessage('');
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      console.error('Error sending announcement:', err);
      setError(err.response?.data?.error?.message || 'Failed to send announcement. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const predefinedMessages = [
    {
      title: 'Class Schedule Update',
      message: 'Please note that our next class has been rescheduled. Check your timetable for the updated schedule.'
    },
    {
      title: 'Assignment Reminder',
      message: 'This is a reminder that your assignment is due soon. Please submit it on time to avoid late penalties.'
    },
    {
      title: 'Exam Notification',
      message: 'Your upcoming exam is scheduled. Please prepare well and bring all necessary materials.'
    },
    {
      title: 'Lab Session Important',
      message: 'Important instructions for the upcoming lab session. Please read the lab manual before attending.'
    },
    {
      title: 'Attendance Alert',
      message: 'Your attendance is below the required threshold. Please ensure regular attendance to meet academic requirements.'
    }
  ];

  const handlePredefinedMessage = (predefined) => {
    setTitle(predefined.title);
    setMessage(predefined.message);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Send Announcement - {subject.subject_name}
        </h3>
        <p className="text-sm text-gray-500">
          Send announcements to all students enrolled in {subject.subject_code}
        </p>
      </div>

      {/* Student Count */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              {loadingStudents ? (
                'Loading student count...'
              ) : (
                `This announcement will be sent to ${students.length} enrolled students`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Predefined Messages */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Quick Templates</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {predefinedMessages.map((predefined, index) => (
            <button
              key={index}
              onClick={() => handlePredefinedMessage(predefined)}
              className="text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium text-sm text-gray-900 mb-1">
                {predefined.title}
              </div>
              <div className="text-xs text-gray-500 line-clamp-2">
                {predefined.message}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Announcement Form */}
      <form onSubmit={handleSendAnnouncement} className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-4">
          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Announcement Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter announcement title..."
              maxLength={255}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {title.length}/255 characters
            </p>
          </div>

          {/* Message Input */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your announcement message..."
              maxLength={1000}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {message.length}/1000 characters
            </p>
          </div>

          {/* Preview */}
          {(title || message) && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Preview:</h5>
              <div className="bg-white border border-gray-200 rounded-md p-3">
                {title && (
                  <div className="font-medium text-gray-900 mb-2">{title}</div>
                )}
                {message && (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{message}</div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  From: Faculty - {subject.subject_name} ({subject.subject_code})
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending || !title.trim() || !message.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {sending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Announcement
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Students List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">
          Recipients ({students.length} students)
        </h4>
        {loadingStudents ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading students...</p>
          </div>
        ) : students.length > 0 ? (
          <div className="max-h-60 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {students.map((studentData) => (
                <div key={studentData.student.id} className="flex items-center p-2 bg-gray-50 rounded-md">
                  <div className="flex-shrink-0 h-8 w-8">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">
                        {studentData.student.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {studentData.student.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {studentData.student.user.unique_id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <p className="text-sm text-gray-500 mt-2">No students enrolled in this subject</p>
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Announcement Guidelines
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Keep announcements clear and concise</li>
                <li>Include important dates and deadlines</li>
                <li>Use professional language appropriate for academic communication</li>
                <li>Double-check all information before sending</li>
                <li>Announcements will be sent immediately to all enrolled students</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementSystem;