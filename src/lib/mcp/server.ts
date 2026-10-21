import catalog from "@/lib/mcp/api-catalog.json";
import { callApiAs, type ApiCallInput } from "@/lib/mcp/api-proxy";
import type { McpCaller } from "@/lib/mcp/tokens";

/**
 * HX Academy's MCP server (Streamable HTTP, stateless).
 *
 * Hand-rolled rather than built on the MCP SDK: stateless JSON-RPC over POST
 * is a handful of methods, and the SDK's Node transport expects Node
 * req/res objects rather than the Web Request a Next route handler gets.
 *
 * The tool surface is small on purpose. Instead of one tool per module (which
 * would always lag behind the app), Claude discovers routes with
 * list_endpoints / describe_endpoint and acts through call_api, which runs the
 * real route as the connected user. A few shortcuts cover the commonest reads.
 */

export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = { name: "hx-academy", title: "HX Academy", version: "1.0.0" };

const INSTRUCTIONS = `HX Academy is a football academy management platform in Algeria (currency DZD, 58 wilayas, phone numbers +213). It covers leads/CRM, players, subscriptions and plans, payments, stations (academy locations), summer camp, store and orders, HRM (staff, attendance, leave, payroll), finance and charges, tickets, the public website content, surveys and reports.

You act as the staff member who connected you, with exactly their role's permissions. A 403 means their role lacks that permission — tell the user rather than trying another route.

How to work:
1. Use list_endpoints (optionally with a filter such as "leads" or "payments") to find the right route, and describe_endpoint to see its query parameters and body fields.
2. Use call_api to run it. Paths look like /api/leads/<id>: replace [id] segments with real ids you got from a previous call.
3. List endpoints are paginated (page, perPage). Prefer filters and small pages.
4. Before anything that deletes data, moves money (approving/rejecting payments, payroll) or changes many records, state exactly what you are about to do and get the user's confirmation first.`;

type Json = Record<string, unknown>;

interface CatalogEntry {
  path: string;
  methods: Record<string, string | null>;
  query: string[];
  bodyFields: string[];
  schemas: string[];
}
const CATALOG = catalog as unknown as CatalogEntry[];

const TOOLS = [
  {
    name: "whoami",
    title: "Who am I connected as",
    description: "The HX Academy staff account this connection acts as, its role, its permissions, and whether the connection is read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "list_endpoints",
    title: "List HX Academy API endpoints",
    description: "List the back-office API routes with their HTTP methods. Optional filter matches against the path (e.g. \"leads\", \"payments\", \"hrm\").",
    inputSchema: {
      type: "object",
      properties: { filter: { type: "string", description: "Substring to match in the route path" } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "describe_endpoint",
    title: "Describe an API endpoint",
    description: "Details for one route: methods, query parameters, body fields and any validation schema. Pass the path as listed, e.g. /api/leads/[id].",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "call_api",
    title: "Call the HX Academy API",
    description:
      "Run a back-office API call as the connected staff member. Use GET to read; POST/PUT/PATCH/DELETE to create, update or delete. Replace [id] placeholders with real ids. Returns the HTTP status and JSON body.",
    inputSchema: {
      type: "object",
      properties: {
        method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
        path: { type: "string", description: "Concrete path, e.g. /api/leads/clx123/status" },
        query: { type: "object", description: "Query-string parameters", additionalProperties: { type: ["string", "number", "boolean"] } },
        body: { description: "JSON body for POST/PUT/PATCH/DELETE" },
      },
      required: ["method", "path"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "get_dashboard_stats",
    title: "Dashboard statistics",
    description: "Headline numbers: players, active subscriptions, pending payments, revenue this month vs last, new leads, pending orders, expiring subscriptions.",
    inputSchema: {
      type: "object",
      properties: { stationId: { type: "string", description: "Limit to one station (location)" } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "search_leads",
    title: "Search leads",
    description: "Search CRM leads by name, email or phone (phone matching ignores formatting).",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string" },
        statusId: { type: "string" },
        stationId: { type: "string" },
        page: { type: "number" },
        perPage: { type: "number" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "search_players",
    title: "Search players",
    description: "Search players by name, email or phone, optionally by status, category or station.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string" },
        status: { type: "string" },
        category: { type: "string" },
        stationId: { type: "string" },
        page: { type: "number" },
        perPage: { type: "number" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

function text(t: string, isError = false) {
  return { content: [{ type: "text", text: t }], isError };
}

async function api(caller: McpCaller, origin: string, input: ApiCallInput) {
  const r = await callApiAs(caller, origin, input);
  return text(`HTTP ${r.status}\n${r.text}`, !r.ok);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

async function callTool(name: string, args: Json, caller: McpCaller, origin: string) {
  switch (name) {
    case "whoami":
      return text(
        JSON.stringify(
          {
            user: caller.user,
            connection: caller.connectionName,
            readOnly: caller.readOnly,
            permissions: caller.permissions.includes("*") ? "all (Super Admin)" : caller.permissions,
          },
          null,
          1,
        ),
      );

    case "list_endpoints": {
      const filter = str(args.filter)?.toLowerCase();
      const rows = CATALOG.filter((e) => !filter || e.path.toLowerCase().includes(filter)).map(
        (e) => `${Object.keys(e.methods).join(",").padEnd(18)} ${e.path}`,
      );
      return text(rows.length ? rows.join("\n") : `No endpoint matches "${filter}".`);
    }

    case "describe_endpoint": {
      const path = str(args.path) ?? "";
      const entry = CATALOG.find((e) => e.path === path) ?? CATALOG.find((e) => e.path === path.replace(/\/$/, ""));
      if (!entry) return text(`Unknown endpoint ${path}. Use list_endpoints to see what exists.`, true);
      return text(JSON.stringify(entry, null, 1));
    }

    case "call_api": {
      const method = String(args.method ?? "").toUpperCase();
      if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) return text("method must be GET, POST, PUT, PATCH or DELETE.", true);
      const path = str(args.path);
      if (!path) return text("path is required.", true);
      if (path.includes("[")) return text("Replace the [placeholder] segments in the path with real ids.", true);
      const [rawPath, qs] = path.split("?");
      const bare = rawPath.replace(/(.)\/+$/, "$1"); // "/api/leads/" would 308 to "/api/leads"
      const query: ApiCallInput["query"] = { ...Object.fromEntries(new URLSearchParams(qs ?? "")), ...((args.query as Json) ?? {}) } as ApiCallInput["query"];
      return api(caller, origin, { method: method as ApiCallInput["method"], path: bare, query, body: args.body });
    }

    case "get_dashboard_stats":
      return api(caller, origin, { method: "GET", path: "/api/dashboard/stats", query: { stationId: str(args.stationId) } });

    case "search_leads":
      return api(caller, origin, {
        method: "GET",
        path: "/api/leads",
        query: { q: str(args.q), statusId: str(args.statusId), stationId: str(args.stationId), page: Number(args.page) || 1, perPage: Number(args.perPage) || 20 },
      });

    case "search_players":
      return api(caller, origin, {
        method: "GET",
        path: "/api/players",
        query: {
          q: str(args.q),
          status: str(args.status),
          category: str(args.category),
          stationId: str(args.stationId),
          page: Number(args.page) || 1,
          perPage: Number(args.perPage) || 20,
        },
      });

    default:
      return null;
  }
}

interface RpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Json;
}

const rpcError = (id: RpcRequest["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const rpcResult = (id: RpcRequest["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });

/** Handle one JSON-RPC message. Returns null for notifications, which get no reply. */
export async function handleRpc(msg: RpcRequest, caller: McpCaller, origin: string) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return rpcError(msg?.id, -32600, "Invalid Request");
  const isNotification = msg.id === undefined;

  try {
    switch (msg.method) {
      case "initialize": {
        const requested = String(msg.params?.protocolVersion ?? "");
        return rpcResult(msg.id, {
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : SUPPORTED_PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: INSTRUCTIONS,
        });
      }
      case "ping":
        return isNotification ? null : rpcResult(msg.id, {});
      case "tools/list":
        return rpcResult(msg.id, { tools: TOOLS });
      case "tools/call": {
        const name = String(msg.params?.name ?? "");
        const result = await callTool(name, (msg.params?.arguments as Json) ?? {}, caller, origin);
        if (!result) return rpcError(msg.id, -32602, `Unknown tool: ${name}`);
        return rpcResult(msg.id, result);
      }
      case "resources/list":
        return rpcResult(msg.id, { resources: [] });
      case "prompts/list":
        return rpcResult(msg.id, { prompts: [] });
      default:
        if (isNotification) return null; // notifications/initialized, notifications/cancelled, …
        return rpcError(msg.id, -32601, `Method not found: ${msg.method}`);
    }
  } catch (e) {
    if (isNotification) return null;
    // Tool failures are reported inside the result so Claude can see and react to them.
    if (msg.method === "tools/call") return rpcResult(msg.id, text(`Error: ${e instanceof Error ? e.message : String(e)}`, true));
    return rpcError(msg.id, -32603, "Internal error");
  }
}
