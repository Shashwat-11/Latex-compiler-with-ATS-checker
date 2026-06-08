import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner } from './Spinner.js';

describe('Spinner', () => {
  it('renders with accessible label', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('[role="status"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Loading"]')).toBeTruthy();
  });
});
