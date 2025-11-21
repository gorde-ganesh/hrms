import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(__dirname, '../../logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const getTimestamp = () => new Date().toISOString();

const logToFile = (level: string, message: string, meta?: any) => {
  const timestamp = getTimestamp();
  const logMessage = `[${timestamp}] [${level}] ${message} ${
    meta ? JSON.stringify(meta) : ''
  }\n`;
  const logFile = path.join(
    LOG_DIR,
    `${new Date().toISOString().split('T')[0]}.log`
  );

  fs.appendFile(logFile, logMessage, (err) => {
    if (err) console.error('Failed to write to log file:', err);
  });

  // Also log to console
  if (level === 'ERROR') {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }
};

export const logger = {
  info: (message: string, meta?: any) => logToFile('INFO', message, meta),
  error: (message: string, meta?: any) => logToFile('ERROR', message, meta),
  warn: (message: string, meta?: any) => logToFile('WARN', message, meta),
  debug: (message: string, meta?: any) => logToFile('DEBUG', message, meta),
};
