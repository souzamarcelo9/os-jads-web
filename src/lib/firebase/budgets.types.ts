export type ServiceMode = "INTERNO" | "EXTERNO";

export type BudgetKind = "ANALISE" | "SERVICO";
export type BudgetPricing = "FECHADO" | "POR_HORA";
export type BudgetStatus = "RASCUNHO" | "ENVIADO" | "APROVADO" | "REPROVADO";

export type ApprovalInfo = {
  decidedAt: number;
  decidedByUid?: string | null; // usuário do seu sistema (interno)
  clientName?: string | null;   // nome de quem aprovou no cliente (opcional)
  note?: string | null;
};

export type BudgetItem = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number; // qty * unitPrice
};

export type HourRates = {
  techNormal: number;
  techExtra: number;
  auxNormal: number;
  auxExtra: number;

  techTravelNormal?: number | null;
  techTravelExtra?: number | null;
  auxTravelNormal?: number | null;
  auxTravelExtra?: number | null;
};

export type HourEntry = {
  id: string;
  date: string;     // YYYY-MM-DD
  start?: string;   // HH:mm
  end?: string;     // HH:mm

  techNormalHours: number;
  techExtraHours: number;
  auxNormalHours: number;
  auxExtraHours: number;

  techTravelNormalHours?: number;
  techTravelExtraHours?: number;
  auxTravelNormalHours?: number;
  auxTravelExtraHours?: number;

  rates: HourRates;
  rowTotal: number;
};

export type Budget = {
  id: string;
  workOrderId: string;

  kind: BudgetKind;       // ANALISE | SERVICO
  pricing: BudgetPricing; // FECHADO | POR_HORA
  status: BudgetStatus;

  title?: string | null;  // ex: "Orçamento Serviço Externo v2"
  currency: "BRL";

  createdAt: number;
  createdByUid: string;
  sentAt?: number;

  approval?: ApprovalInfo;

  // valores (calculados)
  subtotal: number;
  issPercent?: number; // ex 5
  issValue?: number;
  total: number;

  // FECHADO
  items?: Record<string, BudgetItem>;

  // POR_HORA
  hourEntries?: Record<string, HourEntry>;
  defaultRates?: HourRates | null;

  // versão (para orçamento “novo” pós análise)
  version?: number; // 1, 2, 3...
  validityDays?: number | null;   // ex: 7, 15, 30
  paymentTerms?: string | null;   // ex: "30 dias", "À vista", "Pix"
  deliveryTerms?: string | null;  // ex: "2 dias úteis", "Imediato"
  note?: string | null;

  decidedAt?: number | null;
  decidedByUid?: string | null;      // operador logado (interno)
  decidedByClientName?: string | null; // quem aprovou no cliente
  decisionNote?: string | null;      // observação
};

export type ReportStatus = "RASCUNHO" | "FINAL";

export type ServiceReport = {
  id: string;
  workOrderId: string;

  status: ReportStatus;

  createdAt: number;
  createdByUid: string;
  updatedAt: number;
  updatedByUid?: string;

  // conteúdo (vamos manter flexível no começo)
  title?: string;
  content: Record<string, unknown>; // depois tipamos melhor conforme o modelo do relatório
};
