import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LowStockBanner from '../../components/LowStockBanner';

describe('LowStockBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.Notification = vi.fn() as any;
    (global.Notification as any).permission = 'default';
    (global.Notification as any).requestPermission = vi.fn().mockResolvedValue('granted');
    global.fetch = vi.fn() as any;
  });

  it('renders nothing when there is no low stock', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', name: 'Item 1', stock: 100, min_stock: 10 }]
    });

    const { container } = render(
      <BrowserRouter>
        <LowStockBanner />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders the banner when there are low stock items', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { id: '1', name: 'Item 1', stock: 5, min_stock: 10 },
        { id: '2', name: 'Item 2', stock: 2, min_stock: 5 },
      ]
    });

    render(
      <BrowserRouter>
        <LowStockBanner />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Low Stock Alert/i)).toBeInTheDocument();
      expect(screen.getByText(/You have 2 materials running below the minimum stock threshold/i)).toBeInTheDocument();
    });
  });

  it('can be dismissed', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', name: 'Item 1', stock: 5, min_stock: 10 }]
    });

    render(
      <BrowserRouter>
        <LowStockBanner />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Low Stock Alert/i)).toBeInTheDocument();
    });

    const dismissButton = screen.getByLabelText(/Dismiss alert/i);
    fireEvent.click(dismissButton);

    expect(screen.queryByText(/Low Stock Alert/i)).not.toBeInTheDocument();
  });
});

