import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../src/components/Button';

describe('WCAG Accessible Button Component', () => {
  it('renders correctly with children text', () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('fires onClick event handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders loading state with aria-busy and accessible status', () => {
    render(<Button isLoading>Save Changes</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('supports custom aria-label on icon-only buttons for WCAG compliance', () => {
    render(
      <Button aria-label="Delete Material Item">
        <span data-testid="trash-icon">🗑️</span>
      </Button>
    );
    const button = screen.getByRole('button', { name: /delete material item/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Delete Material Item');
  });
});
