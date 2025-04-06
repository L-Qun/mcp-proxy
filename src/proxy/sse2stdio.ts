import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import express, { Express } from 'express'

import { getAvailablePort, log } from '../utilities'

interface ISSE2StdioOptions {
  command: string
  args: string[]
  port: number
}

/**
 * Server-Sent Events to Standard Input/Output Proxy
 * ┌──────┐      ┌──────────────────┐      ┌────────────────────┐      ┌──────┐
 * │Client├─────►│SSEServerTransport├─────►│StdioClientTransport├─────►│Server│
 * └──────┘      └──────────────────┘      └────────────────────┘      └──────┘
 */
export class SSE2Stdio {
  private _stdioClientTransport: StdioClientTransport
  private _options: ISSE2StdioOptions
  private _transports: { [sessionId: string]: SSEServerTransport }
  private _endpoint: string

  public constructor(options: ISSE2StdioOptions) {
    this._options = options
    this._stdioClientTransport = new StdioClientTransport({
      command: options.command,
      args: options.args,
    })
    this._transports = {}
    this._endpoint = '/messages'
  }

  private _onClientError(error: Error): void {
    log('SSE2Stdio: client error', error)
  }

  private _onServerError(error: Error): void {
    log('SSE2Stdio: server error', error)
  }

  private async _createExpressApp(): Promise<Express> {
    const app = express()

    app.get('/sse', async (req, res) => {
      const transport = new SSEServerTransport(this._endpoint, res)
      const sessionId = transport.sessionId
      this._transports[sessionId] = transport

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })

      res.write(
        `event: endpoint\ndata: ${encodeURI(this._endpoint)}?sessionId=${sessionId}\n\n`,
      )

      // @ts-ignore
      transport._sseResponse = res

      transport.onmessage = (message) => {
        this._stdioClientTransport.send(message).catch(this._onServerError)
      }
      this._stdioClientTransport.onmessage = (message) => {
        transport.send(message).catch(this._onClientError)
      }

      res.on('close', () => {
        delete this._transports[transport.sessionId]
        this._stdioClientTransport.close().catch(this._onServerError)
      })
    })

    app.post(this._endpoint, async (req, res) => {
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

  /**
   * Start the proxy
   */
  public async start(): Promise<void> {
    await this._stdioClientTransport.start()

    const app = await this._createExpressApp()
    const port = await getAvailablePort(this._options.port)
    app.listen(port, () => {
      log(`SSE2Stdio: server started on port ${port}`)
    })

    process.on('SIGINT', () => {
      log('\nSIGINT received. Shutting down...')
      this._stdioClientTransport.close().catch(this._onServerError)
      Object.values(this._transports).forEach((transport) =>
        transport.close().catch(this._onClientError),
      )
      process.exit(0)
    })
  }
}

/**
 * Run SSE2Stdio proxy
 * @param commandWithArgs - Command and its arguments
 * @param options - Configuration options
 * @param options.port - Server port
 */
export const runSSE2Stdio = async (
  commandWithArgs: string[],
  options: { port: string },
): Promise<void> => {
  try {
    const childCommand = commandWithArgs[0]
    const childArgs = commandWithArgs.slice(1)
    const port = parseInt(options.port, 10)

    log(`Starting proxy: forwarding SSE on port ${port} to ${childCommand}`)
    const proxy = new SSE2Stdio({
      command: childCommand,
      args: childArgs,
      port,
    })

    await proxy.start()
  } catch (error) {
    log('sse2stdio mode failed:', error)
    process.exit(1)
  }
}
