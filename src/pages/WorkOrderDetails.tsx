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
  import {
    //Modal,
    //ModalOverlay,
    //ModalContent,
    //ModalHeader,
    //ModalBody,
    //ModalFooter,
    //ModalCloseButton,
    useDisclosure,
    //NumberInput,
    //NumberInputField,
    //NumberInputStepper,
    //NumberIncrementStepper,
    //NumberDecrementStepper,
    //SimpleGrid,
    //FormHelperText,
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
  import { useNavigate } from "react-router-dom";
  //import type { Budget, BudgetKind, BudgetPricing, HourRates } from "../lib/firebase/budgets.types";
  import type { Budget } from "../lib/firebase/budgets.types";
  import { subscribeBudgetsByWorkOrder } from "../lib/firebase/budgets.db";
  import { useAuth } from "../contexts/AuthContext";
  //import { Link as RouterLink } from "react-router-dom";
import { CreateBudgetModal } from "../components/budgets/CreateBudgetModal";

  
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

  function brl(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function budgetStatusBadge(status: Budget["status"]) {
    switch (status) {
      case "RASCUNHO": return { label: "Rascunho", scheme: "gray" as const };
      case "ENVIADO": return { label: "Enviado", scheme: "blue" as const };
      case "APROVADO": return { label: "Aprovado", scheme: "green" as const };
      case "REPROVADO": return { label: "Reprovado", scheme: "red" as const };
    }
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

    const navigate = useNavigate();
    const { user } = useAuth();

    const [budgets, setBudgets] = useState<Budget[]>([]);
    const budgetModal = useDisclosure();
    
    useEffect(() => {
    if (!wo?.id) return;
    const unsub = subscribeBudgetsByWorkOrder(wo.id, (list) => {
      // ordena: mais recente primeiro
      const sorted = [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      setBudgets(sorted);
    });
    return () => unsub();
  }, [wo?.id]);
  
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ status: "error", title: "Erro ao atualizar status", description: msg  });
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
    contentRef: printRef,
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
              <Box position="fixed" top={0} left={0} opacity={0} pointerEvents="none" zIndex={-1}>
                <Box ref={printRef}>
                  <WorkOrderPrintView
                    workOrder={wo}
                    client={client}
                    vessel={vessel}
                    equipment={equipmentItem}
                    photos={photos}
                  />
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

                <Button mt={2} variant="outline" width="100%" onClick={() => handlePrint()}>
                  Exportar PDF
                </Button>

                {/* ✅ mais espaçamento */}
                <Button mt={2} variant="outline" onClick={() => navigate(`/app/reports/${wo.id}`)}>
                  Relatório (editar / imprimir)
                </Button>
              </Box>
            </HStack>

            <Divider my={5} />

            <Card variant="outline">
    <CardBody>
      <HStack justify="space-between" mb={3}>
        <Box>
          <Heading size="sm">Orçamentos</Heading>
          <Text fontSize="sm" color="gray.600">
            Crie e acompanhe aprovação do cliente.
          </Text>
        </Box>

        <Button colorScheme="brand" onClick={budgetModal.onOpen}>
          Criar orçamento
        </Button>
      </HStack>

      {budgets.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          Nenhum orçamento criado para esta OS.
        </Text>
      ) : (
        <Stack spacing={3}>
          {budgets.map((b) => {
            const sb = budgetStatusBadge(b.status);
            return (
              <Box
                key={b.id}
                p={4}
                border="1px solid"
                borderColor="gray.200"
                borderRadius="16px"
                bg="white"
              >
                <HStack justify="space-between" align="start">
                  <Box>
                    <HStack spacing={2} mb={1} flexWrap="wrap">
                      <Badge colorScheme={sb.scheme} borderRadius="999px" px={2}>
                        {sb.label}
                      </Badge>
                      <Badge borderRadius="999px" px={2} variant="subtle">
                        {b.kind === "ANALISE" ? "Análise" : "Serviço"}
                      </Badge>
                      <Badge borderRadius="999px" px={2} variant="subtle">
                        {b.pricing === "POR_HORA" ? "Por hora" : "Fechado"}
                      </Badge>
                      {typeof b.version === "number" ? (
                        <Badge borderRadius="999px" px={2} variant="subtle">
                          v{b.version}
                        </Badge>
                      ) : null}
                    </HStack>

                    <Text fontWeight="800">
                      {b.title || (b.kind === "ANALISE" ? "Orçamento de Análise" : "Orçamento de Serviço")}
                    </Text>

                    <Text fontSize="sm" color="gray.600" mt={1}>
                      Total: <b>{brl(b.total ?? 0)}</b> • Criado em {new Date(b.createdAt).toLocaleString()}
                    </Text>
                  </Box>

                  <Button size="sm" variant="outline" onClick={() => navigate(`/app/budgets/${b.id}`)}>
                    Abrir
                  </Button>
                </HStack>
              </Box>
            );
          })}
        </Stack>
      )}
    </CardBody>
  </Card>

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
          <CreateBudgetModal
            isOpen={budgetModal.isOpen}
            onClose={budgetModal.onClose}
            workOrderId={wo.id}
            defaultKind={(wo.serviceMode ?? "INTERNO") === "EXTERNO" ? "SERVICO" : "ANALISE"}
            createdByUid={user?.uid || "unknown"}
            onCreated={(b) => {
              // opcional: abrir direto o orçamento
              navigate(`/app/budgets/${b.id}`);
            }}
          />
        </Card>

        
      </Stack>
    );
  }
