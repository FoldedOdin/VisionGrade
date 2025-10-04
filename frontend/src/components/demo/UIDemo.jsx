import React, { useState } from 'react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import Card, { StatsCard, ActionCard } from '../common/Card';
import Button, { IconButton, FloatingActionButton } from '../common/Button';
import LoadingSpinner, { ProgressBar, SkeletonLoader } from '../common/LoadingSpinner';
import Modal, { ConfirmModal, AlertModal } from '../common/Modal';
import Toast from '../common/Toast';

const UIDemo = () => {
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [progress, setProgress] = useState(45);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <Card glass className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4 animate-glow">
              VisionGrade UI Demo
            </h1>
            <p className="text-white text-opacity-80 text-lg">
              Modern UI/UX enhancements showcase
            </p>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Students"
              value="1,234"
              icon="👥"
              trend="up"
              trendValue="+12%"
              className="animate-slide-in-up"
            />
            <StatsCard
              title="Average Score"
              value="85.6%"
              icon="📊"
              trend="up"
              trendValue="+3.2%"
              className="animate-slide-in-up"
              style={{ animationDelay: '0.1s' }}
            />
            <StatsCard
              title="Attendance"
              value="92.1%"
              icon="📅"
              trend="neutral"
              trendValue="Stable"
              className="animate-slide-in-up"
              style={{ animationDelay: '0.2s' }}
            />
            <StatsCard
              title="Predictions"
              value="456"
              icon="🔮"
              trend="up"
              trendValue="+8%"
              className="animate-slide-in-up"
              style={{ animationDelay: '0.3s' }}
            />
          </div>

          {/* Buttons Demo */}
          <Card glass>
            <h2 className="text-2xl font-bold text-white mb-6">Button Variants</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="primary" icon="🚀">Primary</Button>
              <Button variant="secondary" icon="⚙️">Secondary</Button>
              <Button variant="success" icon="✅">Success</Button>
              <Button variant="warning" icon="⚠️">Warning</Button>
              <Button variant="error" icon="❌">Error</Button>
              <Button variant="outline" icon="📝">Outline</Button>
              <Button variant="ghost" icon="👻">Ghost</Button>
              <Button variant="primary" glass icon="✨">Glass</Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-4">
              <Button size="small">Small</Button>
              <Button size="medium">Medium</Button>
              <Button size="large">Large</Button>
              <Button size="xlarge">X-Large</Button>
              <Button loading>Loading</Button>
              <IconButton icon="❤️" />
            </div>
          </Card>

          {/* Loading States */}
          <Card glass>
            <h2 className="text-2xl font-bold text-white mb-6">Loading States</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <h3 className="text-white mb-4">Spinner</h3>
                <LoadingSpinner size="large" text="Loading..." />
              </div>
              <div className="text-center">
                <h3 className="text-white mb-4">Dots</h3>
                <LoadingSpinner variant="dots" size="large" text="Processing..." />
              </div>
              <div className="text-center">
                <h3 className="text-white mb-4">Pulse</h3>
                <LoadingSpinner variant="pulse" size="large" text="Syncing..." />
              </div>
            </div>
            <div className="mt-8">
              <h3 className="text-white mb-4">Progress Bar</h3>
              <ProgressBar progress={progress} />
              <div className="flex gap-2 mt-4">
                <Button size="small" onClick={() => setProgress(Math.max(0, progress - 10))}>
                  -10%
                </Button>
                <Button size="small" onClick={() => setProgress(Math.min(100, progress + 10))}>
                  +10%
                </Button>
              </div>
            </div>
          </Card>

          {/* Skeleton Loaders */}
          <Card glass>
            <h2 className="text-2xl font-bold text-white mb-6">Skeleton Loaders</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-white mb-4">Text</h3>
                <SkeletonLoader lines={4} />
              </div>
              <div>
                <h3 className="text-white mb-4">Card</h3>
                <SkeletonLoader variant="card" />
              </div>
              <div>
                <h3 className="text-white mb-4">Avatar</h3>
                <SkeletonLoader variant="avatar" />
              </div>
            </div>
          </Card>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ActionCard
              title="Generate Report"
              description="Create a comprehensive performance report for all students"
              icon="📄"
              action={() => setShowModal(true)}
              actionText="Generate"
            />
            <ActionCard
              title="Send Notifications"
              description="Broadcast important announcements to students and faculty"
              icon="📢"
              action={() => setShowAlert(true)}
              actionText="Send"
            />
          </div>

          {/* Modal Triggers */}
          <Card glass>
            <h2 className="text-2xl font-bold text-white mb-6">Modals & Notifications</h2>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setShowModal(true)}>Show Modal</Button>
              <Button onClick={() => setShowConfirm(true)} variant="warning">
                Show Confirm
              </Button>
              <Button onClick={() => setShowAlert(true)} variant="error">
                Show Alert
              </Button>
              <Button onClick={() => setShowToast(true)} variant="success">
                Show Toast
              </Button>
            </div>
          </Card>

          {/* Floating Action Button */}
          <FloatingActionButton
            icon="+"
            onClick={() => alert('Floating action clicked!')}
          />

          {/* Modals */}
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title="Sample Modal"
            size="medium"
          >
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                This is a sample modal with glassmorphism styling and smooth animations.
              </p>
              <div className="flex justify-end space-x-3">
                <Button variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowModal(false)}>
                  Confirm
                </Button>
              </div>
            </div>
          </Modal>

          <ConfirmModal
            isOpen={showConfirm}
            onClose={() => setShowConfirm(false)}
            onConfirm={() => {
              setShowConfirm(false);
              alert('Confirmed!');
            }}
            title="Confirm Action"
            message="Are you sure you want to proceed with this action?"
            variant="warning"
          />

          <AlertModal
            isOpen={showAlert}
            onClose={() => setShowAlert(false)}
            title="Important Notice"
            message="This is an important alert message with modern styling."
            variant="error"
          />

          {/* Toast */}
          {showToast && (
            <Toast
              message="This is a success notification!"
              type="success"
              onClose={() => setShowToast(false)}
            />
          )}
        </div>
      </div>
    </ThemeProvider>
  );
};

export default UIDemo;