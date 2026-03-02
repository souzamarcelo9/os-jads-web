import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Input,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  Checkbox,
  useToast,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";

// ✅ Ajuste para os seus caminhos
import {
  subscribeWorkOrderById,
  subscribeClients,
  subscribeVessels,
  subscribeEquipment,
  type WorkOrder,
  type Client,
  type Vessel,
  type Equipment,
} from "../lib/firebase/db";

// ✅ Ajuste para os seus caminhos
import {
  subscribeReportByWorkOrderId,
  upsertReport,
} from "../lib/firebase/reports.db";

// ✅ Ajuste para os seus caminhos
import type {
  WorkOrderReport,
  ReportMaterialRow,
  ReportHoursRow,
  ReportArea,
  ReportServiceType,
} from "../lib/firebase/reports.types";

type WorkOrderView = WorkOrder & {
  code?: string;
  clientId?: string;
  vesselId?: string;
  equipmentId?: string;
  reportedDefect?: string;
};

const LOGO_SRC = `${import.meta.env.BASE_URL}godwrites-logo.jpg`;

function uid() {
  // Node 18+/Browsers: crypto.randomUUID
  // fallback simples
  
  return (globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(16).slice(2)}`);
}

function safe(s?: string | null) {
  return s?.trim() ? s : "";
}

function cleanUndefined<T>(obj: T): T {
  // RTDB não aceita undefined em nenhum nível
  return JSON.parse(JSON.stringify(obj));
}

function nowDateBR() {
  return new Date().toLocaleDateString("pt-BR");
}

function isEmpty(v: unknown) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

const AREA_OPTIONS: { key: ReportArea; label: string }[] = [
  { key: "AUTOMACAO_NAVAL", label: "Automação Naval" },
  { key: "HIDRAULICA_MOVEL", label: "Hidráulica Móvel" },
  { key: "LAB_ELETRONICA", label: "Lab. Eletrônica" },
  { key: "ATENDIMENTO_BORDO", label: "Atendimento a bordo" },
  { key: "OUTROS", label: "Outros" },
];

const SERVICE_TYPE_OPTIONS: { key: ReportServiceType; label: string }[] = [
  { key: "INSTALACAO", label: "Instalação" },
  { key: "MANUT_PREVENTIVA", label: "Manutenção Preventiva" },
  { key: "MANUT_CORRETIVA", label: "Manutenção Corretiva" },
  { key: "INSPECAO_TECNICA", label: "Inspeção Técnica" },
  { key: "DIAGNOSTICO_TESTE", label: "Diagnóstico / Teste" },
  { key: "OUTROS", label: "Outros" },
];


function buildEmptyReport(workOrderId: string, wo?: WorkOrder | null): WorkOrderReport {
  const baseArea = Object.fromEntries(AREA_OPTIONS.map((o) => [o.key, false])) as WorkOrderReport["area"];
  const baseServiceType = Object.fromEntries(SERVICE_TYPE_OPTIONS.map((o) => [o.key, false])) as WorkOrderReport["serviceType"];

  return {
    id: workOrderId,
    workOrderId,
    createdAt: Date.now(),
    updatedAt: Date.now(),

    serviceDate: nowDateBR(),

    vesselName: wo?.code ? null : null, // aqui é melhor deixar vazio e preencher pelo useEffect
    osNumber: wo?.code ? null : workOrderId,
    location: null,
    imo: null,
    shipOwner: null,
    callSign: null,
    technician: null,

    equipmentName: null,
    model: null,
    serialNumber: null,
    serialLocation: null,

    area: baseArea,
    areaOtherText: null,

    serviceType: baseServiceType,
    serviceTypeOtherText: null,

    servicesPerformed: null,
    conclusion: null,
    generalObservations: null,

    materials: null,
    workedHours: null,

    acceptanceRepresentative: null,
    acceptanceRole: null,
    acceptanceDate: null,
    acceptanceSignature: null,
    acceptanceStamp: null,
  };
}

function mapToArray<T extends { id: string }>(rec?: Record<string, T> | null): T[] {
  return rec ? Object.values(rec) : [];
}
function arrayToMap<T extends { id: string }>(arr: T[]): Record<string, T> {
  return Object.fromEntries(arr.map((x) => [x.id, x]));
}

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

export default function ReportDetailsPage() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const toast = useToast();

  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [report, setReport] = useState<WorkOrderReport | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // tabelas editáveis
  const [materials, setMaterials] = useState<ReportMaterialRow[]>([]);
  const [hoursRows, setHoursRows] = useState<ReportHoursRow[]>([]);

  const woV = wo as WorkOrderView | null;
  //const eqV = equipmentItem as EquipmentView | null;

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: workOrderId ? `Relatorio-${workOrderId}` : "Relatorio",
    onBeforePrint: async () => {
      await preloadImage(LOGO_SRC);
    },
  });

  // lookups OS (igual você já faz no budget)
  useEffect(() => {
    const u1 = subscribeClients(setClients);
    const u2 = subscribeVessels(setVessels);
    const u3 = subscribeEquipment(setEquipment);
    return () => { u1(); u2(); u3(); };
  }, []);

  useEffect(() => {
    if (!workOrderId) return;
    const unsubWO = subscribeWorkOrderById(workOrderId, setWo);
    return () => unsubWO();
  }, [workOrderId]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const vesselMap = useMemo(() => new Map(vessels.map((v) => [v.id, v])), [vessels]);
  const equipmentMap = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);

  const client = woV?.clientId ? (clientMap.get(woV.clientId) ?? null) : null;
  const vessel = woV?.vesselId ? (vesselMap.get(woV.vesselId) ?? null) : null;
  const equipmentItem = woV?.equipmentId ? (equipmentMap.get(woV.equipmentId) ?? null) : null;
  
  useEffect(() => {
  if (!report || !wo) return;

  // só preenche se estiver vazio (não sobrescreve o que o usuário já digitou)
  setReport((prev) => {
    if (!prev) return prev;

    const next = { ...prev };

    // Atendimento
    if (isEmpty(next.osNumber)) next.osNumber = wo.code ?? prev.workOrderId;
    if (isEmpty(next.vesselName)) next.vesselName = vessel?.name ?? "";
    if (isEmpty(next.shipOwner)) next.shipOwner = client?.name ?? "";
    if (isEmpty(next.serviceDate)) next.serviceDate = new Date().toLocaleDateString("pt-BR");

    // Equipamento
    if (isEmpty(next.equipmentName)) next.equipmentName = equipmentItem?.name ?? "";
    if (isEmpty(next.model)) next.model = equipmentItem?.model ?? "";
    if (isEmpty(next.serialNumber)) next.serialNumber = equipmentItem?.serial ?? "";

    // Opcional: já puxar o defeito para a descrição do serviço (se estiver vazio)
    if (isEmpty(next.servicesPerformed) && !isEmpty(wo.reportedDefect)) {
      next.servicesPerformed = `Defeito relatado: ${wo.reportedDefect}`;
    }

    // se não mudou nada, evita re-render à toa
    const changed = JSON.stringify(next) !== JSON.stringify(prev);
    return changed ? { ...next, updatedAt: Date.now() } : prev;
  });
  }, [report?.id, wo?.id, wo?.code, wo?.reportedDefect, client?.name, vessel?.name, equipmentItem?.name, equipmentItem?.model, equipmentItem?.serial]);

  // subscribe report (1 por OS)
  useEffect(() => {
    if (!workOrderId) return;
    const unsub = subscribeReportByWorkOrderId(workOrderId, (r) => {
      const next = r ?? buildEmptyReport(workOrderId, wo);
      setReport(next);
      setMaterials(mapToArray(next.materials));
      setHoursRows(mapToArray(next.workedHours));
    });
   return () => {
   if (typeof unsub === "function") {
    unsub();
  }
};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  // quando wo muda, opcionalmente preencher dados se vazios
  useEffect(() => {
    if (!report || !wo) return;
    setReport((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        vesselName: prev.vesselName ?? (vessel?.name ?? null),
        equipmentName: prev.equipmentName ?? (equipmentItem?.name ?? null),
        osNumber: prev.osNumber ?? (wo?.code ?? prev.workOrderId),
      };
    });
  }, [wo, vessel?.name, equipmentItem?.name]); // eslint-disable-line

  function setField<K extends keyof WorkOrderReport>(key: K, value: WorkOrderReport[K]) {
    setReport((prev) => (prev ? ({ ...prev, [key]: value, updatedAt: Date.now() }) : prev));
  }

  function toggleArea(key: ReportArea) {
    setReport((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        area: { ...prev.area, [key]: !prev.area[key] },
        updatedAt: Date.now(),
      };
    });
  }

  function toggleServiceType(key: ReportServiceType) {
    setReport((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        serviceType: { ...prev.serviceType, [key]: !prev.serviceType[key] },
        updatedAt: Date.now(),
      };
    });
  }

  function addMaterialRow() {
    setMaterials((prev) => [
      ...prev,
      { id: uid(), pn: "", sn: "", description: "", installed: false, forQuote: false },
    ]);
  }
  function removeMaterialRow(id: string) {
    setMaterials((prev) => prev.filter((x) => x.id !== id));
  }
  function updateMaterialRow(id: string, patch: Partial<ReportMaterialRow>) {
    setMaterials((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function addHoursRow() {
    setHoursRows((prev) => [
      ...prev,
      { id: uid(), date: "", start: "", end: "" },
    ]);
  }
  function removeHoursRow(id: string) {
    setHoursRows((prev) => prev.filter((x) => x.id !== id));
  }
  function updateHoursRow(id: string, patch: Partial<ReportHoursRow>) {
    setHoursRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function onSave() {
    if (!report || !workOrderId) return;

    setIsSaving(true);
    try {
      const payload: WorkOrderReport = cleanUndefined({
        ...report,
        workOrderId,
        id: workOrderId,
        vesselName: safe(report.vesselName) || (vessel?.name ?? null),
        equipmentName: safe(report.equipmentName) || (equipmentItem?.name ?? null),
        osNumber: safe(report.osNumber) || (wo?.code ?? workOrderId),

        materials: materials.length ? arrayToMap(materials) : null,
        workedHours: hoursRows.length ? arrayToMap(hoursRows) : null,

        updatedAt: Date.now(),
      });

      await upsertReport(payload);

      toast({ status: "success", title: "Relatório salvo" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ status: "error", title: "Erro ao salvar relatório", description: msg });
    }
    finally {
      setIsSaving(false);
    }
  }

  if (!workOrderId) {
    return (
      <Card>
        <CardBody>
          <Text>WorkOrderId inválido.</Text>
        </CardBody>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardBody>
          <Text>Carregando relatório...</Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Stack spacing={4}>
      {/* PRINT (hidden) */}
      <Box position="absolute" left="-99999px" top={0}>
        <Box ref={printRef}>
          <ReportPrintView
            report={report}
            workOrder={wo}
            client={client}
            vessel={vessel}
            equipment={equipmentItem}
            materials={materials}
            hoursRows={hoursRows}
          />
        </Box>
      </Box>

      {/* HEADER */}
      <Card>
        <CardBody>
          <HStack justify="space-between" align="start">
            <Box>
              <Heading size="md">Relatório (editar / imprimir)</Heading>
              <Text mt={2} color="gray.600">
                OS: {wo?.code ?? workOrderId} {client?.name ? `• Cliente: ${client.name}` : ""}
              </Text>

              <HStack mt={3} spacing={2}>
                <Badge colorScheme="blue">RELATÓRIO</Badge>
                <Badge variant="subtle">{report.serviceDate || "-"}</Badge>
              </HStack>
            </Box>

            <HStack>
              <Button onClick={onSave} colorScheme="brand" isLoading={isSaving}>
                Salvar
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                Imprimir / Baixar PDF
              </Button>
            </HStack>
          </HStack>
        </CardBody>
      </Card>

      {/* FORM */}
      <Card>
        <CardBody>
          <Stack spacing={6}>
            {/* DADOS DO ATENDIMENTO */}
            <SectionTitle title="Dados do Atendimento" />
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl>
                <FormLabel>Data do Atendimento</FormLabel>
                <Input value={report.serviceDate ?? ""} onChange={(e) => setField("serviceDate", e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Técnico</FormLabel>
                <Input value={report.technician ?? ""} onChange={(e) => setField("technician", e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Navio / Casco</FormLabel>
                <Input value={report.vesselName ?? ""} onChange={(e) => setField("vesselName", e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Nº OS</FormLabel>
                <Input value={report.osNumber ?? ""} onChange={(e) => setField("osNumber", e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Localização</FormLabel>
                <Input value={report.location ?? ""} onChange={(e) => setField("location", e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>IMO</FormLabel>
                <Input value={report.imo ?? ""} onChange={(e) => setField("imo", e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Armador</FormLabel>
                <Input value={report.shipOwner ?? ""} onChange={(e) => setField("shipOwner", e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Call Sign</FormLabel>
                <Input value={report.callSign ?? ""} onChange={(e) => setField("callSign", e.target.value)} />
              </FormControl>
            </SimpleGrid>

            <Divider />

            {/* IDENTIFICAÇÃO DO EQUIPAMENTO */}
            <SectionTitle title="Identificação do Equipamento" />
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl>
                <FormLabel>Equipamento</FormLabel>
                <Input value={report.equipmentName ?? ""} onChange={(e) => setField("equipmentName", e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Modelo</FormLabel>
                <Input value={report.model ?? ""} onChange={(e) => setField("model", e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Nº de Série (S/N)</FormLabel>
                <Input value={report.serialNumber ?? ""} onChange={(e) => setField("serialNumber", e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Localização do S/N</FormLabel>
                <Input value={report.serialLocation ?? ""} onChange={(e) => setField("serialLocation", e.target.value)} />
              </FormControl>
            </SimpleGrid>

            <Divider />

            {/* ÁREA DE ATUAÇÃO */}
            <SectionTitle title="Área de Atuação" />
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={2}>
              {AREA_OPTIONS.map((o) => (
                <GridItem key={o.key}>
                  <Checkbox
                    isChecked={!!report.area?.[o.key]}
                    onChange={() => toggleArea(o.key)}
                  >
                    {o.label}
                  </Checkbox>
                </GridItem>
              ))}
            </Grid>

            {report.area?.OUTROS ? (
              <FormControl>
                <FormLabel>Outros (descreva)</FormLabel>
                <Input value={report.areaOtherText ?? ""} onChange={(e) => setField("areaOtherText", e.target.value)} />
              </FormControl>
            ) : null}

            <Divider />

            {/* TIPO DE SERVIÇO */}
            <SectionTitle title="Tipo de Serviço" />
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={2}>
              {SERVICE_TYPE_OPTIONS.map((o) => (
                <GridItem key={o.key}>
                  <Checkbox
                    isChecked={!!report.serviceType?.[o.key]}
                    onChange={() => toggleServiceType(o.key)}
                  >
                    {o.label}
                  </Checkbox>
                </GridItem>
              ))}
            </Grid>

            {report.serviceType?.OUTROS ? (
              <FormControl>
                <FormLabel>Outros (descreva)</FormLabel>
                <Input value={report.serviceTypeOtherText ?? ""} onChange={(e) => setField("serviceTypeOtherText", e.target.value)} />
              </FormControl>
            ) : null}

            <Divider />

            {/* TEXTOS */}
            <SectionTitle title="Descrição dos Serviços Realizados" />
            <Textarea
              minH="180px"
              value={report.servicesPerformed ?? ""}
              onChange={(e) => setField("servicesPerformed", e.target.value)}
              placeholder="Descreva detalhadamente os serviços realizados..."
            />

            <SectionTitle title="Conclusão e Recomendações" />
            <Textarea
              minH="140px"
              value={report.conclusion ?? ""}
              onChange={(e) => setField("conclusion", e.target.value)}
              placeholder="Conclusão, recomendações, próximos passos..."
            />

            <SectionTitle title="Observações Gerais" />
            <Textarea
              minH="110px"
              value={report.generalObservations ?? ""}
              onChange={(e) => setField("generalObservations", e.target.value)}
              placeholder="Observações adicionais..."
            />

            <Divider />

            {/* MATERIAIS */}
            <HStack justify="space-between">
              <SectionTitle title="Materiais Utilizados" noDivider />
              <Button leftIcon={<AddIcon />} onClick={addMaterialRow} variant="outline" size="sm">
                Adicionar linha
              </Button>
            </HStack>

            <Box border="1px solid" borderColor="gray.200" borderRadius="12px" overflow="hidden">
              <Table size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Código (P/N)</Th>
                    <Th>Nº Série (S/N)</Th>
                    <Th>Descrição</Th>
                    <Th textAlign="center">Instalado</Th>
                    <Th textAlign="center">Para orçamento</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {materials.length === 0 ? (
                    <Tr>
                      <Td colSpan={6}>
                        <Text color="gray.600">Nenhum material informado.</Text>
                      </Td>
                    </Tr>
                  ) : (
                    materials.map((m) => (
                      <Tr key={m.id}>
                        <Td>
                          <Input size="sm" value={m.pn ?? ""} onChange={(e) => updateMaterialRow(m.id, { pn: e.target.value })} />
                        </Td>
                        <Td>
                          <Input size="sm" value={m.sn ?? ""} onChange={(e) => updateMaterialRow(m.id, { sn: e.target.value })} />
                        </Td>
                        <Td>
                          <Input size="sm" value={m.description ?? ""} onChange={(e) => updateMaterialRow(m.id, { description: e.target.value })} />
                        </Td>
                        <Td textAlign="center">
                          <Checkbox
                            isChecked={!!m.installed}
                            onChange={(e) => updateMaterialRow(m.id, { installed: e.target.checked })}
                          />
                        </Td>
                        <Td textAlign="center">
                          <Checkbox
                            isChecked={!!m.forQuote}
                            onChange={(e) => updateMaterialRow(m.id, { forQuote: e.target.checked })}
                          />
                        </Td>
                        <Td textAlign="right">
                          <IconButton
                            aria-label="Remover"
                            icon={<DeleteIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMaterialRow(m.id)}
                          />
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Box>

            <Divider />

            {/* HORAS */}
            <HStack justify="space-between">
              <SectionTitle title="Demonstração Geral de Horas Trabalhadas" noDivider />
              <Button leftIcon={<AddIcon />} onClick={addHoursRow} variant="outline" size="sm">
                Adicionar linha
              </Button>
            </HStack>

            <Box border="1px solid" borderColor="gray.200" borderRadius="12px" overflow="hidden">
              <Table size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Data</Th>
                    <Th>Início</Th>
                    <Th>Fim</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {hoursRows.length === 0 ? (
                    <Tr>
                      <Td colSpan={4}>
                        <Text color="gray.600">Nenhuma linha informada.</Text>
                      </Td>
                    </Tr>
                  ) : (
                    hoursRows.map((h) => (
                      <Tr key={h.id}>
                        <Td>
                          <Input size="sm" value={h.date ?? ""} onChange={(e) => updateHoursRow(h.id, { date: e.target.value })} />
                        </Td>
                        <Td>
                          <Input size="sm" value={h.start ?? ""} onChange={(e) => updateHoursRow(h.id, { start: e.target.value })} />
                        </Td>
                        <Td>
                          <Input size="sm" value={h.end ?? ""} onChange={(e) => updateHoursRow(h.id, { end: e.target.value })} />
                        </Td>
                        <Td textAlign="right">
                          <IconButton
                            aria-label="Remover"
                            icon={<DeleteIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={() => removeHoursRow(h.id)}
                          />
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Box>

            <Divider />

            {/* TERMO ACEITE */}
            <SectionTitle title="Termo de Aceite do Cliente" />
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl>
                <FormLabel>Representante</FormLabel>
                <Input value={report.acceptanceRepresentative ?? ""} onChange={(e) => setField("acceptanceRepresentative", e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Cargo</FormLabel>
                <Input value={report.acceptanceRole ?? ""} onChange={(e) => setField("acceptanceRole", e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Data</FormLabel>
                <Input value={report.acceptanceDate ?? ""} onChange={(e) => setField("acceptanceDate", e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Carimbo</FormLabel>
                <Input value={report.acceptanceStamp ?? ""} onChange={(e) => setField("acceptanceStamp", e.target.value)} />
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel>Assinatura (texto)</FormLabel>
              <Input value={report.acceptanceSignature ?? ""} onChange={(e) => setField("acceptanceSignature", e.target.value)} />
            </FormControl>

            <Divider />

            <HStack justify="flex-end">
              <Button onClick={onSave} colorScheme="brand" isLoading={isSaving}>
                Salvar
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                Imprimir / Baixar PDF
              </Button>
            </HStack>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}

/** ---------------- PRINT VIEW (PDF) ---------------- */

function ReportPrintView(props: {
  report: WorkOrderReport;
  workOrder?: WorkOrder | null;
  client?: Client | null;
  vessel?: Vessel | null;
  equipment?: Equipment | null;
  materials: ReportMaterialRow[];
  hoursRows: ReportHoursRow[];
}) {
  const { report, client, materials, hoursRows } = props;

  return (
    <Box bg="white" color="black" fontSize="12px" p="16mm" width="210mm" minH="297mm">
      <style>
        {`
          @page { size: A4 portrait; margin: 12mm; }
          .box { border: 1px solid #1E3A8A; }
          .titlebar { background: #1E3A8A; color: white; font-weight: 800; padding: 6px 10px; }
          .section { border: 1px solid #CBD5E1; }
        `}
      </style>

      {/* Cabeçalho */}
      <HStack justify="space-between" align="start" mb={4}>
        <Box>
          <Box as="img" src={LOGO_SRC} alt="God Writes" style={{ height: "52px", objectFit: "contain" }} />
          <Text fontSize="11px" mt={1}>
            Rua Anibal Costa, 26, Rocha Miranda, Rio de Janeiro - RJ • CEP 21540-560
          </Text>
          <Text fontSize="11px">CNPJ: 50.456.368/0001-37 • Tel.: (21) 96486-780</Text>
          <Text fontSize="11px" color="#1E3A8A" textDecoration="underline">
            comercial@godwritesgw.com.br
          </Text>
        </Box>

        <Box textAlign="right">
          <Heading size="sm" color="#1E3A8A">RELATÓRIO DE SERVIÇO</Heading>
          <Text fontSize="11px">Data: <b>{report.serviceDate || "-"}</b></Text>
          <Text fontSize="11px">OS: <b>{report.osNumber || report.workOrderId}</b></Text>
        </Box>
      </HStack>

      {/* Dados do Atendimento */}
      <Box className="section" borderRadius="10px" overflow="hidden" mb={3}>
        <Box className="titlebar">DADOS DO ATENDIMENTO</Box>
        <Box p={3}>
          <SimpleGrid columns={2} spacing={2} fontSize="11px">
            <LineP label="Navio/Casco" value={report.vesselName} />
            <LineP label="Localização" value={report.location} />
            <LineP label="IMO" value={report.imo} />
            <LineP label="Armador" value={report.shipOwner || client?.name} />
            <LineP label="Call Sign" value={report.callSign} />
            <LineP label="Técnico" value={report.technician} />
          </SimpleGrid>
        </Box>
      </Box>

      {/* Identificação do Equipamento */}
      <Box className="section" borderRadius="10px" overflow="hidden" mb={3}>
        <Box className="titlebar">IDENTIFICAÇÃO DO EQUIPAMENTO</Box>
        <Box p={3}>
          <SimpleGrid columns={2} spacing={2} fontSize="11px">
            <LineP label="Equipamento" value={report.equipmentName} />
            <LineP label="Modelo" value={report.model} />
            <LineP label="Nº de Série (S/N)" value={report.serialNumber} />
            <LineP label="Localização do S/N" value={report.serialLocation} />
          </SimpleGrid>
        </Box>
      </Box>

      {/* Área / Tipo */}
      <SimpleGrid columns={2} spacing={3} mb={3}>
        <Box className="section" borderRadius="10px" overflow="hidden">
          <Box className="titlebar">ÁREA DE ATUAÇÃO</Box>
          <Box p={3} fontSize="11px">
            {AREA_OPTIONS.map((o) => (
              <Text key={o.key}>
                {report.area?.[o.key] ? "☑" : "☐"} {o.label}
              </Text>
            ))}
            {report.area?.OUTROS && report.areaOtherText ? (
              <Text mt={2}><b>Outros:</b> {report.areaOtherText}</Text>
            ) : null}
          </Box>
        </Box>

        <Box className="section" borderRadius="10px" overflow="hidden">
          <Box className="titlebar">TIPO DE SERVIÇO</Box>
          <Box p={3} fontSize="11px">
            {SERVICE_TYPE_OPTIONS.map((o) => (
              <Text key={o.key}>
                {report.serviceType?.[o.key] ? "☑" : "☐"} {o.label}
              </Text>
            ))}
            {report.serviceType?.OUTROS && report.serviceTypeOtherText ? (
              <Text mt={2}><b>Outros:</b> {report.serviceTypeOtherText}</Text>
            ) : null}
          </Box>
        </Box>
      </SimpleGrid>

      {/* Textos */}
      <Box className="section" borderRadius="10px" overflow="hidden" mb={3}>
        <Box className="titlebar">DESCRIÇÃO DOS SERVIÇOS REALIZADOS</Box>
        <Box p={3} fontSize="11px" whiteSpace="pre-wrap" minH="80px">
          {report.servicesPerformed || "-"}
        </Box>
      </Box>

      <Box className="section" borderRadius="10px" overflow="hidden" mb={3}>
        <Box className="titlebar">CONCLUSÃO E RECOMENDAÇÕES</Box>
        <Box p={3} fontSize="11px" whiteSpace="pre-wrap" minH="60px">
          {report.conclusion || "-"}
        </Box>
      </Box>

      {/* Materiais */}
      <Box className="section" borderRadius="10px" overflow="hidden" mb={3}>
        <Box className="titlebar">MATERIAIS UTILIZADOS</Box>
        <Box p={0}>
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th fontSize="10px">Código (P/N)</Th>
                <Th fontSize="10px">Nº Série (S/N)</Th>
                <Th fontSize="10px">Descrição</Th>
                <Th fontSize="10px" textAlign="center">Instalado</Th>
                <Th fontSize="10px" textAlign="center">Para orçamento</Th>
              </Tr>
            </Thead>
            <Tbody>
              {materials.length === 0 ? (
                <Tr><Td colSpan={5}><Text fontSize="11px" p={2} color="gray.600">-</Text></Td></Tr>
              ) : (
                materials.map((m) => (
                  <Tr key={m.id}>
                    <Td fontSize="10px">{m.pn || "-"}</Td>
                    <Td fontSize="10px">{m.sn || "-"}</Td>
                    <Td fontSize="10px">{m.description || "-"}</Td>
                    <Td fontSize="10px" textAlign="center">{m.installed ? "Sim" : "Não"}</Td>
                    <Td fontSize="10px" textAlign="center">{m.forQuote ? "Sim" : "Não"}</Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>

      {/* Horas */}
      <Box className="section" borderRadius="10px" overflow="hidden">
        <Box className="titlebar">DEMONSTRAÇÃO GERAL DE HORAS TRABALHADAS</Box>
        <Box p={0}>
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th fontSize="10px">Data</Th>
                <Th fontSize="10px">Início</Th>
                <Th fontSize="10px">Fim</Th>
              </Tr>
            </Thead>
            <Tbody>
              {hoursRows.length === 0 ? (
                <Tr><Td colSpan={3}><Text fontSize="11px" p={2} color="gray.600">-</Text></Td></Tr>
              ) : (
                hoursRows.map((h) => (
                  <Tr key={h.id}>
                    <Td fontSize="10px">{h.date || "-"}</Td>
                    <Td fontSize="10px">{h.start || "-"}</Td>
                    <Td fontSize="10px">{h.end || "-"}</Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>

      {/* Observações gerais */}
      <Box className="section" borderRadius="10px" overflow="hidden" mt={3}>
        <Box className="titlebar">OBSERVAÇÕES GERAIS</Box>
        <Box p={3} fontSize="11px" whiteSpace="pre-wrap" minH="45px">
          {report.generalObservations || "-"}
        </Box>
      </Box>

      {/* Quebra de página */}
      <Box sx={{ pageBreakBefore: "always" }} />

      {/* TERMO DE ACEITE */}
      <Heading size="sm" color="#1E3A8A" mb={2}>TERMO DE ACEITE DO CLIENTE</Heading>
      <Text fontSize="11px" mb={4}>
        Declaro que os serviços descritos neste relatório foram executados conforme informado e dou ciência/aceite.
      </Text>

      <SimpleGrid columns={2} spacing={4} fontSize="11px">
        <LineP label="Representante" value={report.acceptanceRepresentative} />
        <LineP label="Cargo" value={report.acceptanceRole} />
        <LineP label="Data" value={report.acceptanceDate} />
        <LineP label="Carimbo" value={report.acceptanceStamp} />
      </SimpleGrid>

      <Box mt={8}>
        <Box borderBottom="1px solid" borderColor="gray.600" height="28px" />
        <Text mt={2} fontWeight="800" fontSize="11px">Assinatura</Text>
        <Text fontSize="10px" color="gray.600">{report.acceptanceSignature || ""}</Text>
      </Box>

      <Text mt={8} fontSize="10px" color="gray.600">
        God Writes • Documento gerado pelo sistema • {new Date().toLocaleString("pt-BR")}
      </Text>
    </Box>
  );
}

function SectionTitle({ title, noDivider }: { title: string; noDivider?: boolean }) {
  return (
    <Box>
      <Text fontWeight="900" color="blue.800" mb={1}>
        {title}
      </Text>
      {noDivider ? null : <Divider />}
    </Box>
  );
}

function LineP({ label, value }: { label: string; value?: string | null }) {
  return (
    <HStack align="baseline" spacing={2}>
      <Text fontWeight="800" color="blue.800" minW="130px">{label}:</Text>
      <Text>{value?.trim() ? value : "-"}</Text>
    </HStack>
  );
}