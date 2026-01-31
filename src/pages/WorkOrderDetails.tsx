import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Select,
  Stack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {  
  changeWorkOrderStatus,
  subscribeClients,
  subscribeEquipment,
  subscribeVessels,
  subscribeWorkOrderById,
  subscribeWorkOrderHistory,
} from "../lib/firebase/db";

import type  {
  Client,
  Vessel,
  Equipment,
  WorkOrder,
  WorkOrderStatus,
  WorkOrderStatusEvent,  
} from "../lib/firebase/db";

import { StatusTimeline } from "../components/workorders/StatusTimeline";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { WorkOrderPrintView } from "../components/workorders/WorkOrderPrintView";
import { WorkOrderPhotos } from "../components/workorders/WorkOrderPhotos";

function statusBadge(status: WorkOrderStatus) {
  switch (status) {
    case "EM_ANALISE": return { label: "Em análise", scheme: "yellow" as const };
    case "AGUARDANDO_PECA": return { label: "Aguardando peça", scheme: "orange" as const };
    case "AGUARDANDO_APROVACAO_ORCAMENTO": return { label: "Aguardando aprovação", scheme: "purple" as const };
    case "EM_EXECUCAO": return { label: "Em execução", scheme: "blue" as const };
    case "CONCLUIDO": return { label: "Concluído", scheme: "green" as const };
    case "CANCELADO": return { label: "Cancelado", scheme: "red" as const };
  }
}

function fmt(ts?: number) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

export default function WorkOrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [history, setHistory] = useState<WorkOrderStatusEvent[]>([]);

  const [newStatus, setNewStatus] = useState<WorkOrderStatus>("EM_ANALISE");
  const [note, setNote] = useState("");

  const printRef = useRef<HTMLDivElement>(null);

 
  useEffect(() => {
    const unsubC = subscribeClients(setClients);
    const unsubV = subscribeVessels(setVessels);
    const unsubE = subscribeEquipment(setEquipment);
    return () => { unsubC(); unsubV(); unsubE(); };
  }, []);

  useEffect(() => {
    if (!id) return;
    const unsubWO = subscribeWorkOrderById(id, (x) => {
      setWo(x);
      if (x) setNewStatus(x.status);
    });
    const unsubH = subscribeWorkOrderHistory(id, setHistory);
    return () => { unsubWO(); unsubH(); };
  }, [id]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const vesselMap = useMemo(() => new Map(vessels.map((v) => [v.id, v])), [vessels]);
  const equipmentMap = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);

  const client = wo ? clientMap.get(wo.clientId) ?? null : null;
  const vessel = wo?.vesselId ? vesselMap.get(wo.vesselId) ?? null : null;
  const equipmentItem = wo?.equipmentId ? equipmentMap.get(wo.equipmentId) ?? null : null;

  async function applyStatus() {
    if (!wo || !id) return;
    if (newStatus === wo.status) {
      toast({ status: "info", title: "Status já está selecionado." });
      return;
    }
    try {
      await changeWorkOrderStatus(id, wo.status, newStatus, note);
      setNote("");
      toast({ status: "success", title: "Status atualizado." });
    } catch (e: any) {
      toast({ status: "error", title: "Erro ao atualizar status", description: e?.message || String(e) });
    }
  }

  
 const st = wo ? statusBadge(wo.status) : null;

 const photos = useMemo(() => {
  const map = wo?.photos ?? {};
  return Object.values(map).sort(
    (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)
  );
}, [wo]);
 
const handlePrint = useReactToPrint({
  content: () => printRef.current,
  documentTitle: wo ? `OS-${wo.code || wo.id}` : "OS",
  });

 if (!wo) {
     return (
    <Card>
      <CardBody>
        <Heading size="md">Carregando ordem...</Heading>
        <Text color="gray.600" mt={2}>
          Buscando dados da OS...
        </Text>
      </CardBody>
    </Card>
  );
  }

  return (
    <Stack spacing={4}>
      <Card>
        <CardBody>
          <HStack justify="space-between" align="start">
            
           {wo ? (
            <Box position="absolute" left="-99999px" top={0}>
              <Box ref={printRef}>
                <WorkOrderPrintView workOrder={wo} client={client} vessel={vessel} equipment={equipmentItem} photos={photos} />
              </Box>
            </Box>
            
          ) : null}              

            <Box>
              <Heading size="md">{wo.code}</Heading>
              <HStack mt={2} spacing={2}>
                {st ? (
                  <Badge colorScheme={st.scheme} borderRadius="999px" px={2}>
                    {st.label}
                  </Badge>
                ) : null}
                <Badge borderRadius="999px" px={2} variant="subtle">Atualizado: {fmt(wo.statusUpdatedAt)}</Badge>
              </HStack>
              <Text color="gray.600" mt={3}>
                <b>Cliente:</b> {clientMap.get(wo.clientId)?.name || "-"} •{" "}
                <b>Embarcação:</b> {wo.vesselId ? (vesselMap.get(wo.vesselId)?.name || "-") : "-"} •{" "}
                <b>Equipamento:</b> {wo.equipmentId ? (equipmentMap.get(wo.equipmentId)?.name || "-") : "-"}
              </Text>
            </Box>
            

            <Box minW="360px">
              <FormControl>
                <FormLabel>Novo status</FormLabel>
                <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value as WorkOrderStatus)}>
                  <option value="EM_ANALISE">Em análise</option>
                  <option value="AGUARDANDO_PECA">Aguardando peça</option>
                  <option value="AGUARDANDO_APROVACAO_ORCAMENTO">Aguardando aprovação de orçamento</option>
                  <option value="EM_EXECUCAO">Em execução</option>
                  <option value="CONCLUIDO">Concluído</option>
                  <option value="CANCELADO">Cancelado</option>
                </Select>
              </FormControl>

              <FormControl mt={3}>
                <FormLabel>Nota (opcional)</FormLabel>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              </FormControl>

              <Button mt={3} colorScheme="brand" onClick={applyStatus} width="100%">
                Aplicar status
              </Button>

              <Button mt={2} variant="outline" width="100%" onClick={handlePrint}>
                Exportar PDF
              </Button>
            </Box>
          </HStack>

          <Divider my={5} />

          <Stack direction={{ base: "column", lg: "row" }} align="start" spacing={8}>
            <Box flex="1">
              <Text fontWeight="800" mb={2}>Defeito reportado</Text>
              <Text color="gray.700" whiteSpace="pre-wrap">{wo.reportedDefect}</Text>

              <Text fontWeight="800" mt={6} mb={2}>Relatório do serviço</Text>
              <Text color="gray.700" whiteSpace="pre-wrap">{wo.serviceReport || "-"}</Text>
            </Box>

            <Box mt={6}>
              <WorkOrderPhotos woId={wo.id} photos={photos} />
            </Box>

            <Box w="420px" maxH="560px" overflowY="auto" pr={1}>
              <StatusTimeline currentStatus={wo.status} history={history} />
            </Box>

            {/* <Box w="420px">
              <Text fontWeight="900" mb={3}>Histórico de status</Text>

              <Stack spacing={3}>
                {history.map((ev) => {
                  const from = statusBadge(ev.from);
                  const to = statusBadge(ev.to);
                  return (
                    <Box key={ev.id} p={4} bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="18px">
                      <HStack justify="space-between" mb={2}>
                        <Text fontWeight="800" fontSize="sm">{fmt(ev.changedAt)}</Text>
                        <Badge borderRadius="999px" px={2} variant="subtle">Evento</Badge>
                      </HStack>
                      <HStack spacing={2} flexWrap="wrap">
                        <Badge colorScheme={from.scheme} borderRadius="999px" px={2}>{from.label}</Badge>
                        <Text>→</Text>
                        <Badge colorScheme={to.scheme} borderRadius="999px" px={2}>{to.label}</Badge>
                      </HStack>
                      {ev.note ? (
                        <Text mt={2} fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
                          {ev.note}
                        </Text>
                      ) : null}
                    </Box>
                  );
                })}
              </Stack>
            </Box> */}
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
