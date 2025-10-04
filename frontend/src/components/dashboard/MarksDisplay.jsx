import React from 'react';
import { BookOpenIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

const MarksDisplay = ({ marks = [], showSummary = false }) => {
  // Separate theory and lab subjects
  const theorySubjects = marks.filter(mark => mark.subject.subject_type === 'theory');
  const labSubjects = marks.filter(mark => mark.subject.subject_type === 'lab');

  // Calculate summary statistics
  const calculateSummary = (subjects, examType) => {
    const validMarks = subjects
      .map(subject => subject[examType])
      .filter(mark => mark !== null && mark !== undefined);
    
    if (validMarks.length === 0) return { average: 0, total: 0, count: 0 };
    
    const total = validMarks.reduce((sum, mark) => sum + mark, 0);
    const average = total / validMarks.length;
    
    return { average: average.toFixed(1), total, count: validMarks.length };
  };

  const getMarkColor = (mark, maxMark) => {
    if (mark === null || mark === undefined) return 'text-gray-400';
    const percentage = (mark / maxMark) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    if (percentage >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getMarkBackground = (mark, maxMark) => {
    if (mark === null || mark === undefined) return 'bg-gray-700';
    const percentage = (mark / maxMark) * 100;
    if (percentage >= 80) return 'bg-green-900 bg-opacity-30';
    if (percentage >= 60) return 'bg-yellow-900 bg-opacity-30';
    if (percentage >= 40) return 'bg-orange-900 bg-opacity-30';
    return 'bg-red-900 bg-opacity-30';
  };

  if (showSummary) {
    const st1Summary = calculateSummary(theorySubjects, 'series_test_1');
    const st2Summary = calculateSummary(theorySubjects, 'series_test_2');
    const labSummary = calculateSummary(labSubjects, 'lab_internal');

    return (
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-20">
        <div className="flex items-center mb-4">
          <AcademicCapIcon className="h-6 w-6 text-blue-400 mr-2" />
          <h2 className="text-xl font-semibold text-white">Marks Summary</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-900 bg-opacity-30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-300 mb-2">Series Test I</h3>
            <div className="text-2xl font-bold text-white">{st1Summary.average}</div>
            <div className="text-xs text-blue-200">Average out of 50</div>
            <div className="text-xs text-blue-200 mt-1">{st1Summary.count} subjects</div>
          </div>
          
          <div className="bg-purple-900 bg-opacity-30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-purple-300 mb-2">Series Test II</h3>
            <div className="text-2xl font-bold text-white">{st2Summary.average}</div>
            <div className="text-xs text-purple-200">Average out of 50</div>
            <div className="text-xs text-purple-200 mt-1">{st2Summary.count} subjects</div>
          </div>
          
          <div className="bg-green-900 bg-opacity-30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-300 mb-2">Lab Internal</h3>
            <div className="text-2xl font-bold text-white">{labSummary.average}</div>
            <div className="text-xs text-green-200">Average out of 100</div>
            <div className="text-xs text-green-200 mt-1">{labSummary.count} subjects</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-20">
      <div className="flex items-center mb-6">
        <BookOpenIcon className="h-6 w-6 text-blue-400 mr-2" />
        <h2 className="text-xl font-semibold text-white">Academic Performance</h2>
      </div>

      {/* Theory Subjects */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <span className="w-3 h-3 bg-blue-400 rounded-full mr-2"></span>
          Theory Subjects
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white border-opacity-20">
                <th className="text-left py-3 px-2 text-sm font-medium text-white text-opacity-80">Subject</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-white text-opacity-80">Series Test I</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-white text-opacity-80">Series Test II</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-white text-opacity-80">University</th>
              </tr>
            </thead>
            <tbody>
              {theorySubjects.map((mark) => (
                <tr key={mark.id} className="border-b border-white border-opacity-10 hover:bg-white hover:bg-opacity-5 transition-colors">
                  <td className="py-3 px-2">
                    <div>
                      <div className="text-white font-medium">{mark.subject.subject_name}</div>
                      <div className="text-white text-opacity-60 text-sm">{mark.subject.subject_code}</div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-8 rounded-md ${getMarkBackground(mark.series_test_1, 50)}`}>
                      <span className={`text-sm font-medium ${getMarkColor(mark.series_test_1, 50)}`}>
                        {mark.series_test_1 !== null ? `${mark.series_test_1}/50` : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-8 rounded-md ${getMarkBackground(mark.series_test_2, 50)}`}>
                      <span className={`text-sm font-medium ${getMarkColor(mark.series_test_2, 50)}`}>
                        {mark.series_test_2 !== null ? `${mark.series_test_2}/50` : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className={`inline-flex items-center justify-center w-20 h-8 rounded-md ${getMarkBackground(mark.university, 100)}`}>
                      <span className={`text-sm font-medium ${getMarkColor(mark.university, 100)}`}>
                        {mark.university !== null ? `${mark.university}/100` : 'Pending'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lab Subjects */}
      {labSubjects.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
            Lab Subjects
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white border-opacity-20">
                  <th className="text-left py-3 px-2 text-sm font-medium text-white text-opacity-80">Subject</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-white text-opacity-80">Lab Internal</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-white text-opacity-80">University</th>
                </tr>
              </thead>
              <tbody>
                {labSubjects.map((mark) => (
                  <tr key={mark.id} className="border-b border-white border-opacity-10 hover:bg-white hover:bg-opacity-5 transition-colors">
                    <td className="py-3 px-2">
                      <div>
                        <div className="text-white font-medium">{mark.subject.subject_name}</div>
                        <div className="text-white text-opacity-60 text-sm">{mark.subject.subject_code}</div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className={`inline-flex items-center justify-center w-20 h-8 rounded-md ${getMarkBackground(mark.lab_internal, 100)}`}>
                        <span className={`text-sm font-medium ${getMarkColor(mark.lab_internal, 100)}`}>
                          {mark.lab_internal !== null ? `${mark.lab_internal}/100` : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className={`inline-flex items-center justify-center w-20 h-8 rounded-md ${getMarkBackground(mark.university, 100)}`}>
                        <span className={`text-sm font-medium ${getMarkColor(mark.university, 100)}`}>
                          {mark.university !== null ? `${mark.university}/100` : 'Pending'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {marks.length === 0 && (
        <div className="text-center py-8">
          <AcademicCapIcon className="h-12 w-12 text-white text-opacity-40 mx-auto mb-4" />
          <p className="text-white text-opacity-60">No marks available yet</p>
          <p className="text-white text-opacity-40 text-sm">Marks will appear here once faculty enters them</p>
        </div>
      )}
    </div>
  );
};

export default MarksDisplay;