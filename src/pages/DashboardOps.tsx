import {
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  HStack,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { FiArrowRight, FiPlus, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import type { Client, Vessel, Equipment, WorkOrder, WorkOrderPriority, WorkOrderStatus } from "../lib/firebase/db";
import {
  subscribeClients,
  subscribeVessels,
  subscribeEquipment,
  subscribeWorkOrders,
} from "../lib/firebase/db";

function statusLabel(s: WorkOrderStatus) {
  switch (s) {
    case "EM_ANALISE": return "Em análise";
    case "AGUARDANDO_PECA": return "Aguardando peça";
    case "AGUARDANDO_APROVACAO_ORCAMENTO": return "Aguardando aprovação";
    case "EM_EXECUCAO": return "Em execução";
    case "CONCLUIDO": return "Concluído";
    case "CANCELADO": return "Cancelado";
  }
}

function statusScheme(s: WorkOrderStatus) {
  switch (s) {
    case "EM_ANALISE": return "yellow";
    case "AGUARDANDO_PECA": return "orange";
    case "AGUARDANDO_APROVACAO_ORCAMENTO": return "purple";
    case "EM_EXECUCAO": return "blue";
    case "CONCLUIDO": return "green";
    case "CANCELADO": return "red";
  }
}

function prioLabel(p: WorkOrderPriority) {
  switch (p) {
    case "baixa": return "Baixa";
    case "media": return "Média";
    case "alta": return "Alta";
    case "critica": return "Crítica";
  }
}

function prioScheme(p: WorkOrderPriority) {
  switch (p) {
    case "baixa": return "gray";
    case "media": return "blue";
    case "alta": return "orange";
    case "critica": return "red";
  }
}

function minutesAgo(ts?: number) {
  if (!ts) return "-";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

type Row = {
  id: string;
  code: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  clientName: string;
  vesselName: string;
  equipmentName: string;
  reportedDefect: string;
  updatedAt: number;
  searchText: string;
};

export default function DashboardOps() {
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  // filtros topo
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<WorkOrderPriority | "ALL">("ALL");

  useEffect(() => {
    const unsubC = subscribeClients(setClients);
    const unsubV = subscribeVessels(setVessels);
    const unsubE = subscribeEquipment(setEquipment);
    const unsubW = subscribeWorkOrders(setWorkOrders);
    return () => { unsubC(); unsubV(); unsubE(); unsubW(); };
  }, []);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const vesselMap = useMemo(() => new Map(vessels.map((v) => [v.id, v])), [vessels]);
  const equipmentMap = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);

  const rows: Row[] = useMemo(() => {
    return workOrders.map((wo) => {
      const clientName = clientMap.get(wo.clientId)?.name || "-";
      const vesselName = wo.vesselId ? (vesselMap.get(wo.vesselId)?.name || "-") : "-";
      const equipmentName = wo.equipmentId ? (equipmentMap.get(wo.equipmentId)?.name || "-") : "-";
      const code = wo.code || "PENDING";
      const reportedDefect = wo.reportedDefect || "";

      const searchText = [code, clientName, vesselName, equipmentName, reportedDefect]
        .join(" ")
        .toLowerCase();

      return {
        id: wo.id,
        code,
        status: wo.status,
        priority: wo.priority,
        clientName,
        vesselName,
        equipmentName,
        reportedDefect,
        updatedAt: wo.updatedAt || 0,
        searchText,
      };
    });
  }, [workOrders, clientMap, vesselMap, equipmentMap]);

  const filtered = useMemo(() => {
    const qq = q.toLowerCase().trim();
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && r.priority !== priorityFilter) return false;
      if (qq && !r.searchText.includes(qq)) return false;
      return true;
    });
  }, [rows, q, statusFilter, priorityFilter]);

  // KPIs operacionais
  const kpis = useMemo(() => {
    const active = filtered.filter((w) => w.status !== "CONCLUIDO" && w.status !== "CANCELADO");
    const emExec = active.filter((w) => w.status === "EM_EXECUCAO");
    const aguardPeca = active.filter((w) => w.status === "AGUARDANDO_PECA");
    const aguardAprov = active.filter((w) => w.status === "AGUARDANDO_APROVACAO_ORCAMENTO");
    const critAlta = active.filter((w) => w.priority === "critica" || w.priority === "alta");

    return {
      activeCount: active.length,
      emExec: emExec.length,
      aguardPeca: aguardPeca.length,
      aguardAprov: aguardAprov.length,
      critAlta: critAlta.length,
    };
  }, [filtered]);

  // lista “foco agora”: críticas/altas não concluídas, mais recentes primeiro
  const focusNow = useMemo(() => {
    return filtered
      .filter((w) => w.status !== "CONCLUIDO" && w.status !== "CANCELADO")
      .filter((w) => w.priority === "critica" || w.priority === "alta")
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 8);
  }, [filtered]);

  // “fila”: não concluídas/canceladas, ordenadas por prioridade + atualização
  const queue = useMemo(() => {
    const prioRank: Record<WorkOrderPriority, number> = {
      critica: 4,
      alta: 3,
      media: 2,
      baixa: 1,
    };
    return filtered
      .filter((w) => w.status !== "CONCLUIDO" && w.status !== "CANCELADO")
      .sort((a, b) => {
        const p = prioRank[b.priority] - prioRank[a.priority];
        if (p !== 0) return p;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      })
      .slice(0, 12);
  }, [filtered]);

  return (
    <Stack spacing={4}>
      <HStack justify="space-between">
        <VStack align="start" spacing={0}>
          <Heading size="md">Operação</Heading>
          <Text color="gray.600" fontSize="sm">
            Fila de trabalho e próximos passos (tenant: default)
          </Text>
        </VStack>

        <Button leftIcon={<FiPlus />} colorScheme="brand" onClick={() => navigate("/app/work-orders")}>
          Nova OS
        </Button>
      </HStack>

      {/* filtros topo */}
      <HStack spacing={3} align="stretch">
        <InputGroup maxW="420px">
          <InputLeftElement pointerEvents="none">
            <FiSearch />
          </InputLeftElement>
          <Input
            placeholder="Buscar (código, cliente, embarcação, equipamento...)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </InputGroup>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as (WorkOrderStatus | "ALL"))}
          maxW="260px"
        >
          <option value="ALL">Status: Todos</option>
          <option value="EM_ANALISE">Em análise</option>
          <option value="AGUARDANDO_PECA">Aguardando peça</option>
          <option value="AGUARDANDO_APROVACAO_ORCAMENTO">Aguardando aprovação</option>
          <option value="EM_EXECUCAO">Em execução</option>
          <option value="CONCLUIDO">Concluído</option>
          <option value="CANCELADO">Cancelado</option>
        </Select>

        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as (WorkOrderPriority | "ALL"))}
          maxW="240px"
        >
          <option value="ALL">Prioridade: Todas</option>
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
          <option value="critica">Crítica</option>
        </Select>

        <Button variant="outline" ml="auto" onClick={() => navigate("/app/work-orders")}>
          Ver todas as OS
        </Button>
      </HStack>

      {/* KPIs */}
      <SimpleGrid columns={{ base: 1, md: 5 }} spacing={3}>
        <Card><CardBody>
          <Text fontSize="sm" color="gray.600">Ativas</Text>
          <HStack justify="space-between">
            <Heading size="md">{kpis.activeCount}</Heading>
            <Badge borderRadius="999px" px={2} colorScheme="blue">Fila</Badge>
          </HStack>
        </CardBody></Card>

        <Card><CardBody>
          <Text fontSize="sm" color="gray.600">Em execução</Text>
          <HStack justify="space-between">
            <Heading size="md">{kpis.emExec}</Heading>
            <Badge borderRadius="999px" px={2} colorScheme="blue">Execução</Badge>
          </HStack>
        </CardBody></Card>

        <Card><CardBody>
          <Text fontSize="sm" color="gray.600">Aguard. peça</Text>
          <HStack justify="space-between">
            <Heading size="md">{kpis.aguardPeca}</Heading>
            <Badge borderRadius="999px" px={2} colorScheme="orange">Peça</Badge>
          </HStack>
        </CardBody></Card>

        <Card><CardBody>
          <Text fontSize="sm" color="gray.600">Aguard. aprovação</Text>
          <HStack justify="space-between">
            <Heading size="md">{kpis.aguardAprov}</Heading>
            <Badge borderRadius="999px" px={2} colorScheme="purple">Aprovação</Badge>
          </HStack>
        </CardBody></Card>

        <Card><CardBody>
          <Text fontSize="sm" color="gray.600">Crítica/Alta</Text>
          <HStack justify="space-between">
            <Heading size="md">{kpis.critAlta}</Heading>
            <Badge borderRadius="999px" px={2} colorScheme="red">Urgente</Badge>
          </HStack>
        </CardBody></Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        {/* Foco agora */}
        <Card>
          <CardBody>
            <HStack justify="space-between" mb={2}>
              <Heading size="sm">Foco agora (Crítica/Alta)</Heading>
              <Button size="sm" variant="outline" onClick={() => navigate("/app/work-orders")}>
                Abrir lista
              </Button>
            </HStack>

            <Stack spacing={3}>
              {focusNow.length === 0 ? (
                <Text color="gray.600">Nada urgente com os filtros atuais.</Text>
              ) : (
                focusNow.map((w) => (
                  <Card key={w.id} variant="outline">
                    <CardBody>
                      <HStack justify="space-between" align="start">
                        <Stack spacing={1}>
                          <HStack>
                            <Text fontWeight="800">{w.code}</Text>
                            <Badge colorScheme={statusScheme(w.status)} borderRadius="999px" px={2}>
                              {statusLabel(w.status)}
                            </Badge>
                            <Badge colorScheme={prioScheme(w.priority)} borderRadius="999px" px={2}>
                              {prioLabel(w.priority)}
                            </Badge>
                          </HStack>
                          <Text color="gray.600" fontSize="sm">
                            {w.clientName} • {w.vesselName} • {w.equipmentName}
                          </Text>
                          <Text noOfLines={2}>{w.reportedDefect}</Text>
                        </Stack>

                        <IconButton
                          aria-label="Abrir"
                          icon={<FiArrowRight />}
                          variant="outline"
                          onClick={() => navigate(`/app/work-orders/${w.id}`)}
                        />
                      </HStack>

                      <Divider my={3} />

                      <Text fontSize="sm" color="gray.600">
                        Atualizada há {minutesAgo(w.updatedAt)}
                      </Text>
                    </CardBody>
                  </Card>
                ))
              )}
            </Stack>
          </CardBody>
        </Card>

        {/* Fila (top 12) */}
        <Card>
          <CardBody>
            <HStack justify="space-between" mb={2}>
              <Heading size="sm">Fila (Top 12)</Heading>
              <Button size="sm" variant="outline" onClick={() => navigate("/app/work-orders")}>
                Gerenciar
              </Button>
            </HStack>

            <Stack spacing={2}>
              {queue.length === 0 ? (
                <Text color="gray.600">Nenhuma OS ativa com os filtros atuais.</Text>
              ) : (
                queue.map((w) => (
                  <HStack
                    key={w.id}
                    p={3}
                    borderWidth="1px"
                    borderRadius="14px"
                    justify="space-between"
                    _hover={{ bg: "blackAlpha.50" }}
                  >
                    <Stack spacing={0}>
                      <HStack>
                        <Text fontWeight="800">{w.code}</Text>
                        <Badge colorScheme={prioScheme(w.priority)} borderRadius="999px" px={2}>
                          {prioLabel(w.priority)}
                        </Badge>
                        <Badge colorScheme={statusScheme(w.status)} borderRadius="999px" px={2}>
                          {statusLabel(w.status)}
                        </Badge>
                      </HStack>
                      <Text color="gray.600" fontSize="sm">
                        {w.clientName} • {w.vesselName}
                      </Text>
                      <Text fontSize="sm" noOfLines={1}>
                        {w.reportedDefect}
                      </Text>
                    </Stack>

                    <Button size="sm" variant="outline" onClick={() => navigate(`/app/work-orders/${w.id}`)}>
                      Abrir
                    </Button>
                  </HStack>
                ))
              )}
            </Stack>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
