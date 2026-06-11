const isDev = (import.meta as any).env?.DEV ?? true;

export const logger = {
  info: (...args: any[]) => {
    if (isDev) {
      console.log(`[Frontend] [INFO] [${new Date().toISOString()}]`, ...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn(`[Frontend] [WARN] [${new Date().toISOString()}]`, ...args);
  },
  error: (...args: any[]) => {
    console.error(`[Frontend] [ERROR] [${new Date().toISOString()}]`, ...args);
  }
};
