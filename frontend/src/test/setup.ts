import '@testing-library/jest-dom'
import { vi, Mock } from 'vitest'

// 模拟 window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// 模拟 IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  root: Element | Document | null = null;
  rootMargin: string = '';
  thresholds: ReadonlyArray<number> = [];
  observe: Mock = vi.fn();
  disconnect: Mock = vi.fn();
  unobserve: Mock = vi.fn();
  takeRecords: Mock = vi.fn().mockReturnValue([]);
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
})

// 模拟 ResizeObserver
class MockResizeObserver implements ResizeObserver {
  observe: Mock = vi.fn();
  disconnect: Mock = vi.fn();
  unobserve: Mock = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
})

// 模拟 scrollTo
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
