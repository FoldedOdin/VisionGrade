import React, { useState, useEffect, useMemo } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import Pagination, { usePagination, ItemsPerPageSelector } from './Pagination';
import LoadingSpinner from './LoadingSpinner';
import Button from './Button';

const PaginatedTable = ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  searchable = true,
  filterable = false,
  sortable = true,
  initialItemsPerPage = 10,
  onRowClick = null,
  onRefresh = null,
  className = '',
  emptyMessage = 'No data available',
  searchPlaceholder = 'Search...',
  filters = [],
  onFilterChange = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [activeFilters, setActiveFilters] = useState({});
  
  const {
    currentPage,
    itemsPerPage,
    handlePageChange,
    handleItemsPerPageChange,
    reset: resetPagination
  } = usePagination(1, initialItemsPerPage);

  // Reset pagination when data changes
  useEffect(() => {
    resetPagination();
  }, [data, searchTerm, activeFilters, resetPagination]);

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchTerm && searchable) {
      filtered = filtered.filter(item =>
        columns.some(column => {
          const value = column.accessor ? item[column.accessor] : '';
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        filtered = filtered.filter(item => {
          const itemValue = item[key];
          return String(itemValue).toLowerCase() === String(value).toLowerCase();
        });
      }
    });

    return filtered;
  }, [data, searchTerm, activeFilters, columns, searchable]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Handle sorting
  const handleSort = (key) => {
    if (!sortable) return;
    
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle filter change
  const handleFilterChange = (filterKey, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
    
    if (onFilterChange) {
      onFilterChange({ ...activeFilters, [filterKey]: value });
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
    if (onFilterChange) {
      onFilterChange({});
    }
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 dark:text-red-400 mb-4">
          Error loading data: {error.message || error}
        </div>
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline">
            Try Again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
          {/* Search */}
          {searchable && (
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Filters */}
          {filterable && filters.length > 0 && (
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-gray-400" />
              {filters.map((filter) => (
                <select
                  key={filter.key}
                  value={activeFilters[filter.key] || 'all'}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">{filter.label}</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ))}
              {Object.keys(activeFilters).length > 0 && (
                <Button
                  variant="outline"
                  size="small"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Items per page */}
        <ItemsPerPageSelector
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                      sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : ''
                    }`}
                    onClick={() => column.sortable !== false && handleSort(column.accessor || column.key)}
                  >
                    <div className="flex items-center gap-1">
                      {column.header}
                      {sortable && column.sortable !== false && sortConfig.key === (column.accessor || column.key) && (
                        <span className="text-blue-500">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className={`${
                      onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
                    } transition-colors`}
                    onClick={() => onRowClick && onRowClick(item)}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                      >
                        {column.render
                          ? column.render(item[column.accessor || column.key], item, index)
                          : item[column.accessor || column.key]
                        }
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && paginatedData.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedData.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default PaginatedTable;