Step 2: Configure Claude Desktop (or Cursor)
Since the server is now running as a network service in Docker, you need to tell your AI client to connect to it via the SSE transport.
Open your claude_desktop_config.json:
Windows: %APPDATA%\Claude\claude_desktop_config.json[1][3]
macOS: ~/Library/Application Support/Claude/claude_desktop_config.json[1][3]
Add the following configuration:

{
  "mcpServers": {
    "servicedesk-plus-docker": {
      "url": "http://localhost:8000/sse",
      "transport": "sse"
    }
  }
}
