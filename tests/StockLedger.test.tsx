import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StockLedger from '../src/components/StockLedger';
import type { StockLedger as StockLedgerType } from '../src/types';

describe('StockLedger', () => {
  const mockHistory: StockLedgerType[] = [
    {
      id: '1',
      material_id: 'mat-1',
      timestamp: '2023-10-27T10:00:00Z',
      movement_type: 'Initial Import',
      quantity_changed: 100,
      balance: 100,
      user_name: 'Admin',
      reference_id: ''
    }
  ];

  it('renders history correctly', () => {
    render(<StockLedger history={mockHistory} currentStock={100} />);
    
    expect(screen.getByText('Initial Import')).toBeInTheDocument();
    expect(screen.getAllByText('+100').length).toBeGreaterThan(0);
    expect(screen.getAllByText('100').length).toBeGreaterThan(0);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders the adjustment form if onAdjustStock is provided', () => {
    render(<StockLedger history={mockHistory} currentStock={100} onAdjustStock={vi.fn()} />);
    
    expect(screen.getByTestId('adjustment-form')).toBeInTheDocument();
  });

  it('does not render adjustment form if onAdjustStock is omitted', () => {
    render(<StockLedger history={mockHistory} currentStock={100} />);
    
    expect(screen.queryByTestId('adjustment-form')).not.toBeInTheDocument();
  });

  it('allows adding stock', async () => {
    const handleAdjust = vi.fn();
    render(<StockLedger history={mockHistory} currentStock={100} onAdjustStock={handleAdjust} />);
    
    const amountInput = screen.getByTestId('adjust-amount');
    const form = screen.getByTestId('adjustment-form');
    const typeSelect = screen.getByTestId('adjust-type');

    fireEvent.change(typeSelect, { target: { value: 'Add' } });
    fireEvent.change(amountInput, { target: { value: '50' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(handleAdjust).toHaveBeenCalledWith(150, 50); // newStock, quantityChanged
  });

  it('allows subtracting stock', async () => {
    const handleAdjust = vi.fn();
    render(<StockLedger history={mockHistory} currentStock={100} onAdjustStock={handleAdjust} />);
    
    const amountInput = screen.getByTestId('adjust-amount');
    const form = screen.getByTestId('adjustment-form');
    const typeSelect = screen.getByTestId('adjust-type');

    fireEvent.change(typeSelect, { target: { value: 'Subtract' } });
    fireEvent.change(amountInput, { target: { value: '20' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(handleAdjust).toHaveBeenCalledWith(80, -20); // newStock, quantityChanged
  });

  it('calculates the preview correctly', async () => {
    render(<StockLedger history={mockHistory} currentStock={100} onAdjustStock={vi.fn()} />);
    
    const amountInput = screen.getByTestId('adjust-amount');
    const typeSelect = screen.getByTestId('adjust-type');
    const preview = screen.getByTestId('preview-calc');

    fireEvent.change(typeSelect, { target: { value: 'Add' } });
    fireEvent.change(amountInput, { target: { value: '30' } });
    
    expect(preview).toHaveTextContent('New Stock Balance: 130');

    fireEvent.change(typeSelect, { target: { value: 'Subtract' } });
    expect(preview).toHaveTextContent('New Stock Balance: 70');
  });
});
