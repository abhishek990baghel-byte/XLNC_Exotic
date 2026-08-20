import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).React = React;

// Global Fetch Mock for JSDOM
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
    })
  );
}

// Window matchMedia mock
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ResizeObserver mock
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// React Window Mock using React.createElement (compatible with .ts)
vi.mock('react-window', () => ({
  List: ({ rowCount, rowComponent: RowComponent, rowProps }: any) => {
    return React.createElement(
      'div',
      { 'data-testid': 'virtualized-list' },
      Array.from({ length: rowCount || 0 }).map((_, index) =>
        React.createElement(RowComponent, {
          key: index,
          index,
          style: {},
          ...rowProps,
        })
      )
    );
  },
  FixedSizeList: ({ itemCount, children: ItemRenderer, itemData }: any) => {
    return React.createElement(
      'div',
      { 'data-testid': 'fixed-size-list' },
      Array.from({ length: itemCount || 0 }).map((_, index) =>
        React.createElement(ItemRenderer, {
          key: index,
          index,
          style: {},
          data: itemData,
        })
      )
    );
  },
}));
