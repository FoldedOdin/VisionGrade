import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Pagination, { usePagination, ItemsPerPageSelector } from '../Pagination';

describe('Pagination Component', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    totalItems: 100,
    itemsPerPage: 10,
    onPageChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pagination controls correctly', () => {
    render(<Pagination {...defaultProps} />);
    
    expect(screen.getByText('Showing 1 to 10 of 100 results')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(<Pagination {...defaultProps} />);
    
    const prevButton = screen.getByLabelText('Previous page');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination {...defaultProps} currentPage={10} />);
    
    const nextButton = screen.getByLabelText('Next page');
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange when page button is clicked', () => {
    const onPageChange = jest.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);
    
    fireEvent.click(screen.getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('shows ellipsis for large page ranges', () => {
    render(<Pagination {...defaultProps} totalPages={20} currentPage={10} />);
    
    expect(screen.getAllByText('...')).toHaveLength(2);
  });
});

describe('usePagination Hook', () => {
  const TestComponent = () => {
    const { currentPage, itemsPerPage, handlePageChange, handleItemsPerPageChange } = usePagination(1, 10);
    
    return (
      <div>
        <span data-testid="current-page">{currentPage}</span>
        <span data-testid="items-per-page">{itemsPerPage}</span>
        <button onClick={() => handlePageChange(2)}>Next Page</button>
        <button onClick={() => handleItemsPerPageChange(25)}>Change Items</button>
      </div>
    );
  };

  it('manages pagination state correctly', () => {
    render(<TestComponent />);
    
    expect(screen.getByTestId('current-page')).toHaveTextContent('1');
    expect(screen.getByTestId('items-per-page')).toHaveTextContent('10');
    
    fireEvent.click(screen.getByText('Next Page'));
    expect(screen.getByTestId('current-page')).toHaveTextContent('2');
    
    fireEvent.click(screen.getByText('Change Items'));
    expect(screen.getByTestId('items-per-page')).toHaveTextContent('25');
    expect(screen.getByTestId('current-page')).toHaveTextContent('1'); // Reset to page 1
  });
});