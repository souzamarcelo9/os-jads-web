import { ref, set, push, update, onValue, off, get, remove } from "firebase/database";
import { firebaseDb } from "./firebase";
import type { Budget, BudgetItem, BudgetKind, BudgetPricing, BudgetStatus, HourEntry, HourRates, ServiceReport } from "./budgets.types";
import type { DataSnapshot } from "firebase/database";
import { auth, rtdb} from "./firebase";
const TENANT_ID = "default";


// helpers
function now() {
  return Date.now();
}
function asNum(n: unknown) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRates(r?: Partial<HourRates> | null): HourRates {
  const base: HourRates = {
    techNormal: toNum(r?.techNormal),
    techExtra: toNum(r?.techExtra),
    auxNormal: toNum(r?.auxNormal),
    auxExtra: toNum(r?.auxExtra),
    techTravelNormal: r?.techTravelNormal,
    techTravelExtra: r?.techTravelExtra,
    auxTravelNormal: r?.auxTravelNormal,
    auxTravelExtra: r?.auxTravelExtra,
  };

  const asTravel = (v: unknown) => {
    if (v == null) return null;
    const n = toNum(v);
    return n > 0 ? n : null; // 0/negativo => "não definido"
  };

  return {
    techNormal: base.techNormal,
    techExtra: base.techExtra,
    auxNormal: base.auxNormal,
    auxExtra: base.auxExtra,
    techTravelNormal: asTravel(base.techTravelNormal) == null ? base.techNormal : asTravel(base.techTravelNormal)!,
    techTravelExtra: asTravel(base.techTravelExtra) == null ? base.techExtra : asTravel(base.techTravelExtra)!,
    auxTravelNormal: asTravel(base.auxTravelNormal) == null ? base.auxNormal : asTravel(base.auxTravelNormal)!,
    auxTravelExtra: asTravel(base.auxTravelExtra) == null ? base.auxExtra : asTravel(base.auxTravelExtra)!,
  };
}

function calcRowTotal(e: Omit<HourEntry, "rowTotal">) {
  const r = normalizeRates(e.rates);
  return (
    toNum(e.techNormalHours) * toNum(r.techNormal) +
    toNum(e.techExtraHours) * toNum(r.techExtra) +
    toNum(e.auxNormalHours) * toNum(r.auxNormal) +
    toNum(e.auxExtraHours) * toNum(r.auxExtra) +
    toNum(e.techTravelNormalHours) * toNum(r.techTravelNormal) +
    toNum(e.techTravelExtraHours) * toNum(r.techTravelExtra) +
    toNum(e.auxTravelNormalHours) * toNum(r.auxTravelNormal) +
    toNum(e.auxTravelExtraHours) * toNum(r.auxTravelExtra)
  );
}



// ---------- Budgets CRUD ----------

export async function createBudget(input: {
  workOrderId: string;
  kind: BudgetKind;          // ANALISE | SERVICO
  pricing: BudgetPricing;    // FECHADO | POR_HORA
  createdByUid: string;
  title?: string;
  issPercent?: number;       // ex: 5
  defaultRates?: HourRates | null;
  version?: number;
}): Promise<Budget> {
  const id = push(ref(firebaseDb, `tenants/${TENANT_ID}/budgets`)).key!;
  const issPercent = input.issPercent ?? 5;

  const budget: Budget = {
    id,
    workOrderId: input.workOrderId,
    kind: input.kind,
    pricing: input.pricing,
    status: "RASCUNHO",
    title: input.title ?? null,
    currency: "BRL",
    createdAt: now(),
    createdByUid: input.createdByUid,
    subtotal: 0,
    issPercent,
    issValue: 0,
    total: 0,
    defaultRates: input.defaultRates ?? null,
    version: input.version ?? 1,
  };

  // salva orçamento
  await set(ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${id}`), budget);
  // index por OS
  await set(ref(firebaseDb, `tenants/${TENANT_ID}/workOrderBudgets/${input.workOrderId}/${id}`), true);

  return budget;
}

export function subscribeBudgetsByWorkOrder(
  workOrderId: string,
  cb: (budgets: Budget[]) => void
) {
  const idxRef = ref(firebaseDb, `tenants/${TENANT_ID}/workOrderBudgets/${workOrderId}`);

  const handler = async () => {
    const snap = await get(idxRef);
    const ids = snap.exists() ? Object.keys(snap.val() as Record<string, true>) : [];
    if (ids.length === 0) return cb([]);

    // carrega budgets em paralelo
    const budgets = await Promise.all(
      ids.map(async (id) => {
        const bSnap = await get(ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${id}`));
        return (bSnap.exists() ? (bSnap.val() as Budget) : null);
      })
    );

    cb(budgets.filter(Boolean) as Budget[]);
  };

  onValue(idxRef, handler);
  return () => off(idxRef, "value", handler);
}

export async function setBudgetStatus(budgetId: string, status: BudgetStatus) {
  await update(ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budgetId}`), {
    status,
    ...(status === "ENVIADO" ? { sentAt: now() } : {}),
  });
}

export async function approveBudget(input: {
  budgetId: string;
  clientName?: string | null;
  note?: string | null;
}) {
  const uid = auth.currentUser?.uid ?? null;
  const now = Date.now();

  const patch: Partial<Budget> = {
    status: "APROVADO",
    decidedAt: now,
    decidedByUid: uid,
    decidedByClientName: input.clientName ?? null,
    decisionNote: input.note ?? null,
  };

  //await update(ref(rtdb, `/budgets/${input.budgetId}`), patch);
  await update(ref(rtdb, `/tenants/${TENANT_ID}/budgets/${input.budgetId}`), patch);
}

export async function rejectBudget(input: {
  budgetId: string;
  clientName?: string | null;
  note?: string | null;
}) {
  const uid = auth.currentUser?.uid ?? null;
  const now = Date.now();

  const patch: Partial<Budget> = {
    status: "REPROVADO",
    decidedAt: now,
    decidedByUid: uid,
    decidedByClientName: input.clientName ?? null,
    decisionNote: input.note ?? null,
  };
  
  await update(ref(rtdb, `/tenants/${TENANT_ID}/budgets/${input.budgetId}`), patch);
}

export async function deleteBudget(budget: Budget) {
  // remove budget
  await remove(ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budget.id}`));
  // remove index
  await remove(ref(firebaseDb, `tenants/${TENANT_ID}/workOrderBudgets/${budget.workOrderId}/${budget.id}`));
}

// ---------- Itens (FECHADO) ----------

export async function upsertBudgetItem(budgetId: string, item: Omit<BudgetItem, "total"> & { total?: number }) {
  const total = item.total ?? asNum(item.qty) * asNum(item.unitPrice);

  await set(ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budgetId}/items/${item.id}`), {
    ...item,
    total,
  } satisfies BudgetItem);

  await recomputeBudgetTotals(budgetId);
}

export async function removeBudgetItem(budgetId: string, itemId: string) {
  await remove(ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budgetId}/items/${itemId}`));
  await recomputeBudgetTotals(budgetId);
}

// ---------- Horas (POR_HORA) ----------

export async function upsertHourEntry(budgetId: string, entry: HourEntry) {
  const eRef = ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budgetId}/hourEntries/${entry.id}`);

  // garante consistência mesmo se o client mandar taxas antigas (ex.: deslocamento = 0)
  const normalizedRates = normalizeRates(entry.rates);
  const nextBase: Omit<HourEntry, "rowTotal"> = { ...entry, rates: normalizedRates };
  const rowTotal = calcRowTotal(nextBase);

  await set(eRef, { ...nextBase, rowTotal });

  // ✅ IMPORTANTÍSSIMO: recalcula subtotal/ISS/total no budget
  await recomputeBudgetTotals(budgetId);
}


export async function removeHourEntry(budgetId: string, entryId: string) {
  const eRef = ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budgetId}/hourEntries/${entryId}`);
  await remove(eRef);

  // ✅ IMPORTANTÍSSIMO: recalcula subtotal/ISS/total no budget
  await recomputeBudgetTotals(budgetId);
}

// ---------- Totais ----------

export async function recomputeBudgetTotals(budgetId: string) {
  const bRef = ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budgetId}`);
  const snap = await get(bRef);
  if (!snap.exists()) return;

  const b = snap.val() as Budget;

  let subtotal = 0;

  if (b.pricing === "FECHADO") {
    const items: BudgetItem[] = b.items ? Object.values(b.items) : [];
    subtotal = items.reduce((acc, it) => acc + asNum(it.total), 0);
    } else {
    const entriesObj = b.hourEntries ?? {};
    const entries: HourEntry[] = Object.values(entriesObj);

    // Recalcula no servidor para garantir que deslocamento herde taxas e some nos totais
    subtotal = 0;

    const updates: Record<string, any> = {};
    for (const e of entries) {
      const normalizedRates = normalizeRates(e.rates);
      const nextBase: Omit<HourEntry, "rowTotal"> = { ...e, rates: normalizedRates };
      const rowTotal = calcRowTotal(nextBase);
      subtotal += asNum(rowTotal);

      // atualiza a linha se necessário (corrige dados antigos onde deslocamento=0)
      if (asNum(e.rowTotal) !== asNum(rowTotal)) {
        updates[`hourEntries/${e.id}/rowTotal`] = rowTotal;
      }
      // se houver travel 0 gravado, normalizeRates vai "corrigir" (opcional mas recomendado)
      const hadTravelZero =
        (e.rates as any)?.techTravelNormal === 0 ||
        (e.rates as any)?.techTravelExtra === 0 ||
        (e.rates as any)?.auxTravelNormal === 0 ||
        (e.rates as any)?.auxTravelExtra === 0;

      if (hadTravelZero) {
        updates[`hourEntries/${e.id}/rates`] = normalizedRates;
      }
    }

    if (Object.keys(updates).length) {
      await update(bRef, updates);
    }
  }

  const issPercent = asNum(b.issPercent ?? 0);
  const issValue = Math.round(subtotal * (issPercent / 100) * 100) / 100;
  const total = Math.round((subtotal + issValue) * 100) / 100;

  await update(bRef, { subtotal, issPercent, issValue, total });
}

/* export async function recomputeBudgetTotals(budgetId: string) {
  const bRef = ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budgetId}`);
  const snap = await get(bRef);
  const b = snap.val() as Budget | null;
  if (!b) return;

  const subtotal = sumHoursSubtotal(b);
  const issPercent = b.issPercent ?? 0;
  const issValue = +(subtotal * (issPercent / 100)).toFixed(2);
  const total = +(subtotal + issValue).toFixed(2);

  await update(bRef, { subtotal, issValue, total });
} */

// ---------- Reports (relatório final) ----------

export async function createReport(input: {
  workOrderId: string;
  createdByUid: string;
  title?: string;
}): Promise<ServiceReport> {
  const id = push(ref(firebaseDb, `tenants/${TENANT_ID}/reports`)).key!;

  const report: ServiceReport = {
    id,
    workOrderId: input.workOrderId,
    status: "RASCUNHO",
    createdAt: now(),
    createdByUid: input.createdByUid,
    updatedAt: now(),
    updatedByUid: input.createdByUid,
    title: input.title ?? "Relatório de Serviço",
    content: {},
  };

  await set(ref(firebaseDb, `tenants/${TENANT_ID}/reports/${id}`), report);
  await set(ref(firebaseDb, `tenants/${TENANT_ID}/workOrderReports/${input.workOrderId}/${id}`), true);

  return report;
}

export async function updateReport(reportId: string, patch: Partial<ServiceReport>) {
  await update(ref(firebaseDb, `tenants/${TENANT_ID}/reports/${reportId}`), {
    ...patch,
    updatedAt: now(),
  });
}

export function subscribeReportsByWorkOrder(workOrderId: string, cb: (reports: ServiceReport[]) => void) {
  const idxRef = ref(firebaseDb, `tenants/${TENANT_ID}/workOrderReports/${workOrderId}`);

  const handler = async () => {
    const snap = await get(idxRef);
    const ids = snap.exists() ? Object.keys(snap.val() as Record<string, true>) : [];
    if (ids.length === 0) return cb([]);

    const reports = await Promise.all(
      ids.map(async (id) => {
        const rSnap = await get(ref(firebaseDb, `tenants/${TENANT_ID}/reports/${id}`));
        return rSnap.exists() ? (rSnap.val() as ServiceReport) : null;
      })
    );

    cb(reports.filter(Boolean) as ServiceReport[]);
  };

  onValue(idxRef, handler);
  return () => off(idxRef, "value", handler);
}

export async function deleteReport(report: ServiceReport) {
  await remove(ref(firebaseDb, `tenants/${TENANT_ID}/reports/${report.id}`));
  await remove(ref(firebaseDb, `tenants/${TENANT_ID}/workOrderReports/${report.workOrderId}/${report.id}`));
}

export function subscribeBudgetById(budgetId: string, cb: (b: Budget | null) => void) {
  const bRef = ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budgetId}`);

  const handler = (snap: DataSnapshot) => {
  cb(snap.exists() ? (snap.val() as Budget) : null);
};
  onValue(bRef, handler);
  return () => off(bRef, "value", handler);
}

/**
 * "Enviar para o cliente" = mudar para ENVIADO e gravar sentAt
 */
export async function sendBudgetToClient(budgetId: string) {
  await update(ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budgetId}`), {
    status: "ENVIADO",
    sentAt: Date.now(),
  });
}
