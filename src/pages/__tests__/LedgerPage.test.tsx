import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LedgerPage from '../../pages/LedgerPage';

describe('LedgerPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders ledger entries correctly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/stock-ledger') || url.includes('/api/ledger')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              transactions: [
                {
                  id: 'ledger-1',
                  material_name: 'Test Material A',
                  timestamp: '2023-10-27T10:00:00Z',
                  movement_type: 'Sale-Out',
                  quantity_changed: -5,
                  balance: 10,
                  user_name: 'Admin',
                  reference_id: 'inv-123',
                },
                {
                  id: 'ledger-2',
                  material_name: 'Test Material B',
                  timestamp: '2023-10-26T14:30:00Z',
                  movement_type: 'Purchase-In',
                  quantity_changed: 20,
                  balance: 50,
                  user_name: 'User 1',
                },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        });
      })
    );

    render(
      <BrowserRouter>
        <LedgerPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Stock Ledger')).toBeInTheDocument();
      expect(screen.getByText('Test Material A')).toBeInTheDocument();
      expect(screen.getByText('Test Material B')).toBeInTheDocument();
      expect(screen.getByText('-5')).toBeInTheDocument();
      expect(screen.getByText('+20')).toBeInTheDocument();
    });
  });

  it('renders an empty state if no entries are found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ transactions: [] }),
        })
      )
    );

    render(
      <BrowserRouter>
        <LedgerPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Stock Ledger')).toBeInTheDocument();
      expect(screen.getByText(/No transaction history found/i)).toBeInTheDocument();
    });
  });
});
