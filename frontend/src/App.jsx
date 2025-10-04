import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import ErrorBoundary from './components/common/ErrorBoundary'
import AuthManager from './components/auth/AuthManager'
import DashboardLayout from './components/layout/DashboardLayout'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import SpaceBackground from './components/layout/SpaceBackground'
import LoadingSpinner from './components/common/LoadingSpinner'
import errorService from './services/errorService'
import { 
  LazyStudentDashboard, 
  LazyFacultyDashboard, 
  LazyAdminDashboard 
} from './utils/lazyLoading.jsx'
import './App.css'

// Lazy load dashboard demo
const DashboardDemo = React.lazy(() => import('./components/dashboard/DashboardDemo'))

// Setup global error handler
errorService.setGlobalErrorHandler((errorInfo, context) => {
  console.error('Global error handler:', errorInfo, context);
  
  // In production, you might want to send this to an error reporting service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to error reporting service
    // errorReportingService.captureException(errorInfo);
  }
  
  return errorService.getDefaultErrorMessage(errorInfo);
});

// Landing page component for unauthenticated users
const LandingPage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="text-center max-w-6xl mx-auto">
          <div className="mb-8 animate-slide-in-up">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-white to-blue-300 bg-clip-text text-transparent">
              VisionGrade
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
              Student Performance Analysis System
            </p>
            <p className="text-lg text-white/70 mb-12 max-w-3xl mx-auto">
              Empowering educational institutions with AI-driven insights, real-time performance tracking, 
              and comprehensive analytics for better academic outcomes.
            </p>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => window.authManager?.openSignup()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Get Started
            </button>
            <button
              onClick={() => window.authManager?.openLogin()}
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 backdrop-blur-sm border border-white/20"
            >
              Sign In
            </button>
          </div>

          {/* Feature Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-in-up items-stretch" style={{ animationDelay: '0.4s' }}>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300 flex flex-col h-full">
              <div className="w-16 h-16 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6 mx-auto flex-shrink-0">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4 text-center">Real-time Analytics</h3>
              <p className="text-white/70 text-center flex-grow">Track student performance with live dashboards and comprehensive insights</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300 flex flex-col h-full">
              <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center mb-6 mx-auto flex-shrink-0">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4 text-center">AI Predictions</h3>
              <p className="text-white/70 text-center flex-grow">Machine learning powered exam performance predictions and insights</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300 flex flex-col h-full">
              <div className="w-16 h-16 bg-green-500/20 rounded-lg flex items-center justify-center mb-6 mx-auto flex-shrink-0">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4 text-center">Responsive Design</h3>
              <p className="text-white/70 text-center flex-grow">Access from any device with a beautiful, responsive interface</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">Powerful Features</h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Everything you need to manage and analyze student performance effectively
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {[
              {
                title: "Student Dashboard",
                description: "Comprehensive view of marks, attendance, and predictions",
                icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              },
              {
                title: "Faculty Tools",
                description: "Easy marks entry, attendance tracking, and student insights",
                icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              },
              {
                title: "Admin Control",
                description: "Complete system management and user administration",
                icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              },
              {
                title: "Report Generation",
                description: "Automated PDF and DOC report cards with detailed analytics",
                icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              },
              {
                title: "Notification System",
                description: "Real-time alerts for attendance, performance, and announcements",
                icon: "M15 17h5l-5 5v-5zM4.868 12.354l6.747-6.747a2.5 2.5 0 013.536 0l2.829 2.829a2.5 2.5 0 010 3.536l-6.747 6.747a2.5 2.5 0 01-3.536 0l-2.829-2.829a2.5 2.5 0 010-3.536z"
              },
              {
                title: "Performance Tracking",
                description: "Advanced analytics and trend analysis for academic performance",
                icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 flex flex-col h-full">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/70 flex-grow">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">About VisionGrade</h2>
              <p className="text-lg text-white/70 mb-6">
                VisionGrade is a comprehensive student performance analysis system designed to revolutionize 
                how educational institutions track, analyze, and improve academic outcomes.
              </p>
              <p className="text-lg text-white/70 mb-8">
                Our platform combines cutting-edge machine learning algorithms with intuitive user interfaces 
                to provide actionable insights that help educators make data-driven decisions.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white">Real-time performance tracking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white">AI-powered predictions</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white">Comprehensive reporting</span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
              <h3 className="text-2xl font-semibold text-white mb-6 text-center">Key Statistics</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400 mb-2">500+</div>
                  <div className="text-white/70 text-sm">Students Supported</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-3xl font-bold text-purple-400 mb-2">95%</div>
                  <div className="text-white/70 text-sm">Prediction Accuracy</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-3xl font-bold text-green-400 mb-2">24/7</div>
                  <div className="text-white/70 text-sm">System Availability</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">50+</div>
                  <div className="text-white/70 text-sm">Institutions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Transform Education?</h2>
          <p className="text-xl text-white/70 mb-8">
            Join thousands of educators who are already using VisionGrade to improve student outcomes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.authManager?.openSignup()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Start Free Trial
            </button>
            <a
              href="/demo"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 backdrop-blur-sm border border-white/20"
            >
              View Demo
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <LoadingSpinner size="xlarge" text="Loading VisionGrade..." color="white" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
};

// Footer component that only shows on landing page
const AppFooter = () => {
  const { isAuthenticated } = useAuth();
  
  // Only show footer on landing page (when not authenticated)
  if (isAuthenticated) {
    return null;
  }
  
  return <Footer />;
};

// Main app content
const AppContent = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <LoadingSpinner size="xlarge" />
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LandingPage />
          )
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<LoadingSpinner size="large" text="Loading dashboard..." />}>
                {user?.role === 'student' && <LazyStudentDashboard />}
                {(user?.role === 'faculty' || user?.role === 'tutor') && <LazyFacultyDashboard />}
                {user?.role === 'admin' && <LazyAdminDashboard />}
                {!user?.role && (
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center glass-card p-8 rounded-2xl">
                      <h2 className="text-2xl font-bold mb-4 text-white">Invalid User Role</h2>
                      <p className="text-white text-opacity-80">
                        Please contact administrator
                      </p>
                    </div>
                  </div>
                )}
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/demo" 
        element={
          <Suspense fallback={<LoadingSpinner size="large" text="Loading demo..." />}>
            <DashboardDemo />
          </Suspense>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error to service
        errorService.logError(error, { component: 'App', errorInfo });
      }}
    >
      <ThemeProvider>
        <ErrorBoundary
          onError={(error, errorInfo) => {
            errorService.logError(error, { component: 'ThemeProvider', errorInfo });
          }}
        >
          <AuthProvider>
            <ErrorBoundary
              onError={(error, errorInfo) => {
                errorService.logError(error, { component: 'AuthProvider', errorInfo });
              }}
            >
              <Router>
                <div className="App min-h-screen relative">
                  {/* Space Background */}
                  <SpaceBackground />
                  
                  {/* Navigation */}
                  <Navbar />

                  {/* Toast Notifications */}
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(10px)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                      },
                      success: {
                        iconTheme: {
                          primary: '#10B981',
                          secondary: '#fff',
                        },
                      },
                      error: {
                        iconTheme: {
                          primary: '#EF4444',
                          secondary: '#fff',
                        },
                      },
                    }}
                  />

                  {/* Authentication Manager */}
                  <ErrorBoundary
                    onError={(error, errorInfo) => {
                      errorService.logError(error, { component: 'AuthManager', errorInfo });
                    }}
                  >
                    <AuthManager />
                  </ErrorBoundary>

                  {/* Main Content */}
                  <div className="relative z-10">
                    <ErrorBoundary
                      onError={(error, errorInfo) => {
                        errorService.logError(error, { component: 'AppContent', errorInfo });
                      }}
                    >
                      <AppContent />
                    </ErrorBoundary>
                    
                    {/* Footer - only show on landing page */}
                    <AppFooter />
                  </div>
                </div>
              </Router>
            </ErrorBoundary>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App