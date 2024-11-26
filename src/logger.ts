import fs from 'fs'
import path from 'path'
import { createStream } from 'rotating-file-stream'

// Create logs directory if it doesn't exist
const logDirectory = path.join(__dirname, 'logs')
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory)
}

// Create a rotating write stream
const accessLogStream = createStream('logs.log', {
  interval: '14d', // rotate every 14 days
  size: '20M', // rotate every 20MB
  path: logDirectory,
})

const overrideConsoleMethod = (method: 'log' | 'error', label: string) => {
  console[method] = (message: any, ...optionalParams: any[]) => {
    const formatMessage = (msg: any) => {
      if (typeof msg === 'object') {
        try {
          return JSON.stringify(msg)
        } catch (error) {
          return '[Circular]'
        }
      }
      return msg
    }
    const stack = new Error().stack
    const callerLine = stack ? stack.split('\n')[2] : ''
    const lineNumberMatch = callerLine.match(/:(\d+):\d+\)?$/)
    const lineNumber = lineNumberMatch ? lineNumberMatch[1] : 'unknown'
    const fileNameMatch =
      callerLine.match(/\/([^\/]+\.ts):\d+:\d+\)?$/) ||
      callerLine.match(/\\([^\\]+\.ts):\d+:\d+\)?$/)
    const fileName = fileNameMatch ? fileNameMatch[1] : 'unknown'

    const logMessage = `${new Date().toISOString()} [${fileName}:${lineNumber}] ${label} - ${formatMessage(
      message
    )} ${optionalParams.map(formatMessage).join(' ')}\n`
    accessLogStream.write(logMessage)
    process[method === 'log' ? 'stdout' : 'stderr'].write(logMessage) // Also output to console
  }
}

overrideConsoleMethod('log', '')
overrideConsoleMethod('error', 'ERROR')

export default console
