import React, { useState, useEffect } from 'react';
import facultyService from '../../services/facultyService';

const PredictionControls = ({ subject, userRole }) => {
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (subject && userRole === 'tutor') {
      loadPredictionData();
    }
  }, [subject, userRole]);

  const loadPredictionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load prediction data and accuracy stats
      const [predictionsResponse, accuracyResponse] = await Promise.all([
        facultyService.getSubjectPredictions(subject.id),
        facultyService.getPredictionAccuracy(subject.id)
      ]);

      if (predictionsResponse.success) {
        setPredictionData({
          predictions: predictionsResponse.predictions || [],
          subject: predictionsResponse.subject,
          is_visible: predictionsResponse.predictions?.[0]?.is_visible || false
        });
      }

      if (accuracyResponse.success) {
        setPredictionData(prev => ({
          ...prev,
          accuracy: accuracyResponse.ml_service_stats || accuracyResponse.database_stats
        }));
      }
    } catch (err) {
      console.error('Error loading prediction data:', err);
      setError('Failed to load prediction data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (isVisible) => {
    try {
      setUpdating(true);
      setError(null);

      const response = await facultyService.togglePredictionVisibility(subject.id, isVisible);
      
      if (response.success) {
        // Update local state
        setPredictionData(prev => ({
          ...prev,
          is_visible: isVisible,
          updated_predictions: response.data.updated_predictions
        }));

        // Show success message
        const message = isVisible 
          ? 'Predictions are now visible to students' 
          : 'Predictions are now hidden from students';
        
        // You could add a toast notification here
        console.log(message);
      }
    } catch (err) {
      console.error('Error toggling prediction visibility:', err);
      setError('Failed to update prediction visibility. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleGeneratePredictions = async () => {
    try {
      setUpdating(true);
      setError(null);

      const response = await facultyService.generateBatchPredictions(subject.id);
      
      if (response.success) {
        // Reload prediction data
        await loadPredictionData();
        console.log('Predictions generated successfully');
      }
    } catch (err) {
      console.error('Error generating predictions:', err);
      setError('Failed to generate predictions. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (userRole !== 'tutor') {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">ML prediction controls are only available for tutors.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={loadPredictionData}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              ML Prediction Controls
            </h3>
            <p className="text-sm text-gray-600">
              Manage ML predictions for {subject.subject_name}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              predictionData?.is_visible 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {predictionData?.is_visible ? 'Visible to Students' : 'Hidden from Students'}
            </span>
          </div>
        </div>

        {/* Visibility Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Student Visibility</h4>
            <p className="text-sm text-gray-600">
              Control whether students can see their predicted marks
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleToggleVisibility(false)}
              disabled={updating || !predictionData?.is_visible}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !predictionData?.is_visible
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-700'
              } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Hide
            </button>
            <button
              onClick={() => handleToggleVisibility(true)}
              disabled={updating || predictionData?.is_visible}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                predictionData?.is_visible
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'
              } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Show
            </button>
          </div>
        </div>
      </div>

      {/* Prediction Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Prediction Statistics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Predictions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {predictionData?.predictions?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Model Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {predictionData?.accuracy?.average_accuracy 
                    ? `${Math.round(predictionData.accuracy.average_accuracy)}%`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Confidence Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {predictionData?.predictions?.length > 0
                    ? `${Math.round(
                        predictionData.predictions.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / 
                        predictionData.predictions.length * 100
                      )}%`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Generate Predictions Button */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              Last updated: {predictionData?.predictions?.[0]?.created_at 
                ? new Date(predictionData.predictions[0].created_at).toLocaleDateString()
                : 'Never'
              }
            </p>
          </div>
          <button
            onClick={handleGeneratePredictions}
            disabled={updating}
            className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
              updating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {updating ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </div>
            ) : (
              'Generate New Predictions'
            )}
          </button>
        </div>
      </div>

      {/* Student Predictions List */}
      {predictionData?.predictions?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Student Predictions</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Predicted Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visibility
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {predictionData.predictions.map((prediction) => (
                  <tr key={prediction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {prediction.student.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {prediction.student.unique_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {Math.round(prediction.predicted_marks)}%
                      </div>
                      <div className={`text-xs ${
                        prediction.predicted_marks >= 50 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {prediction.predicted_marks >= 50 ? 'Pass' : 'At Risk'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {prediction.confidence_score 
                          ? `${Math.round(prediction.confidence_score * 100)}%`
                          : 'N/A'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        prediction.is_visible
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {prediction.is_visible ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(prediction.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Predictions Message */}
      {(!predictionData?.predictions || predictionData.predictions.length === 0) && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No predictions available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Generate predictions to see student performance forecasts.
            </p>
            <div className="mt-6">
              <button
                onClick={handleGeneratePredictions}
                disabled={updating}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Generate Predictions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionControls;