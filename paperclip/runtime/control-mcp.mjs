#!/usr/bin/env node
// Thin wrapper over the installed Paperclip MCP/API. No board credentials.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const modulePath = process.env.PAPERCLIP_MCP_MODULE;
if (!modulePath) throw new Error("PAPERCLIP_MCP_MODULE is required");
const dist = path.dirname(modulePath);
const require = createRequire(modulePath);
const load = (file) => import(pathToFileURL(file).href);
const { McpServer } = await load(require.resolve("@modelcontextprotocol/sdk/server/mcp.js"));
const { StdioServerTransport } = await load(require.resolve("@modelcontextprotocol/sdk/server/stdio.js"));
const { z } = await load(require.resolve("zod"));
const { PaperclipApiClient } = await load(path.join(dist, "client.js"));
const { readConfigFromEnv } = await load(path.join(dist, "config.js"));
const { createToolDefinitions } = await load(path.join(dist, "tools.js"));
const config = readConfigFromEnv();
if (!config.runId || !config.agentId || !config.companyId) {
  throw new Error("Active Paperclip run, agent and company identities are required");
}
const client = new PaperclipApiClient(config);
const server = new McpServer({ name:"paperclip-control", version:"1.0.0" });
const allowed = new Set([
  "paperclipMe", "paperclipInboxLite", "paperclipListAgents", "paperclipGetAgent",
  "paperclipListIssues", "paperclipGetIssue", "paperclipGetHeartbeatContext",
  "paperclipListComments", "paperclipGetComment", "paperclipListDocuments",
  "paperclipGetDocument", "paperclipListDocumentRevisions", "paperclipListProjects",
  "paperclipGetProject", "paperclipListGoals", "paperclipGetGoal",
  "paperclipListApprovals", "paperclipGetApproval", "paperclipGetApprovalIssues",
  "paperclipCreateIssue", "paperclipUpdateIssue", "paperclipCheckoutIssue",
  "paperclipReleaseIssue", "paperclipAddComment", "paperclipUpsertIssueDocument"
]);
for (const tool of createToolDefinitions(client)) {
  if (allowed.has(tool.name)) server.tool(tool.name, tool.description, tool.schema.shape, async (input) => {
    const result = await tool.execute(input);
    try {
      const data = JSON.parse(result.content?.[0]?.text);
      if (typeof data?.error === "string" &&
          ((typeof data.status === "number" && data.status >= 400) || Object.keys(data).length === 1)) {
        return {...result, isError:true};
      }
    } catch { /* Preserve non-JSON tool output. */ }
    return result;
  });
}
function tool(name, description, shape, execute) {
  server.tool(name, description, shape, async (input) => {
    try {
      return { content:[{type:"text", text:JSON.stringify(await execute(input))}] };
    } catch (error) {
      return { isError:true, content:[{type:"text", text:String(error.message)}] };
    }
  });
}
const runId = z.string().uuid();
tool("paperclipListRuns", "List recent runs in this agent's company",
  { agentId:z.string().uuid().optional(), limit:z.number().int().min(1).max(50).default(10) },
  ({agentId, limit}) => client.requestJson("GET",
    "/companies/" + encodeURIComponent(config.companyId) + "/heartbeat-runs?summary=true&limit=" +
    limit + (agentId ? "&agentId=" + encodeURIComponent(agentId) : "")));
tool("paperclipGetRun", "Read run state and recovery context", {runId},
  ({runId}) => client.requestJson("GET", "/heartbeat-runs/" + encodeURIComponent(runId)));
tool("paperclipReadRunLog", "Read a bounded, server-redacted run log",
  {runId, offset:z.number().int().min(0).default(0), limitBytes:z.number().int().min(1).max(32768).default(8192)},
  ({runId,offset,limitBytes}) => client.requestJson("GET", "/heartbeat-runs/" +
    encodeURIComponent(runId) + "/log?offset=" + offset + "&limitBytes=" + limitBytes));
tool("paperclipReadRunEvents", "Read a bounded page of server-redacted run events",
  {runId, afterSeq:z.number().int().min(0).default(0), limit:z.number().int().min(1).max(100).default(25)},
  ({runId,afterSeq,limit}) => client.requestJson("GET", "/heartbeat-runs/" +
    encodeURIComponent(runId) + "/events?afterSeq=" + afterSeq + "&limit=" + limit));
tool("paperclipResolveIssueRecovery",
  "Resolve an authorized recovery action after evidence review. Server ownership, run, company and approval rules apply. Human-only decisions and execution reconciliation are not exposed.",
  {issueId:z.string().uuid(), actionId:z.string().uuid(),
   outcome:z.enum(["restored","blocked"]), sourceIssueStatus:z.enum(["todo","in_review","blocked"]),
   resolutionNote:z.string().min(20).max(12000)},
  ({issueId,...body}) => client.requestJson("POST", "/issues/" +
    encodeURIComponent(issueId) + "/recovery-actions/resolve", {body}));
await server.connect(new StdioServerTransport());
