import { Command } from 'commander'

import { runStdio2SSE } from '../proxy/stdio2sse'
import { runSSE2Stdio } from '../proxy/sse2stdio'
import { getVersionNumber } from '../utilities'

const program: Command = new Command()

program
  .name('mcp-proxy')
  .description('MCP (Model Context Protocol) Proxy Service')
  .version(getVersionNumber())

program
  .command('stdio-to-sse <serverUrl>')
  .description('Forward standard input/output to an SSE server')
  .action(runStdio2SSE)

program
  .command('stdin-to-sse <command...>')
  .description('Forward SSE server messages to a child process stdin/stdout')
  .option('-p, --port <port>', 'Set the SSE server port', '8080')
  .action(runSSE2Stdio)

program.addHelpText(
  'after',
  `
Examples:
  $ mcp-proxy stdio-to-sse https://my-mcp-server/sse
  $ mcp-proxy stdin-to-sse node server.js --port 8080
`,
)

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}
