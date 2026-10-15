import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { confirmBuys, confirmSells, reportFill } from "./actions.ts";
import { syncAndPlan } from "./sync-and-plan.ts";

const port = Number(process.env.ACTION_PORT ?? 3020);

function send(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end(payload);
}

async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      send(response, 204, {});
      return;
    }
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    if (request.method !== "POST") {
      send(response, 404, { error: "Not found" });
      return;
    }
    const body = await readBody(request);
    if (url.pathname === "/sync-and-plan") {
      send(response, 200, await syncAndPlan(String(body.accountId ?? "acct-1")));
      return;
    }
    const accountId = String(body.accountId ?? "");
    const tradeDate = String(body.tradeDate ?? "");
    const asOf = String(body.asOf ?? "");
    const actor = String(body.actor ?? "交易员");
    if (url.pathname === "/confirm-sells") {
      send(response, 200, await confirmSells(accountId, tradeDate, asOf, actor));
      return;
    }
    if (url.pathname === "/confirm-buys") {
      send(response, 200, await confirmBuys(accountId, tradeDate, asOf, actor));
      return;
    }
    if (url.pathname === "/report-fill") {
      const side = body.side === "卖出" ? "卖出" : "买入";
      send(
        response,
        200,
        await reportFill({
          orderId: String(body.orderId ?? ""),
          side,
          price: Number(body.price),
          quantity: Number(body.quantity),
          sessionDate: String(body.sessionDate ?? tradeDate),
          actor,
        }),
      );
      return;
    }
    send(response, 404, { error: "Not found" });
  } catch (error) {
    send(response, 400, { error: error instanceof Error ? error.message : "提交没有发生" });
  }
});

server.requestTimeout = 20 * 60 * 1000;
server.listen(port, () => {
  process.stdout.write(`action-server listening on ${port}\n`);
});
