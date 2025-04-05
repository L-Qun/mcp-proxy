import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

import { log } from '../utilities'

interface IStdio2SSEOptions {
  serverUrl: string
}

/**
 * Standard Input/Output to Server-Sent Events Proxy
 * ┌──────┐      ┌────────────────────┐      ┌──────────────────┐      ┌──────┐
 * │Client├─────►│StdioServerTransport├─────►│SSEClientTransport├─────►│Server│
 * └──────┘      └────────────────────┘      └──────────────────┘      └──────┘
 */
export class Stdio2SSE {
  private _stdioServerTransport: StdioServerTransport
  private _sseClientTransport: SSEClientTransport

  public constructor(options: IStdio2SSEOptions) {
    const url = new URL(options.serverUrl)

    this._stdioServerTransport = new StdioServerTransport()
    this._sseClientTransport = new SSEClientTransport(url)
  }

  private _onClientError(error: Error): void {
    log('Stdio2SSE: client error', error)
  }

  private _onServerError(error: Error): void {
    log('Stdio2SSE: server error', error)
  }

  private _configureProxy(): void {
    this._stdioServerTransport.onmessage = (message) => {
      this._sseClientTransport.send(message).catch(this._onClientError)
    }

    this._sseClientTransport.onmessage = (message) => {
      this._stdioServerTransport.send(message).catch(this._onServerError)
    }

    this._stdioServerTransport.onerror = this._onServerError
    this._sseClientTransport.onerror = this._onClientError

    this._stdioServerTransport.onclose = () => {
      this._sseClientTransport.close().catch(this._onClientError)
    }

    this._sseClientTransport.onclose = () => {
      this._stdioServerTransport.close().catch(this._onServerError)
    }
  }

  private _cleanUp(): void {
    this._stdioServerTransport.close().catch(this._onServerError)
    this._sseClientTransport.close().catch(this._onClientError)
  }

  /**
   * Start the proxy
   */
  public async start(): Promise<void> {
    log('Establishing mcp proxy...')

    this._configureProxy()

    // We should first start SSEClientTransport
    await this._sseClientTransport.start()
    await this._stdioServerTransport.start()

    log('Proxy established')
    log('Press Ctrl+C to exit')

    process.on('SIGINT', () => {
      log('\nSIGINT received. Shutting down...')
      this._cleanUp()
      process.exit(0)
    })
  }
}

/**
 * Run Stdio2SSE proxy
 * @param serverUrl - URL address of the SSE server
 */
export const runStdio2SSE = async (serverUrl: string): Promise<void> => {
  try {
    log(`Starting proxy: forwarding stdio to SSE server at ${serverUrl}`)
    const proxy = new Stdio2SSE({ serverUrl })
    await proxy.start()
  } catch (error) {
    log('stdio2sse mode failed:', error)
    process.exit(1)
  }
}
