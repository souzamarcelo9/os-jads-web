export type FinanceReceivableStatus = "PENDENTE" | "PAGO" | "CANCELADO";

export type PaymentMethod =
  | "PIX"
  | "BOLETO"
  | "CARTAO"
  | "TRANSFERENCIA"
  | "DINHEIRO"
  | "OUTRO";

/**
 * Título simples (conta a receber) para fechar o fluxo:
 * OS concluída + Orçamento aprovado -> Financeiro
 */
export type FinanceReceivable = {
  /** usamos o budgetId como id (idempotente) */
  id: string;

  workOrderId: string;
  workOrderCode?: string | null;

  budgetId: string;

  clientId: string;
  clientName?: string | null;

  vesselId?: string | null;
  vesselName?: string | null;

  equipmentId?: string | null;
  equipmentName?: string | null;

  description: string;
  currency: "BRL";
  amount: number;

  status: FinanceReceivableStatus;

  approvedAt?: number | null;
  concludedAt?: number | null;

  dueDate?: string | null; // YYYY-MM-DD (opcional)

  paidAt?: number | null;
  paidMethod?: PaymentMethod | null;
  paidNote?: string | null;

  createdAt: number;
  updatedAt: number;
};

export type FinanceReceivableSummary = Pick<
  FinanceReceivable,
  | "id"
  | "workOrderId"
  | "workOrderCode"
  | "budgetId"
  | "clientName"
  | "amount"
  | "status"
  | "approvedAt"
  | "concludedAt"
  | "paidAt"
  | "updatedAt"
>;
