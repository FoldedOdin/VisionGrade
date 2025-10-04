import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Card from '../Card';

describe('Card Component', () => {
  test('renders card with children', () => {
    render(
      <Card>
        <h2>Card Title</h2>
        <p>Card content</p>
      </Card>
    );
    
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  test('applies default styles', () => {
    const { container } = render(<Card>Default Card</Card>);
    const card = container.firstChild;
    
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow-md', 'p-6');
  });

  test('applies custom className', () => {
    const { container } = render(
      <Card className="custom-card">Custom Card</Card>
    );
    const card = container.firstChild;
    
    expect(card).toHaveClass('custom-card');
  });

  test('applies hover effects when hover prop is true', () => {
    const { container } = render(<Card hover>Hoverable Card</Card>);
    const card = container.firstChild;
    
    expect(card).toHaveClass('hover:shadow-lg', 'transition-shadow');
  });

  test('applies padding variants', () => {
    const { container: smallContainer } = render(
      <Card padding="sm">Small Padding</Card>
    );
    expect(smallContainer.firstChild).toHaveClass('p-4');

    const { container: largeContainer } = render(
      <Card padding="lg">Large Padding</Card>
    );
    expect(largeContainer.firstChild).toHaveClass('p-8');
  });

  test('applies shadow variants', () => {
    const { container: smallShadowContainer } = render(
      <Card shadow="sm">Small Shadow</Card>
    );
    expect(smallShadowContainer.firstChild).toHaveClass('shadow-sm');

    const { container: largeShadowContainer } = render(
      <Card shadow="lg">Large Shadow</Card>
    );
    expect(largeShadowContainer.firstChild).toHaveClass('shadow-lg');
  });

  test('renders without border when noBorder is true', () => {
    const { container } = render(<Card noBorder>No Border Card</Card>);
    const card = container.firstChild;
    
    expect(card).not.toHaveClass('border');
  });
});