import net from 'net'
import path from 'path'

export async function getAvailablePort(preferredPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        server.listen(0)
      } else {
        reject(err)
      }
    })

    server.on('listening', () => {
      const address = server.address()
      if (address && typeof address !== 'string') {
        const { port } = address
        server.close(() => {
          resolve(port)
        })
      } else {
        server.close()
        reject(new Error('Unable to get a valid server address'))
      }
    })

    server.listen(preferredPort ?? 0)
  })
}

export function getVersionNumber(): string {
  const packageJson = require(path.resolve(__dirname, '../package.json'))
  return packageJson.version
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function log(message?: any, ...optionalParams: any[]): void {
  console.error(message, ...optionalParams)
}
