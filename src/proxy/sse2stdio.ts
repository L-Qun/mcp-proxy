import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import express, { Express } from 'express'

import { getAvailablePort } from '../utilities'

interface ISSE2StdioOptions {
  command: string
  args: string[]
  port: number
}

export class SSE2Stdio {
  private _stdioClientTransport: StdioClientTransport
  private _options: ISSE2StdioOptions
  private _transports: { [sessionId: string]: SSEServerTransport }

  public constructor(options: ISSE2StdioOptions) {
    this._options = options
    this._stdioClientTransport = new StdioClientTransport({
      command: options.command,
      args: options.args,
    })
    this._transports = {}
  }

  private _onClientError(error: Error): void {
    console.error('SSE2Stdio: client error', error)
  }

  private _onServerError(error: Error): void {
    console.log('SSE2Stdio: server error', error)
  }

  private async _createExpressApp(): Promise<Express> {
    const app = express()

    app.get('/sse', async (req, res) => {
      const transport = new SSEServerTransport('/messages', res)
      this._transports[transport.sessionId] = transport
      res.on('close', () => {
        delete this._transports[transport.sessionId]
        this._stdioClientTransport.close().catch(this._onServerError)
      })

      transport.onmessage = (message) => {
        this._stdioClientTransport.send(message).catch(this._onServerError)
      }
    })

    app.post('/messages', async (req, res) => {
      const sessionId = req.query.sessionId as string
      const transport = this._transports[sessionId]
      if (transport) {
        await transport.handlePostMessage(req, res)
      } else {
        res.status(400).send('No transport found for sessionId')
      }
    })

    return app
  }

  public async start(): Promise<void> {
    await this._stdioClientTransport.start()
    const app = await this._createExpressApp()
    const port = await getAvailablePort(this._options.port)
    app.listen(port, () => {
      console.log(`SSE2Stdio: server started on port ${port}`)
    })

    process.on('SIGINT', () => {
      console.error('\nSIGINT received. Shutting down...')
      this._stdioClientTransport.close().catch(this._onServerError)
      Object.values(this._transports).forEach((transport) =>
        transport.close().catch(this._onClientError),
      )
      process.exit(0)
    })
  }
}

export const runSSE2Stdio = async (
  commandWithArgs: string[],
  options: { port: string },
): Promise<void> => {
  try {
    const childCommand = commandWithArgs[0]
    const childArgs = commandWithArgs.slice(1)
    const port = parseInt(options.port, 10)

    console.log(
      `Starting proxy: forwarding SSE on port ${port} to ${childCommand}`,
    )
    const proxy = new SSE2Stdio({
      command: childCommand,
      args: childArgs,
      port,
    })

    await proxy.start()
  } catch (error) {
    console.error('sse2stdio mode failed:', error)
    process.exit(1)
  }
}
