import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, X, User, Mail, Phone, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

const LoginForm = ({ isOpen, onClose, onSwitchToSignup, onSwitchToForgotPassword }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState('id'); // 'id', 'email', 'phone'
  const { login, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm();

  const onSubmit = async (data) => {
    try {
      // Debug: Log the login data
      console.log('Login data being sent:', data);
      
      // Call useAuth login function
      await login({
        identifier: data.loginField, // Fix: use loginField from form
        password: data.password
      });
      
      console.log('Login successful!');
      onClose();
      reset();
    } catch (error) {
      console.error('Login error:', error);
      // Error handling is done in useAuth hook
    }
  };

  const getPlaceholder = () => {
    switch (loginType) {
      case 'email':
        return 'Enter your email';
      case 'phone':
        return 'Enter your phone number';
      default:
        return 'Enter your ID';
    }
  };

  const getIcon = () => {
    switch (loginType) {
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'phone':
        return <Phone className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const getValidationRules = () => {
    switch (loginType) {
      case 'email':
        return {
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address'
          }
        };
      case 'phone':
        return {
          required: 'Phone number is required',
          pattern: {
            value: /^[0-9]{10}$/,
            message: 'Phone number must be 10 digits'
          }
        };
      default:
        return {
          required: 'ID is required',
          minLength: {
            value: 3,
            message: 'ID must be at least 3 characters'
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
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md p-8 glass-card rounded-2xl shadow-glass animate-float"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-white text-opacity-80">Sign in to your account</p>
            </div>

            {/* Login Type Selector */}
            <div className="flex mb-6 p-1 bg-white bg-opacity-10 rounded-lg">
              {['id', 'email', 'phone'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLoginType(type)}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                    loginType === type
                      ? 'bg-white bg-opacity-20 text-white'
                      : 'text-white text-opacity-70 hover:text-white'
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Login Field */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white text-opacity-60">
                    {getIcon()}
                  </div>
                  <input
                    {...register('loginField', getValidationRules())}
                    type={loginType === 'email' ? 'email' : 'text'}
                    placeholder={getPlaceholder()}
                    className="w-full pl-10 pr-4 py-3 glass-input rounded-lg transition-all-smooth focus:scale-105"
                  />
                </div>
                {errors.loginField && (
                  <p className="mt-1 text-sm text-red-300">{errors.loginField.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white text-opacity-60">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
                      }
                    })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 glass-input rounded-lg transition-all-smooth focus:scale-105"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-white text-opacity-60 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-300">{errors.password.message}</p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={onSwitchToForgotPassword}
                  className="text-sm text-blue-300 hover:text-blue-200 transition-colors"
                >
                  Forgot your password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all-smooth hover-lift disabled:opacity-50 disabled:cursor-not-allowed animate-glow"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            {/* Switch to Signup */}
            <div className="mt-6 text-center">
              <p className="text-white text-opacity-80">
                Don't have an account?{' '}
                <button
                  onClick={onSwitchToSignup}
                  className="text-blue-300 hover:text-blue-200 font-medium transition-colors"
                >
                  Sign up
                </button>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginForm;