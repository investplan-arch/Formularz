#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerInboxTools } from "./tools/inbox.js";
import { registerCommentTools } from "./tools/comments.js";
const server = new McpServer({
    name: "mcp-meta-inbox",
    version: "1.0.0",
});
registerInboxTools(server);
registerCommentTools(server);
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("mcp-meta-inbox server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
