/**
 * stdio entry point for the StudyFlow MCP server.
 * Lets any MCP client (Claude Desktop, VS Code, Alexa+ Agent Skill hosts, …)
 * launch and talk to the server over standard input/output.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createStudyFlowServer } from "./server.js";

async function main(): Promise<void> {
  const server = createStudyFlowServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("studyflow-mcp running on stdio");
}

main().catch((err) => {
  console.error("studyflow-mcp stdio failed:", err);
  process.exit(1);
});
