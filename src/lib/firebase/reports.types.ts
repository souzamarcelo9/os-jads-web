export type ReportArea = "AUTOMACAO_NAVAL" | "HIDRAULICA_MOVEL" | "LAB_ELETRONICA" | "ATENDIMENTO_BORDO" | "OUTROS";
export type ReportServiceType =
  | "INSTALACAO"
  | "MANUT_PREVENTIVA"
  | "MANUT_CORRETIVA"
  | "INSPECAO_TECNICA"
  | "DIAGNOSTICO_TESTE"
  | "OUTROS";

export type ReportMaterialRow = {
  id: string;
  pn?: string | null;        // Código (P/N)
  sn?: string | null;        // Nº de Série (S/N)
  description?: string | null;
  installed?: boolean | null;
  forQuote?: boolean | null;
};

export type ReportHoursRow = {
  id: string;
  date?: string | null;   // "26/08/2025"
  start?: string | null;  // "08:00"
  end?: string | null;    // "13:00"
};

export type WorkOrderReport = {
  id: string;              // igual ao workOrderId (1 por OS)
  workOrderId: string;

  createdAt: number;
  updatedAt: number;
  createdByUid?: string | null;
  updatedByUid?: string | null;

  // Cabeçalho
  serviceDate?: string | null; // data do atendimento (texto)
  // Dados do atendimento
  vesselName?: string | null;      // Navio / Casco
  osNumber?: string | null;         // Nº OS (ou code)
  location?: string | null;         // Localização
  imo?: string | null;
  shipOwner?: string | null;        // Armador
  callSign?: string | null;
  technician?: string | null;

  // Identificação do equipamento
  equipmentName?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  serialLocation?: string | null;

  // Checkboxes
  area: Record<ReportArea, boolean>;
  areaOtherText?: string | null;

  serviceType: Record<ReportServiceType, boolean>;
  serviceTypeOtherText?: string | null;

  // Conteúdo (texto)
  servicesPerformed?: string | null;   // descrição principal (textarea grande)
  conclusion?: string | null;          // conclusão e recomendações
  generalObservations?: string | null; // observações gerais

  // Tabelas
  materials?: Record<string, ReportMaterialRow> | null;
  workedHours?: Record<string, ReportHoursRow> | null;

  // Termo aceite
  acceptanceRepresentative?: string | null;
  acceptanceRole?: string | null;
  acceptanceDate?: string | null;
  acceptanceSignature?: string | null; // pode ser texto, depois vira assinatura real se quiser
  acceptanceStamp?: string | null;
};