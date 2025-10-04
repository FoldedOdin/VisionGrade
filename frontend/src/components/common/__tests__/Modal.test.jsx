import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from '../Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders modal when isOpen is true', () => {
    render(
      <Modal {...defaultProps}>
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  test('does not render modal when isOpen is false', () => {
    render(
      <Modal {...defaultProps} isOpen={false}>
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <p>Modal content</p>
      </Modal>
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when overlay is clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <p>Modal content</p>
      </Modal>
    );
    
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not call onClose when modal content is clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <p>Modal content</p>
      </Modal>
    );
    
    const modalContent = screen.getByText('Modal content');
    fireEvent.click(modalContent);
    
    expect(onClose).not.toHaveBeenCalled();
  });

  test('calls onClose when Escape key is pressed', () => {
    const onClose = jest.fn();
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <p>Modal content</p>
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('applies different sizes', () => {
    const { rerender } = render(
      <Modal {...defaultProps} size="sm">
        <p>Small modal</p>
      </Modal>
    );
    
    let modalContent = screen.getByRole('dialog');
    expect(modalContent).toHaveClass('max-w-md');
    
    rerender(
      <Modal {...defaultProps} size="lg">
        <p>Large modal</p>
      </Modal>
    );
    
    modalContent = screen.getByRole('dialog');
    expect(modalContent).toHaveClass('max-w-4xl');
  });

  test('renders without close button when showCloseButton is false', () => {
    render(
      <Modal {...defaultProps} showCloseButton={false}>
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  test('has proper accessibility attributes', () => {
    render(
      <Modal {...defaultProps}>
        <p>Modal content</p>
      </Modal>
    );
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby');
  });

  test('applies custom className', () => {
    render(
      <Modal {...defaultProps} className="custom-modal">
        <p>Modal content</p>
      </Modal>
    );
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('custom-modal');
  });
});