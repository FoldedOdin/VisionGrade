import React, { useState } from 'react';
import { CpuChipIcon, EyeIcon, EyeSlashIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const PredictedMarks = ({ predictions, showDetails = false }) => {
  const [showHidden, setShowHidden] = useState(false);

  // Filter predictions based on visibility
  const visiblePredictions = predictions.filter(pred => pred.is_visible_to_student);
  const hiddenPredictions = predictions.filter(pred => !pred.is_visible_to_student);

  const getPredictionColor = (marks, confidence) => {
    if (marks >= 80) return 'text-green-400';
    if (marks >= 60) return 'text-blue-400';
    if (marks >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPredictionBackground = (marks, confidence) => {
    if (marks >= 80) return 'bg-green-900 bg-opacity-30';
    if (marks >= 60) return 'bg-blue-900 bg-opacity-30';
    if (marks >= 40) return 'bg-yellow-900 bg-opacity-30';
    return 'bg-red-900 bg-opacity-30';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.8) return 'text-blue-400';
    if (confidence >= 0.7) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  const calculateAveragePrediction = (preds) => {
    if (preds.length === 0) return 0;
    const total = preds.reduce((sum, pred) => sum + pred.predicted_marks, 0);
    return (total / preds.length).toFixed(1);
  };

  if (!showDetails && visiblePredictions.length === 0) {
    return (
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-20">
        <div className="flex items-center mb-4">
          <CpuChipIcon className="h-6 w-6 text-purple-400 mr-2" />
          <h2 className="text-xl font-semibold text-white">ML Predictions</h2>
        </div>
        
        <div className="text-center py-8">
          <EyeSlashIcon className="h-12 w-12 text-white text-opacity-40 mx-auto mb-4" />
          <p className="text-white text-opacity-60">No predictions available</p>
          <p className="text-white text-opacity-40 text-sm">Faculty will enable predictions when ready</p>
        </div>
      </div>
    );
  }

  if (!showDetails) {
    // Summary view for overview tab
    return (
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-20">
        <div className="flex items-center mb-4">
          <CpuChipIcon className="h-6 w-6 text-purple-400 mr-2" />
          <h2 className="text-xl font-semibold text-white">ML Predictions</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-purple-900 bg-opacity-30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-purple-300 mb-2">Average Prediction</h3>
            <div className="text-3xl font-bold text-white">{calculateAveragePrediction(visiblePredictions)}</div>
            <div className="text-xs text-purple-200">Out of 100</div>
          </div>
          
          <div className="bg-indigo-900 bg-opacity-30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-indigo-300 mb-2">Subjects Available</h3>
            <div className="text-3xl font-bold text-white">{visiblePredictions.length}</div>
            <div className="text-xs text-indigo-200">Predictions enabled</div>
          </div>
        </div>

        <div className="space-y-2">
          {visiblePredictions.slice(0, 3).map((pred) => (
            <div key={pred.id} className="flex items-center justify-between bg-white bg-opacity-5 rounded-lg p-3">
              <span className="text-white text-sm">{pred.subject.subject_name}</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${getPredictionColor(pred.predicted_marks, pred.confidence_score)}`}>
                  {pred.predicted_marks.toFixed(1)}
                </span>
                <div className={`w-2 h-2 rounded-full ${getConfidenceColor(pred.confidence_score).replace('text-', 'bg-')}`}></div>
              </div>
            </div>
          ))}
          {visiblePredictions.length > 3 && (
            <div className="text-center text-white text-opacity-60 text-sm">
              +{visiblePredictions.length - 3} more subjects
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <CpuChipIcon className="h-6 w-6 text-purple-400 mr-2" />
          <h2 className="text-xl font-semibold text-white">ML University Exam Predictions</h2>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{calculateAveragePrediction(visiblePredictions)}</div>
          <div className="text-xs text-white text-opacity-60">Average</div>
        </div>
      </div>

      {/* Information Banner */}
      <div className="bg-blue-900 bg-opacity-20 border border-blue-400 border-opacity-30 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-300 mb-1">About ML Predictions</h3>
            <p className="text-xs text-blue-200">
              These predictions are generated using machine learning algorithms based on your Series Test and Lab Internal marks. 
              Predictions are subject-specific and may vary in accuracy. Use them as guidance for your preparation.
            </p>
          </div>
        </div>
      </div>

      {/* Visible Predictions */}
      {visiblePredictions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <EyeIcon className="h-5 w-5 text-green-400 mr-2" />
            Available Predictions
          </h3>
          
          <div className="space-y-4">
            {visiblePredictions.map((pred) => (
              <div key={pred.id} className="bg-white bg-opacity-5 rounded-lg p-4 hover:bg-opacity-10 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-white font-medium">{pred.subject.subject_name}</h4>
                    <p className="text-white text-opacity-60 text-sm">{pred.subject.subject_code}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getPredictionColor(pred.predicted_marks, pred.confidence_score)}`}>
                      {pred.predicted_marks.toFixed(1)}
                    </div>
                    <div className="text-xs text-white text-opacity-60">out of 100</div>
                  </div>
                </div>
                
                {/* Confidence Score */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xs text-white text-opacity-60 mr-2">Confidence:</span>
                    <div className="flex items-center">
                      <div className="w-16 bg-white bg-opacity-20 rounded-full h-1.5 mr-2">
                        <div 
                          className={`h-1.5 rounded-full ${getConfidenceColor(pred.confidence_score).replace('text-', 'bg-')}`}
                          style={{ width: `${pred.confidence_score * 100}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${getConfidenceColor(pred.confidence_score)}`}>
                        {getConfidenceLabel(pred.confidence_score)} ({(pred.confidence_score * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                  
                  {/* Grade Prediction */}
                  <div className="text-xs">
                    <span className="text-white text-opacity-60">Grade: </span>
                    <span className={`font-medium ${getPredictionColor(pred.predicted_marks, pred.confidence_score)}`}>
                      {pred.predicted_marks >= 80 ? 'A' : 
                       pred.predicted_marks >= 60 ? 'B' : 
                       pred.predicted_marks >= 40 ? 'C' : 'F'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden Predictions */}
      {hiddenPredictions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white flex items-center">
              <EyeSlashIcon className="h-5 w-5 text-gray-400 mr-2" />
              Hidden Predictions ({hiddenPredictions.length})
            </h3>
            <button
              onClick={() => setShowHidden(!showHidden)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {showHidden ? 'Hide' : 'Show'} Hidden
            </button>
          </div>
          
          {showHidden && (
            <div className="space-y-3">
              {hiddenPredictions.map((pred) => (
                <div key={pred.id} className="bg-gray-900 bg-opacity-30 rounded-lg p-4 border border-gray-600 border-opacity-30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-gray-300 font-medium">{pred.subject.subject_name}</h4>
                      <p className="text-gray-400 text-sm">{pred.subject.subject_code}</p>
                    </div>
                    <div className="text-gray-400 text-sm">
                      Prediction hidden by faculty
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {predictions.length === 0 && (
        <div className="text-center py-8">
          <CpuChipIcon className="h-12 w-12 text-white text-opacity-40 mx-auto mb-4" />
          <p className="text-white text-opacity-60">No predictions available</p>
          <p className="text-white text-opacity-40 text-sm">Predictions will be generated once sufficient data is available</p>
        </div>
      )}

      {/* Disclaimer */}
      {visiblePredictions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white border-opacity-20">
          <p className="text-xs text-white text-opacity-50 text-center">
            * Predictions are estimates based on current performance and may not reflect actual exam results. 
            Continue studying and attending classes regularly for best outcomes.
          </p>
        </div>
      )}
    </div>
  );
};

export default PredictedMarks;