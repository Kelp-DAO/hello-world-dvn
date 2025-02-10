import { pino } from "pino";

/**
 * Logger instance configured with pino-pretty transport for enhanced readability.
 */
const logger = pino({
  timestamp: false,
  base: null,
  transport: {
    target: "pino-pretty",
    options: {
      levelFirst: false,
      ignore: "pid,level",
      // colorize: true, // Add colors for better readability
      // translateTime: 'SYS:standard', // Human-readable time format
      // translateTime: 'yyyy-MM-dd HH:mm:ss',
      translateTime: "HH:mm:ss",
      singleLine: false, // Ensure logs aren't flattened into a single line
      messageFormat: false, // Keep messages clean
    },
  },
});

export { logger };
