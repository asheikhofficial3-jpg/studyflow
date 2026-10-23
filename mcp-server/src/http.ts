/**
 * Streamable HTTP entry point for the StudyFlow MCP server.
 * MCP spec 2025-03-26+ transport ("Streamable HTTP"), run in stateless mode.
 * Endpoint: POST /mcp  (GET /mcp serves the SSE notification stream)
 */
import { createServer, IncomingMessage, ServerResponse } from "http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createStudyFlowServer } from "./server.js";

const PORT = Number(process.env.STUDYFLOW_MCP_PORT ?? 3001);

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname !== "/mcp") {
    if (url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "studyflow-mcp", protocol: "mcp-streamable-http" }));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Use POST /mcp" }));
    return;
  }

  try {
    const server = createStudyFlowServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless: no session negotiation required
    });
    res.on("close", () => {
      void transport.close().catch(() => undefined);
      void server.close().catch(() => undefined);
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (err) {
    console.error("MCP request error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null }));
    }
  }
});

httpServer.listen(PORT, () => {
  console.log(`studyflow-mcp listening on http://localhost:${PORT}/mcp (Streamable HTTP, stateless)`);
});
