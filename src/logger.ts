import * as winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import * as path from 'path'

const logDirectory = path.join(__dirname, '..', 'logs')

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(), // Output to console
    new DailyRotateFile({
      filename: path.join(logDirectory, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
})

// Override console.log to write to the logger
console.log = (...args) => {
  logger.info(args.join(' '))
}

console.log('Hello, world!')
