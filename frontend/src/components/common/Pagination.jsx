import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Button from './Button';

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  showInfo = true,
  showPageNumbers = true,
  maxPageNumbers = 5,
  className = '',
  size = 'medium'
}) => {
  // Calculate visible page numbers
  const getVisiblePages = () => {
    const pages = [];
    const halfRange = Math.floor(maxPageNumbers / 2);
    
    let startPage = Math.max(1, currentPage - halfRange);
    let endPage = Math.min(totalPages, currentPage + halfRange);
    
    // Adjust if we're near the beginning or end
    if (endPage - startPage + 1 < maxPageNumbers) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + maxPageNumbers - 1);
      } else if (endPage === totalPages) {
        startPage = Math.max(1, endPage - maxPageNumbers + 1);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const sizeClasses = {
    small: {
      button: 'px-2 py-1 text-sm',
      info: 'text-sm'
    },
    medium: {
      button: 'px-3 py-2 text-sm',
      info: 'text-sm'
    },
    large: {
      button: 'px-4 py-2 text-base',
      info: 'text-base'
    }
  };

  const currentSizeClasses = sizeClasses[size];

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Info */}
      {showInfo && (
        <div className={`text-gray-600 dark:text-gray-400 ${currentSizeClasses.info}`}>
          Showing {startItem} to {endItem} of {totalItems} results
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* Previous Button */}
        <Button
          variant="outline"
          size={size}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${currentSizeClasses.button} flex items-center gap-1`}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* First page + ellipsis */}
        {showPageNumbers && visiblePages[0] > 1 && (
          <>
            <Button
              variant={1 === currentPage ? 'primary' : 'outline'}
              size={size}
              onClick={() => onPageChange(1)}
              className={currentSizeClasses.button}
            >
              1
            </Button>
            {visiblePages[0] > 2 && (
              <span className="px-2 text-gray-500">...</span>
            )}
          </>
        )}

        {/* Page Numbers */}
        {showPageNumbers && visiblePages.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? 'primary' : 'outline'}
            size={size}
            onClick={() => onPageChange(page)}
            className={`${currentSizeClasses.button} min-w-[2.5rem] justify-center`}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </Button>
        ))}

        {/* Last page + ellipsis */}
        {showPageNumbers && visiblePages[visiblePages.length - 1] < totalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
              <span className="px-2 text-gray-500">...</span>
            )}
            <Button
              variant={totalPages === currentPage ? 'primary' : 'outline'}
              size={size}
              onClick={() => onPageChange(totalPages)}
              className={currentSizeClasses.button}
            >
              {totalPages}
            </Button>
          </>
        )}

        {/* Next Button */}
        <Button
          variant="outline"
          size={size}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${currentSizeClasses.button} flex items-center gap-1`}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRightIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Mobile-only page info */}
      <div className="sm:hidden text-sm text-gray-600 dark:text-gray-400">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
};

// Hook for pagination state management
export const usePagination = (initialPage = 1, initialItemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = React.useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = React.useState(initialItemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const reset = () => {
    setCurrentPage(1);
  };

  return {
    currentPage,
    itemsPerPage,
    handlePageChange,
    handleItemsPerPageChange,
    reset
  };
};

// Items per page selector component
export const ItemsPerPageSelector = ({
  itemsPerPage,
  onItemsPerPageChange,
  options = [10, 25, 50, 100],
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
      <select
        value={itemsPerPage}
        onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
        className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
    </div>
  );
};

export default Pagination;