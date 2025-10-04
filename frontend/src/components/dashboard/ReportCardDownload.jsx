import React, { useState } from 'react';
import { DocumentArrowDownIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import studentService from '../../services/studentService';

const ReportCardDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('pdf');

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await studentService.downloadReportCard(selectedFormat);
      toast.success(`Report card downloaded successfully as ${selectedFormat.toUpperCase()}!`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(error.message || 'Failed to download report card');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-20">
      <div className="flex items-center mb-4">
        <DocumentArrowDownIcon className="h-6 w-6 text-green-400 mr-2" />
        <h2 className="text-xl font-semibold text-white">Report Card</h2>
      </div>

      <div className="space-y-4">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-white text-opacity-80 mb-2">
            Select Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedFormat('pdf')}
              className={`flex items-center justify-center p-3 rounded-lg border transition-all duration-200 ${
                selectedFormat === 'pdf'
                  ? 'border-red-400 bg-red-900 bg-opacity-30 text-red-300'
                  : 'border-white border-opacity-20 bg-white bg-opacity-5 text-white text-opacity-80 hover:bg-opacity-10'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              PDF
            </button>
            
            <button
              onClick={() => setSelectedFormat('doc')}
              className={`flex items-center justify-center p-3 rounded-lg border transition-all duration-200 ${
                selectedFormat === 'doc'
                  ? 'border-blue-400 bg-blue-900 bg-opacity-30 text-blue-300'
                  : 'border-white border-opacity-20 bg-white bg-opacity-5 text-white text-opacity-80 hover:bg-opacity-10'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              DOC
            </button>
          </div>
        </div>

        {/* Report Information */}
        <div className="bg-white bg-opacity-5 rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-2">Report Includes:</h3>
          <ul className="text-sm text-white text-opacity-70 space-y-1">
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
              Complete marks for all subjects
            </li>
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
              Attendance percentage by subject
            </li>
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
              Overall academic performance
            </li>
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
              Semester and academic year details
            </li>
          </ul>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className={`w-full flex items-center justify-center py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            isDownloading
              ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
          }`}
        >
          {isDownloading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Generating Report...
            </>
          ) : (
            <>
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Download Report Card ({selectedFormat.toUpperCase()})
            </>
          )}
        </button>

        {/* Additional Information */}
        <div className="text-xs text-white text-opacity-50 text-center">
          <p>Report cards are generated with current academic data.</p>
          <p>For official transcripts, contact the academic office.</p>
        </div>
      </div>
    </div>
  );
};

export default ReportCardDownload;