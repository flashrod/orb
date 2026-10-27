// Mock localStorage for zustand persist middleware (Node test env has no window)
const mock: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => mock[key] ?? null,
    setItem: (key: string, value: string) => { mock[key] = value; },
    removeItem: (key: string) => { delete mock[key]; },
    clear: () => { Object.keys(mock).forEach((key) => delete mock[key]); },
  },
  writable: true,
  configurable: true,
});
