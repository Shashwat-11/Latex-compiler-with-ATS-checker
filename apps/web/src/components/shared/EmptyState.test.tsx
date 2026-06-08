import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState.js';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText('No items')).toBeDefined();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="No items" description="Nothing to show" />);
    expect(screen.getByText('Nothing to show')).toBeDefined();
  });

  it('renders action when provided', () => {
    render(<EmptyState title="No items" action={<button>Add</button>} />);
    expect(screen.getByText('Add')).toBeDefined();
  });
});
