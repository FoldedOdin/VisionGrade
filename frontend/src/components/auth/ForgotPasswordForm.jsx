import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Phone, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ForgotPasswordForm = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [resetMethod, setResetMethod] = useState('email'); // 'email' or 'phone'
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // TODO: Implement API call to backend
      console.log('Password reset data:', { ...data, method: resetMethod });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsSuccess(true);
      toast.success(`Password reset link sent to your ${resetMethod}!`);
    } catch (error) {
      toast.error(error.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    reset();
    onClose();
  };

  const handleBackToLogin = () => {
    setIsSuccess(false);
    reset();
    onSwitchToLogin();
  };

  const getValidationRules = () => {
    if (resetMethod === 'email') {
      return {
        required: 'Email is required',
        pattern: {
          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
          message: 'Invalid email address'
        }
      };
    } else {
      return {
        required: 'Phone number is required',
        pattern: {
          value: /^[0-9]{10}$/,
          message: 'Phone number must be 10 digits'
        }
      };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md p-8 bg-white bg-opacity-10 backdrop-blur-lg border border-white border-opacity-20 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!isSuccess ? (
              <>
                {/* Header */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
                  <p className="text-white text-opacity-80">
                    Enter your {resetMethod} to receive a reset link
                  </p>
                </div>

                {/* Reset Method Selector */}
                <div className="flex mb-6 p-1 bg-white bg-opacity-10 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setResetMethod('email')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                      resetMethod === 'email'
                        ? 'bg-white bg-opacity-20 text-white'
                        : 'text-white text-opacity-70 hover:text-white'
                    }`}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetMethod('phone')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                      resetMethod === 'phone'
                        ? 'bg-white bg-opacity-20 text-white'
                        : 'text-white text-opacity-70 hover:text-white'
                    }`}
                  >
                    Phone
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Email/Phone Field */}
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white text-opacity-60">
                        {resetMethod === 'email' ? (
                          <Mail className="w-5 h-5" />
                        ) : (
                          <Phone className="w-5 h-5" />
                        )}
                      </div>
                      <input
                        {...register('contact', getValidationRules())}
                        type={resetMethod === 'email' ? 'email' : 'tel'}
                        placeholder={
                          resetMethod === 'email'
                            ? 'Enter your email address'
                            : 'Enter your phone number'
                        }
                        className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      />
                    </div>
                    {errors.contact && (
                      <p className="mt-1 text-sm text-red-300">{errors.contact.message}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                  </button>
                </form>

                {/* Back to Login */}
                <div className="mt-6 text-center">
                  <button
                    onClick={handleBackToLogin}
                    className="inline-flex items-center text-blue-300 hover:text-blue-200 font-medium transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </button>
                </div>
              </>
            ) : (
              /* Success State */
              <div className="text-center">
                <div className="mb-6">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-white mb-2">Check Your {resetMethod === 'email' ? 'Email' : 'Phone'}</h2>
                  <p className="text-white text-opacity-80">
                    We've sent a password reset link to your {resetMethod}.
                    Please check and follow the instructions to reset your password.
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleBackToLogin}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all"
                  >
                    Back to Sign In
                  </button>

                  <button
                    onClick={() => {
                      setIsSuccess(false);
                      reset();
                    }}
                    className="w-full py-3 px-4 bg-white bg-opacity-10 text-white font-semibold rounded-lg hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all"
                  >
                    Resend Link
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ForgotPasswordForm;