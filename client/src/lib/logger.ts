
type LogLevel = 'info' | 'warn' | 'error';
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
  stack?: string;
}

// In-memory log store (persists to localStorage for resilience)
const LOG_KEY = 'bongbari_debug_logs';
const MAX_LOGS = 50;

export const logger = {
  getLogs: (): LogEntry[] => {
    try {
      const stored = localStorage.getItem(LOG_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  log: (level: LogLevel, message: string, source?: string, stack?: string) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      source,
      stack
    };

    // Console output with color
    if (level === 'error') console.error(`[${source}]`, message, stack);
    else if (level === 'warn') console.warn(`[${source}]`, message);
    else console.log(`[${source}]`, message);

    // Persist
    try {
      const current = logger.getLogs();
      const updated = [entry, ...current].slice(0, MAX_LOGS);
      localStorage.setItem(LOG_KEY, JSON.stringify(updated));
      
      // Notify listeners (like DebugOverlay)
      window.dispatchEvent(new Event('bongbari-log-update'));
    } catch (e) {
      console.error("Failed to persist log", e);
    }
  },

  info: (msg: string, source = 'App') => logger.log('info', msg, source),
  warn: (msg: string, source = 'App') => logger.log('warn', msg, source),
  error: (msg: string | Error, source = 'App') => {
    const message = msg instanceof Error ? msg.message : msg;
    const stack = msg instanceof Error ? msg.stack : undefined;
    logger.log('error', message, source, stack);
  },
  
  clear: () => {
    localStorage.removeItem(LOG_KEY);
    window.dispatchEvent(new Event('bongbari-log-update'));
  }
};
