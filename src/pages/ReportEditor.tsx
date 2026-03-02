import {
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Stack,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";

//import type { WorkReport } from "../lib/firebase/reports.types";
//import { subscribeReportByWO, upsertReportForWO } from "../lib/firebase/reports.db";

import {
  subscribeClients,
  subscribeEquipment,
  subscribeVessels,
  subscribeWorkOrderById,
} from "../lib/firebase/db";

import type { Client, Vessel, Equipment, WorkOrder } from "../lib/firebase/db";
import { ReportPrintView } from "../components/reports/ReportPrintView";
import { useAuth } from "../contexts/AuthContext";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ReportEditorPage() {
  const { woId } = useParams<{ woId: string }>();
  const toast = useToast();
  const { user } = useAuth();

  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [report, setReport] = useState<WorkReport | null>(null);

  // form local (simples, sem RHF aqui)
  const [form, setForm] = useState<Omit<WorkReport, "id" | "workOrderId" | "createdAt" | "updatedAt">>({
    workOrderCode: null,
    serviceDate: todayISO(),
    location: "",
    imo: "",
    shipOwner: "",
    callSign: "",
    technician: user?.displayName || user?.email || "",

    vesselName: "",
    equipmentName: "",
    equipmentModel: "",
    equipmentSerial: "",

    reportedIssue: "",
    activities: "",
    conclusion: "",

    clientRepName: "",
    clientRepRole: "",
  });

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef:  printRef,
    documentTitle: wo?.code ? `RELATORIO-${wo.code}` : "RELATORIO",
  });

  useEffect(() => {
    if (!woId) return;

    const u1 = subscribeWorkOrderById(woId, setWo);
    const u2 = subscribeClients(setClients);
    const u3 = subscribeVessels(setVessels);
    const u4 = subscribeEquipment(setEquipment);
    const u5 = subscribeReportByWO(woId, setReport);

    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  }, [woId]);

  // Maps
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const vesselMap = useMemo(() => new Map(vessels.map((v) => [v.id, v])), [vessels]);
  const equipmentMap = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);

  const client = wo ? clientMap.get(wo.clientId) ?? null : null;
  const vessel = wo?.vesselId ? vesselMap.get(wo.vesselId) ?? null : null;
  const equipmentItem = wo?.equipmentId ? equipmentMap.get(wo.equipmentId) ?? null : null;

  // Se não existe report ainda, pré-preenche uma vez com dados da OS
  useEffect(() => {
    if (!woId || !wo) return;

    // se já existe report no RTDB, carrega no form
    if (report) {
        const { id, workOrderId, createdAt, updatedAt, ...rest } = report;
        void id; void workOrderId; void createdAt; void updatedAt;
        setForm(rest);
        return;
        }

    // senão existe, preenche defaults úteis
    setForm((prev) => ({
      ...prev,
      workOrderCode: wo.code ?? null,
      technician: prev.technician || user?.displayName || user?.email || "",
      vesselName: prev.vesselName || (vessel?.name ?? ""),
      equipmentName: prev.equipmentName || (equipmentItem?.name ?? ""),
      reportedIssue: prev.reportedIssue || wo.reportedDefect || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [woId, wo, report, vessel?.name, equipmentItem?.name]);

  async function save() {
    if (!woId || !wo) return;

    try {
      await upsertReportForWO(woId, {
        ...form,
        workOrderCode: wo.code ?? null,
      });

      toast({ status: "success", title: "Relatório salvo" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ status: "error", title: "Erro ao salvar", description: msg });
    }
  }

  if (!woId) {
    return (
      <Card><CardBody><Heading size="md">Relatório</Heading></CardBody></Card>
    );
  }

  if (!wo) {
    return (
      <Card>
        <CardBody>
          <Heading size="md">OS não encontrada</Heading>
        </CardBody>
      </Card>
    );
  }

  return (
    <Stack spacing={4}>
      {/* hidden print area */}
      <Box position="absolute" left="-99999px" top={0}>
        <Box ref={printRef}>
          <ReportPrintView
            report={{
              id: woId,
              workOrderId: woId,
              createdAt: report?.createdAt ?? Date.now(),
              updatedAt: Date.now(),
              ...form,
            }}
            workOrder={wo}
            client={client}
            vessel={vessel}
            equipment={equipmentItem}
          />
        </Box>
      </Box>

      <HStack justify="space-between">
        <Box>
          <Heading size="md">Relatório • {wo.code}</Heading>
        </Box>

        <HStack>
          <Button variant="outline" onClick={handlePrint}>
            Baixar / Imprimir (PDF)
          </Button>
          <Button colorScheme="brand" onClick={save}>
            Salvar
          </Button>
        </HStack>
      </HStack>

      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Heading size="sm">Dados do atendimento</Heading>

            <HStack spacing={4}>
              <FormControl>
                <FormLabel>Data do atendimento</FormLabel>
                <Input
                  type="date"
                  value={form.serviceDate ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, serviceDate: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Técnico</FormLabel>
                <Input
                  value={form.technician ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, technician: e.target.value }))}
                />
              </FormControl>
            </HStack>

            <HStack spacing={4}>
              <FormControl>
                <FormLabel>Navio / Casco</FormLabel>
                <Input
                  value={form.vesselName ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, vesselName: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Localização</FormLabel>
                <Input
                  value={form.location ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                />
              </FormControl>
            </HStack>

            <HStack spacing={4}>
              <FormControl>
                <FormLabel>IMO</FormLabel>
                <Input
                  value={form.imo ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, imo: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Armador</FormLabel>
                <Input
                  value={form.shipOwner ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, shipOwner: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Call Sign</FormLabel>
                <Input
                  value={form.callSign ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, callSign: e.target.value }))}
                />
              </FormControl>
            </HStack>
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Heading size="sm">Identificação do equipamento</Heading>

            <HStack spacing={4}>
              <FormControl>
                <FormLabel>Equipamento</FormLabel>
                <Input
                  value={form.equipmentName ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, equipmentName: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Modelo</FormLabel>
                <Input
                  value={form.equipmentModel ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, equipmentModel: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Série</FormLabel>
                <Input
                  value={form.equipmentSerial ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, equipmentSerial: e.target.value }))}
                />
              </FormControl>
            </HStack>
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Heading size="sm">Relato</Heading>

            <FormControl>
              <FormLabel>Defeito / solicitação</FormLabel>
              <Textarea
                rows={4}
                value={form.reportedIssue ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, reportedIssue: e.target.value }))}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Atividades realizadas</FormLabel>
              <Textarea
                rows={8}
                value={form.activities ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, activities: e.target.value }))}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Conclusão / recomendações</FormLabel>
              <Textarea
                rows={6}
                value={form.conclusion ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, conclusion: e.target.value }))}
              />
            </FormControl>
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Heading size="sm">Termo de aceite</Heading>

            <HStack spacing={4}>
              <FormControl>
                <FormLabel>Nome do representante</FormLabel>
                <Input
                  value={form.clientRepName ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, clientRepName: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Cargo</FormLabel>
                <Input
                  value={form.clientRepRole ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, clientRepRole: e.target.value }))}
                />
              </FormControl>
            </HStack>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
