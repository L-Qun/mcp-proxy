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
  private _options: ISSE2StdioOptions
  private _sseTransports: { [sessionId: string]: SSEServerTransport }
  private _stdioTransports: { [sessionId: string]: StdioClientTransport }
  private _endpoint: string

  public constructor(options: ISSE2StdioOptions) {
    this._options = options
    this._sseTransports = {}
    this._stdioTransports = {}
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
      const sseTransport = new SSEServerTransport(this._endpoint, res)
      const stdioTransport = new StdioClientTransport({
        command: this._options.command,
        args: this._options.args,
      })

      const sessionId = sseTransport.sessionId
      this._sseTransports[sessionId] = sseTransport
      this._stdioTransports[sessionId] = stdioTransport

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })

      res.write(
        `event: endpoint\ndata: ${encodeURI(this._endpoint)}?sessionId=${sessionId}\n\n`,
      )

      // @ts-ignore
      sseTransport._sseResponse = res

      sseTransport.onmessage = (message) => {
        stdioTransport.send(message).catch(this._onClientError)
      }
      stdioTransport.onmessage = (message) => {
        sseTransport.send(message).catch(this._onServerError)
      }

      await stdioTransport.start()

      res.on('close', () => {
        delete this._sseTransports[sessionId]
        delete this._stdioTransports[sessionId]
        sseTransport.close().catch(this._onServerError)
        stdioTransport.close().catch(this._onClientError)
      })
    })

    app.post(this._endpoint, async (req, res) => {
      const sessionId = req.query.sessionId as string
      const sseTransport = this._sseTransports[sessionId]
      const stdioTransport = this._stdioTransports[sessionId]
      if (sseTransport && stdioTransport) {
        await sseTransport.handlePostMessage(req, res)
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
    const app = await this._createExpressApp()
    const port = await getAvailablePort(this._options.port)
    app.listen(port, () => {
      log(`SSE2Stdio: server started on port ${port}`)
    })

    process.on('SIGINT', () => {
      log('\nSIGINT received. Shutting down...')
      Object.values(this._stdioTransports).forEach((stdioTransport) =>
        stdioTransport.close().catch(this._onClientError),
      )
      Object.values(this._sseTransports).forEach((sseTransport) =>
        sseTransport.close().catch(this._onServerError),
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
