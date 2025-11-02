import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

/**
 * Custom render function that wraps components with necessary providers
 * Extend this as needed when you add providers like QueryClientProvider, ThemeProvider, etc.
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

