import { getObject, listObjects, postObject } from "./api.ts";
import { recordFill } from "./close-pipeline.ts";

function minutes(asOf: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(asOf));
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour * 60 + minute;
}

async function currentArrangement(accountId: string, tradeDate: string): Promise<Record<string, unknown>> {
  const arrangements = await listObjects(`/arrangements?accountId=${encodeURIComponent(accountId)}&sessionDate=${encodeURIComponent(tradeDate)}`);
  const superseded = new Set(
    arrangements.map((row) => row.supersedesArrangementId).filter((id) => id != null).map(String),
  );
  const current = arrangements.find(
    (row) => !superseded.has(String(row.arrangementId)) && !arrangements.some((other) => other.supersedesArrangementId === row.arrangementId),
  );
  if (!current) throw new Error("没有这一天的开盘安排");
  return current;
}

function blocksBuy(line: Record<string, unknown>, orders: Record<string, unknown>[]): boolean {
  if (line.reason !== "止损" && line.reason !== "制度离场") return false;
  if (line.postponed === true) return false;
  return !orders.some((order) => order.sellLineId === line.sellLineId && order.contentStatus === "待执行");
}

export async function confirmSells(accountId: string, tradeDate: string, asOf: string, actor: string): Promise<Record<string, unknown>> {
  const clock = minutes(asOf);
  if (clock < 9 * 60 + 25 || clock >= 15 * 60) throw new Error("现在不能写下卖出委托");
  const page = await currentArrangement(accountId, tradeDate);
  if (page.header !== "还没写下委托") throw new Error(`页首是${String(page.header)}，这次提交不发生`);
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(page.arrangementId))}`);
  const orders = await listObjects("/sell-orders");
  const heldBack = sells.filter((line) => (line.reason === "止损" || line.reason === "制度离场") && line.postponed === true);
  if (heldBack.length > 0) throw new Error("止损或制度离场被推迟，这次提交不发生");
  const written: string[] = [];
  for (const line of sells) {
    const outcome = String(line.outcome ?? "");
    if (outcome !== "可写入委托" && outcome !== "挂涨停价" && outcome !== "卖掉可卖的其余今天卖不掉") continue;
    if (line.postponed === true) continue;
    const existing = orders.filter((order) => order.sellLineId === line.sellLineId);
    if (existing.some((order) => order.executionStatus !== "未执行")) continue;
    if (existing.length > 0) continue;
    const orderId = `${line.sellLineId}|order`;
    await postObject("/sell-orders", {
      pass: "content",
      orderId,
      sellLineId: line.sellLineId,
      quantity: line.submitQuantity,
      limitPrice: line.submitLimitPrice,
      contentStatus: "待执行",
      executionStatus: "未执行",
    });
    await postObject("/sell-lines", {
      pass: "decision",
      sellLineId: line.sellLineId,
      outcomeAtConfirm: line.outcome,
    });
    written.push(orderId);
  }
  const sellDecision: Record<string, unknown> = {
    pass: "decision",
    arrangementId: page.arrangementId,
    sellConfirmedBy: actor,
    sellConfirmedAt: asOf,
  };
  // 同日可先卖后买：快照字段 once，只在尚未写入时落一次。
  if (page.headerAtConfirm == null) {
    sellDecision.headerAtConfirm = page.header;
    sellDecision.cashAtConfirm = page.cashShown;
    sellDecision.totalAssetsAtConfirm = page.totalAssetsShown;
  }
  await postObject("/arrangements", sellDecision);
  return { arrangementId: page.arrangementId, orders: written };
}

export async function confirmBuys(accountId: string, tradeDate: string, asOf: string, actor: string): Promise<Record<string, unknown>> {
  const clock = minutes(asOf);
  if (clock < 9 * 60 + 25 || clock >= 9 * 60 + 30) throw new Error("现在不能写下买入委托");
  const page = await currentArrangement(accountId, tradeDate);
  if (page.header !== "还没写下委托") throw new Error(`页首是${String(page.header)}，这次提交不发生`);
  const sells = await listObjects(`/sell-lines?arrangementId=${encodeURIComponent(String(page.arrangementId))}`);
  const sellOrders = await listObjects("/sell-orders");
  if (sells.some((line) => blocksBuy(line, sellOrders))) throw new Error("还有未写入的止损或制度离场，这次提交不发生");
  const buys = await listObjects(`/buy-lines?arrangementId=${encodeURIComponent(String(page.arrangementId))}`);
  const orders = await listObjects("/buy-orders");
  const written: string[] = [];
  for (const line of buys) {
    if (line.outcome !== "可写入委托" || line.vetoed === true) continue;
    const existing = orders.filter((order) => order.buyLineId === line.buyLineId);
    if (existing.length > 0) continue;
    const orderId = `${line.buyLineId}|order`;
    await postObject("/buy-orders", {
      pass: "content",
      orderId,
      buyLineId: line.buyLineId,
      quantity: line.submitQuantity,
      limitPrice: line.submitLimitPrice,
      contentStatus: "待执行",
      executionStatus: "未执行",
    });
    await postObject("/buy-lines", {
      pass: "decision",
      buyLineId: line.buyLineId,
      outcomeAtConfirm: line.outcome,
    });
    written.push(orderId);
  }
  const buyDecision: Record<string, unknown> = {
    pass: "decision",
    arrangementId: page.arrangementId,
    buyConfirmedBy: actor,
    buyConfirmedAt: asOf,
  };
  if (page.headerAtConfirm == null) {
    buyDecision.headerAtConfirm = page.header;
    buyDecision.cashAtConfirm = page.cashShown;
    buyDecision.totalAssetsAtConfirm = page.totalAssetsShown;
  }
  await postObject("/arrangements", buyDecision);
  return { arrangementId: page.arrangementId, orders: written };
}

export type ReportFillInput = {
  orderId: string;
  side: "买入" | "卖出";
  price: number;
  quantity: number;
  sessionDate: string;
  actor: string;
};

export async function reportFill(input: ReportFillInput): Promise<Record<string, unknown>> {
  if (!(input.price > 0) || !Number.isFinite(input.price)) throw new Error("成交价必须大于 0");
  if (!(input.quantity > 0) || !Number.isInteger(input.quantity)) throw new Error("成交股数必须是大于 0 的整数");
  if (!input.sessionDate) throw new Error("成交日不能空");

  const fillId = `${input.orderId}|fill`;
  try {
    const existing = await getObject(`/fills/${encodeURIComponent(fillId)}`);
    if (
      Number(existing.price) === input.price &&
      Number(existing.quantity) === input.quantity &&
      String(existing.sessionDate) === input.sessionDate &&
      String(existing.side) === input.side
    ) {
      const position = existing.positionId ? await recordFill(fillId) : null;
      return { fillId, positionId: existing.positionId, position, reused: true };
    }
    throw new Error("这笔委托已经有过不同的成交回报");
  } catch (error) {
    if (error instanceof Error && error.message.includes("已经有过")) throw error;
    if (!(error instanceof Error && /404|Not found/i.test(error.message))) throw error;
  }

  let accountId: string;
  let ticker: string;
  let orderQuantity: number;
  let contentStatus: string;
  let executionStatus: string;
  let orderPath: "/buy-orders" | "/sell-orders";

  if (input.side === "买入") {
    const order = await getObject(`/buy-orders/${encodeURIComponent(input.orderId)}`);
    contentStatus = String(order.contentStatus);
    executionStatus = String(order.executionStatus);
    orderQuantity = Number(order.quantity);
    const line = await getObject(`/buy-lines/${encodeURIComponent(String(order.buyLineId))}`);
    ticker = String(line.ticker);
    const arrangement = await getObject(`/arrangements/${encodeURIComponent(String(line.arrangementId))}`);
    accountId = String(arrangement.accountId);
    orderPath = "/buy-orders";
  } else {
    const order = await getObject(`/sell-orders/${encodeURIComponent(input.orderId)}`);
    contentStatus = String(order.contentStatus);
    executionStatus = String(order.executionStatus);
    orderQuantity = Number(order.quantity);
    const line = await getObject(`/sell-lines/${encodeURIComponent(String(order.sellLineId))}`);
    ticker = String(line.ticker);
    const arrangement = await getObject(`/arrangements/${encodeURIComponent(String(line.arrangementId))}`);
    accountId = String(arrangement.accountId);
    orderPath = "/sell-orders";
  }

  if (contentStatus !== "待执行") throw new Error("委托内容不是待执行，这次回报不发生");
  if (executionStatus === "被拒绝") throw new Error("委托已被拒绝，这次回报不发生");
  if (executionStatus === "已受理") throw new Error("委托已受理，请用同一笔成交回报的幂等提交");
  if (input.quantity > orderQuantity) throw new Error("成交股数不能多于委托股数");

  const positionId = `${accountId}|${ticker}`;
  let priorQuantity = 0;
  let priorSellable = 0;
  let priorEntry: unknown = null;
  try {
    const prior = await getObject(`/positions/${encodeURIComponent(positionId)}`);
    priorQuantity = Number(prior.quantity ?? 0);
    priorSellable = Number(prior.sellableQuantity ?? 0);
    priorEntry = prior.entryPrice;
  } catch {
    priorQuantity = 0;
    priorSellable = 0;
  }

  let quantity = priorQuantity;
  let sellableQuantity = priorSellable;
  if (input.side === "买入") {
    // 上次回报写完持仓、还没写成交时中断：股数已经在账上，不再加一遍。
    if (priorEntry == null && priorQuantity === input.quantity) {
      quantity = priorQuantity;
      sellableQuantity = priorSellable > 0 ? priorSellable : input.quantity;
    } else {
      quantity = priorQuantity + input.quantity;
      sellableQuantity = priorSellable + input.quantity;
    }
  } else {
    if (input.quantity > priorSellable) throw new Error("卖出成交不能多于可卖股数");
    quantity = priorQuantity - input.quantity;
    sellableQuantity = priorSellable - input.quantity;
  }

  await postObject("/positions", {
    pass: "book",
    positionId,
    accountId,
    ticker,
    quantity,
    sellableQuantity,
  });

  await postObject("/fills", {
    fillId,
    accountId,
    ticker,
    sessionDate: input.sessionDate,
    side: input.side,
    price: input.price,
    quantity: input.quantity,
    positionId,
  });

  await postObject(orderPath, {
    pass: "execution",
    orderId: input.orderId,
    executionStatus: "已受理",
    executionWrittenAt: new Date().toISOString(),
  });

  const position = await recordFill(fillId);

  const account = await getObject(`/accounts/${encodeURIComponent(accountId)}`);
  const notional = input.price * input.quantity;
  let availableCash = Number(account.availableCash ?? 0);
  if (input.side === "买入") {
    if (availableCash + 1e-9 < notional) throw new Error("可用资金不足，这次回报不发生");
    availableCash -= notional;
  } else {
    availableCash += notional;
  }

  const positions = await listObjects(`/positions?accountId=${encodeURIComponent(accountId)}`);
  let marketValue = 0;
  for (const row of positions) {
    const qty = Number(row.quantity ?? 0);
    if (!(qty > 0)) continue;
    const mark = Number(row.entryPrice ?? 0);
    if (Number.isFinite(mark)) marketValue += qty * mark;
  }
  const totalAssets = availableCash + marketValue;
  await postObject("/accounts", {
    pass: "snapshot",
    accountId,
    availableCash,
    totalAssets,
  });

  // 安排页上的展示资金跟账户快照对齐（仍是该交易日那一页，不改页首/决策）。
  try {
    const page = await currentArrangement(accountId, input.sessionDate);
    await postObject("/arrangements", {
      pass: "page",
      arrangementId: page.arrangementId,
      cashShown: availableCash,
      totalAssetsShown: totalAssets,
    });
  } catch {
    // 无当天安排时只滚账户
  }

  return {
    fillId,
    positionId,
    accountId,
    ticker,
    side: input.side,
    price: input.price,
    quantity: input.quantity,
    sessionDate: input.sessionDate,
    actor: input.actor,
    position,
    availableCash,
    totalAssets,
    reused: false,
  };
}
