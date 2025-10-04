import { lazy, Suspense } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * Higher-order component for lazy loading with custom loading component
 */
export const withLazyLoading = (importFunc, fallback = <LoadingSpinner />) => {
  const LazyComponent = lazy(importFunc);
  
  return (props) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

/**
 * Preload a lazy component
 */
export const preloadComponent = (importFunc) => {
  const componentImport = importFunc();
  return componentImport;
};

/**
 * Create a lazy component with retry functionality
 */
export const createLazyComponent = (importFunc, retries = 3) => {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      let attempt = 0;
      
      const tryImport = () => {
        attempt++;
        importFunc()
          .then(resolve)
          .catch((error) => {
            if (attempt < retries) {
              console.warn(`Failed to load component, retrying... (${attempt}/${retries})`);
              setTimeout(tryImport, 1000 * attempt); // Exponential backoff
            } else {
              console.error('Failed to load component after retries:', error);
              reject(error);
            }
          });
      };
      
      tryImport();
    });
  });
};

/**
 * Intersection Observer hook for lazy loading components when they come into view
 */
import { useState, useEffect, useRef } from 'react';

export const useLazyLoad = (ref, options = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [ref, options]);
  
  return isVisible;
};

/**
 * Component for lazy loading images
 */
export const LazyImage = ({ src, alt, className, placeholder, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef();
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={imgRef} className={className}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
          {...props}
        />
      )}
      {!isLoaded && placeholder && (
        <div className="animate-pulse bg-gray-200 rounded">
          {placeholder}
        </div>
      )}
    </div>
  );
};

/**
 * Route-based code splitting helper
 */
export const createLazyRoute = (importFunc) => {
  return createLazyComponent(importFunc);
};

// Pre-defined lazy components for common dashboard sections
export const LazyStudentDashboard = createLazyRoute(() => 
  import('../components/dashboard/StudentDashboard')
);

export const LazyFacultyDashboard = createLazyRoute(() => 
  import('../components/dashboard/FacultyDashboard')
);

export const LazyAdminDashboard = createLazyRoute(() => 
  import('../components/dashboard/AdminDashboard')
);

export const LazyMarksDisplay = createLazyComponent(() => 
  import('../components/dashboard/MarksDisplay')
);

export const LazyAttendanceVisualization = createLazyComponent(() => 
  import('../components/dashboard/AttendanceVisualization')
);

export const LazyGraphicalInsights = createLazyComponent(() => 
  import('../components/dashboard/GraphicalInsights')
);

export const LazyPredictedMarks = createLazyComponent(() => 
  import('../components/dashboard/PredictedMarks')
);

export const LazyNotificationCenter = createLazyComponent(() => 
  import('../components/dashboard/NotificationCenter')
);

export const LazyReportCardDownload = createLazyComponent(() => 
  import('../components/dashboard/ReportCardDownload')
);

export const LazyUserManagement = createLazyComponent(() => 
  import('../components/dashboard/admin/UserManagement')
);

export const LazySubjectManagement = createLazyComponent(() => 
  import('../components/dashboard/admin/SubjectManagement')
);

export const LazyStudentPromotion = createLazyComponent(() => 
  import('../components/dashboard/admin/StudentPromotion')
);

export const LazyPredictionControls = createLazyComponent(() => 
  import('../components/dashboard/PredictionControls')
);