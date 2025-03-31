import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

interface IStdio2SSEOptions {
  serverUrl: string
}

export class Stdio2SSE {
  private _stdioServerTransport: StdioServerTransport
  private _sseClientTransport: SSEClientTransport

  public constructor(options: IStdio2SSEOptions) {
    const url = new URL(options.serverUrl)

    this._stdioServerTransport = new StdioServerTransport()
    this._sseClientTransport = new SSEClientTransport(url)
  }

  private _onClientError(error: Error): void {
    console.error('Stdio2SSE: client error', error)
  }

  private _onServerError(error: Error): void {
    console.log('Stdio2SSE: server error', error)
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

  public async start(): Promise<void> {
    console.error('Establishing mcp proxy...')

    this._configureProxy()

    await Promise.all([
      this._stdioServerTransport.start(),
      this._sseClientTransport.start(),
    ])

    console.error('Proxy established')

    process.on('SIGINT', () => {
      console.error('\nSIGINT received.Shutting down...')
      this._stdioServerTransport.close().catch(this._onServerError)
      this._sseClientTransport.close().catch(this._onClientError)
      process.exit(0)
    })
  }
}

export const runStdio2SSE = async (serverUrl: string): Promise<void> => {
  try {
    console.log(
      `Starting proxy: forwarding stdio to SSE server at ${serverUrl}`,
    )
    const proxy = new Stdio2SSE({ serverUrl })
    await proxy.start()
  } catch (error) {
    console.error('stdio2sse mode failed:', error)
    process.exit(1)
  }
}
