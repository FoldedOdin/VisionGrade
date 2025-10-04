import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, X, User, Mail, Phone, Lock, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

const SignupForm = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signup, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm();

  const password = watch('password');
  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    try {
      // Debug: Log the form data
      console.log('Form data being sent:', data);
      
      // Call useAuth signup function
      await signup({
        email: data.email,
        phone: data.phone,
        password: data.password,
        confirmPassword: data.confirmPassword,
        role: data.role,
        studentName: data.studentName,
        facultyName: data.facultyName,
        semester: data.semester ? parseInt(data.semester) : undefined,
        batchYear: data.batchYear ? parseInt(data.batchYear) : undefined,
        department: data.department,
        isTutor: data.isTutor,
        tutorSemester: data.tutorSemester ? parseInt(data.tutorSemester) : undefined
      });
      
      console.log('Signup successful!');
      onSwitchToLogin();
      reset();
    } catch (error) {
      console.error('Signup error:', error);
      // Error handling is done in useAuth hook
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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md p-8 bg-white bg-opacity-10 backdrop-blur-lg border border-white border-opacity-20 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
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
              <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
              <p className="text-white text-opacity-80">Join VisionGrade today</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">


              {/* Email */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white text-opacity-60">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    type="email"
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-300">{errors.email.message}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white text-opacity-60">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^[0-9]{10}$/,
                        message: 'Phone number must be 10 digits'
                      }
                    })}
                    type="tel"
                    placeholder="Enter your phone number"
                    className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-300">{errors.phone.message}</p>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white text-opacity-60">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <select
                    {...register('role', {
                      required: 'Please select your role'
                    })}
                    className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all appearance-none"
                  >
                    <option value="" className="bg-gray-800">Select your role</option>
                    <option value="student" className="bg-gray-800">Student</option>
                    <option value="faculty" className="bg-gray-800">Faculty</option>
                  </select>
                </div>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-300">{errors.role.message}</p>
                )}
              </div>

              {/* Student-specific fields */}
              {selectedRole === 'student' && (
                <>
                  {/* Student Name */}
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white text-opacity-60">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        {...register('studentName', {
                          required: selectedRole === 'student' ? 'Student name is required' : false,
                          minLength: {
                            value: 2,
                            message: 'Name must be at least 2 characters'
                          }
                        })}
                        type="text"
                        placeholder="Enter your full name"
                        className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      />
                    </div>
                    {errors.studentName && (
                      <p className="mt-1 text-sm text-red-300">{errors.studentName.message}</p>
                    )}
                  </div>

                  {/* Semester */}
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white text-opacity-60">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <select
                        {...register('semester', {
                          required: selectedRole === 'student' ? 'Semester is required' : false
                        })}
                        className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all appearance-none"
                      >
                        <option value="" className="bg-gray-800">Select semester</option>
                        <option value="1" className="bg-gray-800">1st Semester</option>
                        <option value="2" className="bg-gray-800">2nd Semester</option>
                        <option value="3" className="bg-gray-800">3rd Semester</option>
                        <option value="4" className="bg-gray-800">4th Semester</option>
                        <option value="5" className="bg-gray-800">5th Semester</option>
                        <option value="6" className="bg-gray-800">6th Semester</option>
                        <option value="7" className="bg-gray-800">7th Semester</option>
                        <option value="8" className="bg-gray-800">8th Semester</option>
                      </select>
                    </div>
                    {errors.semester && (
                      <p className="mt-1 text-sm text-red-300">{errors.semester.message}</p>
                    )}
                  </div>

                  {/* Batch Year */}
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white text-opacity-60">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <select
                        {...register('batchYear', {
                          required: selectedRole === 'student' ? 'Batch year is required' : false
                        })}
                        className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all appearance-none"
                      >
                        <option value="" className="bg-gray-800">Select batch year</option>
                        <option value="2020" className="bg-gray-800">2020</option>
                        <option value="2021" className="bg-gray-800">2021</option>
                        <option value="2022" className="bg-gray-800">2022</option>
                        <option value="2023" className="bg-gray-800">2023</option>
                        <option value="2024" className="bg-gray-800">2024</option>
                        <option value="2025" className="bg-gray-800">2025</option>
                        <option value="2026" className="bg-gray-800">2026</option>
                        <option value="2027" className="bg-gray-800">2027</option>
                        <option value="2028" className="bg-gray-800">2028</option>
                      </select>
                    </div>
                    {errors.batchYear && (
                      <p className="mt-1 text-sm text-red-300">{errors.batchYear.message}</p>
                    )}
                  </div>
                </>
              )}

              {/* Faculty-specific fields */}
              {(selectedRole === 'faculty' || selectedRole === 'admin') && (
                <>
                  {/* Faculty Name */}
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white text-opacity-60">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        {...register('facultyName', {
                          required: (selectedRole === 'faculty' || selectedRole === 'admin') ? 'Faculty name is required' : false,
                          minLength: {
                            value: 2,
                            message: 'Name must be at least 2 characters'
                          }
                        })}
                        type="text"
                        placeholder="Enter your full name"
                        className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      />
                    </div>
                    {errors.facultyName && (
                      <p className="mt-1 text-sm text-red-300">{errors.facultyName.message}</p>
                    )}
                  </div>

                  {/* Department */}
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white text-opacity-60">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <input
                        {...register('department')}
                        type="text"
                        placeholder="Department (optional)"
                        className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      />
                    </div>
                    {errors.department && (
                      <p className="mt-1 text-sm text-red-300">{errors.department.message}</p>
                    )}
                  </div>
                </>
              )}

              {/* Password */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white text-opacity-60">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters'
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                        message: 'Password must contain uppercase, lowercase, number and special character'
                      }
                    })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    className="w-full pl-10 pr-12 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
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

              {/* Confirm Password */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white text-opacity-60">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: value =>
                        value === password || 'Passwords do not match'
                    })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    className="w-full pl-10 pr-12 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-white text-opacity-60 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-300">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Switch to Login */}
            <div className="mt-6 text-center">
              <p className="text-white text-opacity-80">
                Already have an account?{' '}
                <button
                  onClick={onSwitchToLogin}
                  className="text-blue-300 hover:text-blue-200 font-medium transition-colors"
                >
                  Sign in
                </button>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SignupForm;