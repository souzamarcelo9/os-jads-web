import { rtdb } from "./firebase"; // onde você exporta rtdb
import { ref, onValue, set } from "firebase/database";
import type { WorkOrderReport } from "./reports.types";

const TENANT_ID = "default";

export type ReportSummary = {
  workOrderId: string;
  updatedAt?: number;
  createdAt?: number;
  serviceDate?: string | null;
};

type ReportRTDBNode = {
  updatedAt?: number;
  createdAt?: number;
  serviceDate?: string | null;
};

function cleanUndefined<T>(obj: T): T {
  // remove undefined recursivo (RTDB não aceita undefined)
  return JSON.parse(JSON.stringify(obj));
}

export function subscribeReportByWorkOrderId(
  workOrderId: string,
  cb: (r: WorkOrderReport | null) => void
) {
  const r = ref(rtdb, `/tenants/${TENANT_ID}/reports/${workOrderId}`);
  return onValue(r, (snap) => cb(snap.exists() ? (snap.val() as WorkOrderReport) : null));
}

export function subscribeReportsIndex(
  cb: (m: Record<string, ReportSummary>) => void
) {
  const r = ref(rtdb, `/tenants/${TENANT_ID}/reports`);
  return onValue(r, (snap) => {
    const val = (snap.val() ?? {}) as Record<string, ReportRTDBNode>;

    const idx: Record<string, ReportSummary> = {};

    for (const [workOrderId, rep] of Object.entries(val)) {
      idx[workOrderId] = {
        workOrderId,
        updatedAt: rep.updatedAt,
        createdAt: rep.createdAt,
        serviceDate: rep.serviceDate ?? null,
      };
    }

    cb(idx);
  });
}

export async function upsertReport(report: WorkOrderReport) {
  const now = Date.now();
  const payload = cleanUndefined({
    ...report,
    updatedAt: now,
    // createdAt só se não existir - pode manter no front
  });

  const r = ref(rtdb, `/tenants/${TENANT_ID}/reports/${report.workOrderId}`);
  await set(r, payload);
}