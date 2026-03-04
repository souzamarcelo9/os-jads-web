import { ref, set, push, update, onValue, off, get, remove } from "firebase/database";
import type { DataSnapshot } from "firebase/database";

import { firebaseDb } from "./firebase";
import { auth, rtdb } from "./firebase";

import type {
  Budget,
  BudgetItem,
  BudgetKind,
  BudgetPricing,
  BudgetStatus,
  HourEntry,
  HourRates,
  ServiceReport,
} from "./budgets.types";
import type { WorkOrderReport, ReportHoursRow } from "./reports.types";

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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// aceita "YYYY-MM-DD" ou "DD/MM/YYYY" e devolve "YYYY-MM-DD" (ou "")
function normalizeDateISO(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return s;

  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (br) {
    const dd = Number(br[1]);
    const mm = Number(br[2]);
    const yyyy = Number(br[3]);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }

  return "";
}

// aceita "HH:MM" e devolve "HH:MM" (ou "")
function normalizeHHmm(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return "";
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return "";
  return `${pad2(hh)}:${pad2(mm)}`;
}

function hhmmToMinutes(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function isWeekend(dateISO: string) {
  // dateISO: YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!m) return false;
  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  const dow = d.getDay(); // 0=Sun,6=Sat
  return dow === 0 || dow === 6;
}

/**
 * Divide um intervalo em Normal vs Extra.
 * - Normal: seg-sex, entre 08:00 e 17:00
 * - Extra: fora disso + finais de semana + feriados
 *
 * Retorna horas decimais (ex: 1.5)
 */
function splitNormalExtra(
  dateISO: string,
  startHHmm: string,
  endHHmm: string,
  holidays?: Set<string>
) {
  const sMin = hhmmToMinutes(startHHmm);
  const eMin = hhmmToMinutes(endHHmm);
  if (sMin == null || eMin == null || eMin <= sMin) return { normalHours: 0, extraHours: 0 };

  const totalMin = eMin - sMin;

  const isHol = holidays?.has(dateISO) ?? false;
  if (isHol || isWeekend(dateISO)) {
    return { normalHours: 0, extraHours: +(totalMin / 60).toFixed(2) };
  }

  const NORMAL_START = 8 * 60; // 08:00
  const NORMAL_END = 17 * 60; // 17:00

  const overlapStart = Math.max(sMin, NORMAL_START);
  const overlapEnd = Math.min(eMin, NORMAL_END);

  const normalMin = Math.max(0, overlapEnd - overlapStart);
  const extraMin = totalMin - normalMin;

  return {
    normalHours: +(normalMin / 60).toFixed(2),
    extraHours: +(extraMin / 60).toFixed(2),
  };
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

  // ✅ REGRA: "Espera / à disposição" usa travel normal e é 50% da hora base (quando não definido)
  const techTravelNormalEffective =
    asTravel(base.techTravelNormal) == null ? base.techNormal * 0.5 : asTravel(base.techTravelNormal)!;
  const auxTravelNormalEffective =
    asTravel(base.auxTravelNormal) == null ? base.auxNormal * 0.5 : asTravel(base.auxTravelNormal)!;

  return {
    techNormal: base.techNormal,
    techExtra: base.techExtra,
    auxNormal: base.auxNormal,
    auxExtra: base.auxExtra,
    techTravelNormal: techTravelNormalEffective,
    techTravelExtra: asTravel(base.techTravelExtra) == null ? base.techExtra : asTravel(base.techTravelExtra)!,
    auxTravelNormal: auxTravelNormalEffective,
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

async function seedHourEntriesFromReportIfNeeded(budget: Budget) {
  // Apenas para orçamento POR_HORA
  if (budget.pricing !== "POR_HORA") return;

  // Novo modelo do seu sistema: reportId == workOrderId
  const reportRef = ref(firebaseDb, `tenants/${TENANT_ID}/reports/${budget.workOrderId}`);
  const snap = await get(reportRef);
  if (!snap.exists()) return;

  const report = snap.val() as WorkOrderReport;
  const rows: ReportHoursRow[] = report?.workedHours ? Object.values(report.workedHours) : [];
  if (!rows.length) return;

  // Se já existem hourEntries, não sobrescreve (idempotência)
  const budgetRef = ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budget.id}`);
  const bSnap = await get(budgetRef);
  if (bSnap.exists()) {
    const bNow = bSnap.val() as Budget;
    const existing = bNow.hourEntries ? Object.keys(bNow.hourEntries).length : 0;
    if (existing > 0) return;
  }

  // feriados (por enquanto vazio; fácil plugar depois via settings)
  const holidays = new Set<string>();

  const rates = normalizeRates(budget.defaultRates ?? null);

  // cria entradas (técnico) a partir do relatório
  for (const row of rows) {
    const dateISO = normalizeDateISO(row.date);
    const start = normalizeHHmm(row.start);
    const end = normalizeHHmm(row.end);
    if (!dateISO || !start || !end) continue;

    const { normalHours, extraHours } = splitNormalExtra(dateISO, start, end, holidays);

    const entryId = row.id || `${dateISO}_${start}_${end}`.replace(/[^0-9A-Za-z_]/g, "");

    const base: Omit<HourEntry, "rowTotal"> = {
      id: entryId,
      date: dateISO,
      start,
      end,

      techNormalHours: normalHours,
      techExtraHours: extraHours,
      auxNormalHours: 0,
      auxExtraHours: 0,

      techTravelNormalHours: 0,
      techTravelExtraHours: 0,
      auxTravelNormalHours: 0,
      auxTravelExtraHours: 0,

      rates,
    };

    const rowTotal = calcRowTotal(base);
    await set(ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budget.id}/hourEntries/${entryId}`), {
      ...base,
      rowTotal,
    });
  }

  await recomputeBudgetTotals(budget.id);
}

// ---------- Budgets CRUD ----------

export async function createBudget(input: {
  workOrderId: string;
  kind: BudgetKind; // ANALISE | SERVICO
  pricing: BudgetPricing; // FECHADO | POR_HORA
  createdByUid: string;
  title?: string;
  issPercent?: number; // ex: 5
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

  // ✅ Se for POR_HORA, tenta copiar as horas do relatório automaticamente (apenas se estiver vazio)
  await seedHourEntriesFromReportIfNeeded(budget);

  return budget;
}

export function subscribeBudgetsByWorkOrder(workOrderId: string, cb: (budgets: Budget[]) => void) {
  const idxRef = ref(firebaseDb, `tenants/${TENANT_ID}/workOrderBudgets/${workOrderId}`);

  const handler = async () => {
    const snap = await get(idxRef);
    const ids = snap.exists() ? Object.keys(snap.val() as Record<string, true>) : [];
    if (ids.length === 0) return cb([]);

    // carrega budgets em paralelo
    const budgets = await Promise.all(
      ids.map(async (id) => {
        const bSnap = await get(ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${id}`));
        return bSnap.exists() ? (bSnap.val() as Budget) : null;
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

export async function approveBudget(input: { budgetId: string; clientName?: string | null; note?: string | null }) {
  const uid = auth.currentUser?.uid ?? null;
  const nowTs = Date.now();

  const patch: Partial<Budget> = {
    status: "APROVADO",
    decidedAt: nowTs,
    decidedByUid: uid,
    decidedByClientName: input.clientName ?? null,
    decisionNote: input.note ?? null,
  };

  await update(ref(rtdb, `/tenants/${TENANT_ID}/budgets/${input.budgetId}`), patch);
}

export async function rejectBudget(input: { budgetId: string; clientName?: string | null; note?: string | null }) {
  const uid = auth.currentUser?.uid ?? null;
  const nowTs = Date.now();

  const patch: Partial<Budget> = {
    status: "REPROVADO",
    decidedAt: nowTs,
    decidedByUid: uid,
    decidedByClientName: input.clientName ?? null,
    decisionNote: input.note ?? null,
  };

  await update(ref(rtdb, `/tenants/${TENANT_ID}/budgets/${input.budgetId}`), patch);
}

export async function deleteBudget(budget: Budget) {
  await remove(ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budget.id}`));
  await remove(ref(firebaseDb, `tenants/${TENANT_ID}/workOrderBudgets/${budget.workOrderId}/${budget.id}`));
}

// ---------- Itens (FECHADO) ----------

export async function upsertBudgetItem(
  budgetId: string,
  item: Omit<BudgetItem, "total"> & { total?: number }
) {
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

  const normalizedRates = normalizeRates(entry.rates);
  const nextBase: Omit<HourEntry, "rowTotal"> = { ...entry, rates: normalizedRates };
  const rowTotal = calcRowTotal(nextBase);

  await set(eRef, { ...nextBase, rowTotal });
  await recomputeBudgetTotals(budgetId);
}

export async function removeHourEntry(budgetId: string, entryId: string) {
  const eRef = ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budgetId}/hourEntries/${entryId}`);
  await remove(eRef);
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

    subtotal = 0;

    const updates: Record<string, unknown> = {};
    for (const e of entries) {
      const normalizedRates = normalizeRates(e.rates);
      const nextBase: Omit<HourEntry, "rowTotal"> = { ...e, rates: normalizedRates };
      const rowTotal = calcRowTotal(nextBase);
      subtotal += asNum(rowTotal);

      if (asNum(e.rowTotal) !== asNum(rowTotal)) {
        updates[`hourEntries/${e.id}/rowTotal`] = rowTotal;
      }

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

// ---------- Reports (legado; manter se você ainda usa ServiceReport) ----------

export async function createReport(input: { workOrderId: string; createdByUid: string; title?: string }): Promise<ServiceReport> {
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

export async function sendBudgetToClient(budgetId: string) {
  await update(ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budgetId}`), {
    status: "ENVIADO",
    sentAt: Date.now(),
  });
}

/**
 * Sincroniza horas do relatório -> orçamento POR_HORA, SEM sobrescrever o que já existe.
 * Regra A: só cria linhas que não existem ainda.
 */
export async function syncBudgetHoursFromReport(budgetId: string, workOrderId: string) {
  // 1) carrega orçamento (precisamos das taxas)
  const budgetRef = ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budgetId}`);
  const budgetSnap = await get(budgetRef);
  if (!budgetSnap.exists()) return;

  const budget = budgetSnap.val() as Budget;
  if (budget.pricing !== "POR_HORA") return;

  // 2) carrega relatório
  const reportRef = ref(firebaseDb, `tenants/${TENANT_ID}/reports/${workOrderId}`);
  const reportSnap = await get(reportRef);
  if (!reportSnap.exists()) return;

  const report = reportSnap.val() as WorkOrderReport;
  if (!report.workedHours) return;

  const rows: ReportHoursRow[] = Object.values(report.workedHours);
  const holidays = new Set<string>(); // plugar depois

  const rates = normalizeRates(budget.defaultRates ?? null);

  for (const r of rows) {
    const dateISO = normalizeDateISO(r.date);
    const startHHmm = normalizeHHmm(r.start);
    const endHHmm = normalizeHHmm(r.end);
    if (!dateISO || !startHHmm || !endHHmm) continue;

    const entryId =
      `rep_${r.id || `${dateISO}_${startHHmm}_${endHHmm}`.replace(/[^0-9A-Za-z_]/g, "")}`;

    const entryRef = ref(firebaseDb, `tenants/${TENANT_ID}/budgets/${budgetId}/hourEntries/${entryId}`);
    const exists = await get(entryRef);

    // regra A: não sobrescrever se já existir
    if (exists.exists()) continue;

    const { normalHours, extraHours } = splitNormalExtra(dateISO, startHHmm, endHHmm, holidays);

    const base: Omit<HourEntry, "rowTotal"> = {
      id: entryId,
      date: dateISO || normalizeDateISO(report.serviceDate) || todayISO(),
      start: startHHmm,
      end: endHHmm,

      techNormalHours: normalHours,
      techExtraHours: extraHours,
      auxNormalHours: 0,
      auxExtraHours: 0,

      techTravelNormalHours: 0,
      techTravelExtraHours: 0,
      auxTravelNormalHours: 0,
      auxTravelExtraHours: 0,

      rates,
    };

    const rowTotal = calcRowTotal(base);
    await set(entryRef, { ...base, rowTotal });
  }

  await recomputeBudgetTotals(budgetId);
}
