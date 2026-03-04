import { get, onValue, push, ref, set, update } from "firebase/database";
import { firebaseDb } from "./firebase";
import type { FinanceReceivable, FinanceReceivableStatus, PaymentMethod } from "./finance.types";
import type { Budget } from "./budgets.types";
import type { WorkOrder } from "./db";

const TENANT_ID = "default";

function now() {
  return Date.now();
}

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: unknown) {
  const s = typeof v === "string" ? v : "";
  return s.trim();
}

function cleanUndefined<T>(obj: T): T {
  // RTDB não aceita undefined em nenhum nível
  return JSON.parse(JSON.stringify(obj));
}

export function financeReceivableRef(id: string) {
  return ref(firebaseDb, `tenants/${TENANT_ID}/financeReceivables/${id}`);
}

export function financeIndexByWORef(workOrderId: string) {
  return ref(firebaseDb, `tenants/${TENANT_ID}/financeByWO/${workOrderId}`);
}

/**
 * Cria/atualiza um título financeiro idempotente (id = budgetId).
 * Ideal para ser chamado quando:
 * - orçamento APROVADO
 * - OS CONCLUIDO
 */
export async function upsertReceivableFromApprovedBudget(input: {
  workOrder: WorkOrder;
  budget: Budget; // deve estar APROVADO
  clientName?: string | null;
  vesselName?: string | null;
  equipmentName?: string | null;
}) {
  const { workOrder: wo, budget: b } = input;

  const id = b.id; // ✅ idempotente
  const bTotal = toNum(b.total);

  const title = safeStr(b.title) || (b.kind === "ANALISE" ? "Orçamento de Análise" : "Orçamento de Serviço");
  const description = `OS ${wo.code} • ${title}`;

  const base: FinanceReceivable = {
    id,
    workOrderId: wo.id,
    workOrderCode: wo.code,
    budgetId: b.id,

    clientId: wo.clientId,
    clientName: input.clientName ?? null,

    vesselId: wo.vesselId ?? null,
    vesselName: input.vesselName ?? null,

    equipmentId: wo.equipmentId ?? null,
    equipmentName: input.equipmentName ?? null,

    description,
    currency: "BRL",
    amount: bTotal,
    status: "PENDENTE",

    approvedAt: b.decidedAt ?? null,
    concludedAt: wo.status === "CONCLUIDO" ? wo.statusUpdatedAt : null,

    dueDate: null,

    paidAt: null,
    paidMethod: null,
    paidNote: null,

    createdAt: now(),
    updatedAt: now(),
  };

  // Se já existir, preserva dados de pagamento
  const snap = await get(financeReceivableRef(id));
  if (snap.exists()) {
    const prev = snap.val() as FinanceReceivable;
    const patch: Partial<FinanceReceivable> = {
      workOrderId: base.workOrderId,
      workOrderCode: base.workOrderCode,
      budgetId: base.budgetId,
      clientId: base.clientId,
      clientName: base.clientName,
      vesselId: base.vesselId,
      vesselName: base.vesselName,
      equipmentId: base.equipmentId,
      equipmentName: base.equipmentName,
      description: base.description,
      currency: base.currency,
      amount: base.amount,
      approvedAt: base.approvedAt,
      concludedAt: base.concludedAt,
      updatedAt: now(),
      // mantém status/pagamento se já foi pago/cancelado
      status: prev.status,
      paidAt: prev.paidAt ?? null,
      paidMethod: prev.paidMethod ?? null,
      paidNote: prev.paidNote ?? null,
    };
    await update(financeReceivableRef(id), cleanUndefined(patch));
  } else {
    await set(financeReceivableRef(id), cleanUndefined(base));
  }

  // index por OS
  await set(ref(firebaseDb, `tenants/${TENANT_ID}/financeByWO/${wo.id}/${id}`), true);

  return id;
}

export async function markReceivablePaid(input: {
  receivableId: string;
  paidAt?: number;
  method: PaymentMethod;
  note?: string | null;
}) {
  const patch: Partial<FinanceReceivable> = {
    status: "PAGO",
    paidAt: input.paidAt ?? now(),
    paidMethod: input.method,
    paidNote: input.note ?? null,
    updatedAt: now(),
  };

  await update(financeReceivableRef(input.receivableId), cleanUndefined(patch));
}

export async function cancelReceivable(input: { receivableId: string; note?: string | null }) {
  const patch: Partial<FinanceReceivable> = {
    status: "CANCELADO",
    paidNote: input.note ?? null,
    updatedAt: now(),
  };
  await update(financeReceivableRef(input.receivableId), cleanUndefined(patch));
}

/** Lista simples (carrega todos e filtra no front). */
export function subscribeReceivables(cb: (rows: FinanceReceivable[]) => void) {
  const r = ref(firebaseDb, `tenants/${TENANT_ID}/financeReceivables`);
  return onValue(r, (snap) => {
    const val = (snap.val() ?? {}) as Record<string, FinanceReceivable>;
    const arr = Object.values(val);
    // ordena: pendentes primeiro e mais recentes no topo
    arr.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    cb(arr);
  });
}

export function labelReceivableStatus(s: FinanceReceivableStatus) {
  switch (s) {
    case "PENDENTE":
      return { label: "Pendente", scheme: "orange" as const };
    case "PAGO":
      return { label: "Pago", scheme: "green" as const };
    case "CANCELADO":
      return { label: "Cancelado", scheme: "gray" as const };
    default:
      return { label: s, scheme: "gray" as const };
  }
}
