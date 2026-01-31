import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type {
  Client,
  Vessel,
  Equipment,
  WorkOrder,
  WorkOrderPriority,
  WorkOrderStatus,
} from "../lib/firebase/db";
import {
  subscribeClients,
  subscribeEquipment,
  subscribeVessels,
  subscribeWorkOrders,
  changeWorkOrderStatus,
} from "../lib/firebase/db";

const STATUSES: Array<{ key: WorkOrderStatus; label: string; scheme: string }> = [
  { key: "EM_ANALISE", label: "Em análise", scheme: "yellow" },
  { key: "AGUARDANDO_PECA", label: "Aguardando peça", scheme: "orange" },
  { key: "AGUARDANDO_APROVACAO_ORCAMENTO", label: "Aguardando aprovação", scheme: "purple" },
  { key: "EM_EXECUCAO", label: "Em execução", scheme: "blue" },
  { key: "CONCLUIDO", label: "Concluído", scheme: "green" },
  { key: "CANCELADO", label: "Cancelado", scheme: "red" },
];

const NOTE_REQUIRED_STATUSES: WorkOrderStatus[] = [
  "AGUARDANDO_PECA",
  "AGUARDANDO_APROVACAO_ORCAMENTO",
];

function statusLabel(s: WorkOrderStatus) {
  return STATUSES.find((x) => x.key === s)?.label ?? s;
}

function prioBadge(p: WorkOrderPriority) {
  switch (p) {
    case "baixa": return { label: "Baixa", scheme: "gray" as const };
    case "media": return { label: "Média", scheme: "blue" as const };
    case "alta": return { label: "Alta", scheme: "orange" as const };
    case "critica": return { label: "Crítica", scheme: "red" as const };
  }
}

type KanbanCardModel = {
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

  // para regra: não concluir sem relatório
  serviceReport?: string;
};

function buildSearchText(r: KanbanCardModel) {
  return [r.code, r.clientName, r.vesselName, r.equipmentName, r.reportedDefect]
    .join(" ")
    .toLowerCase();
}

function SortableCard({
  card,
  onOpen,
}: {
  card: KanbanCardModel;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 180ms ease",
    opacity: isDragging ? 0.65 : 1,
  };

  const pr = prioBadge(card.priority);

  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        variant="outline"
        borderRadius="16px"
        _hover={{ boxShadow: "md", cursor: "grab" }}
        onDoubleClick={() => onOpen(card.id)}
        transition="box-shadow 150ms ease, transform 150ms ease"
        _active={{ cursor: "grabbing" }}
      >
        <CardBody>
          <Stack spacing={2}>
            <HStack justify="space-between" align="start">
              <Stack spacing={0}>
                <Text fontWeight="800">{card.code}</Text>
                <Text fontSize="sm" color="gray.600" noOfLines={1}>
                  {card.clientName}
                </Text>
              </Stack>
              <Badge borderRadius="999px" px={2} colorScheme={pr.scheme}>
                {pr.label}
              </Badge>
            </HStack>

            <Text fontSize="sm" color="gray.600" noOfLines={1}>
              {card.vesselName} • {card.equipmentName}
            </Text>

            <Text fontSize="sm" noOfLines={3}>
              {card.reportedDefect}
            </Text>

            <Text fontSize="xs" color="gray.500">
              Atualizada: {card.updatedAt ? new Date(card.updatedAt).toLocaleString() : "-"}
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </Box>
  );
}

function KanbanColumn({
  status,
  label,
  scheme,
  cards,
  onOpen,
  isActiveDrop,
}: {
  status: WorkOrderStatus;
  label: string;
  scheme: string;
  cards: KanbanCardModel[];
  onOpen: (id: string) => void;
  isActiveDrop: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const highlight = isActiveDrop || isOver;

  return (
    <Card
      ref={setNodeRef}
      borderRadius="18px"
      transition="transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease"
      borderWidth="1px"
      borderColor={highlight ? "blue.300" : "blackAlpha.200"}
      boxShadow={highlight ? "lg" : "sm"}
      transform={highlight ? "translateY(-2px)" : "translateY(0)"}
    >
      <CardBody>
        <HStack justify="space-between" mb={3}>
          <HStack>
            <Badge borderRadius="999px" px={2} colorScheme={scheme}>
              {label}
            </Badge>
            <Text fontSize="sm" color="gray.600">
              {cards.length}
            </Text>
          </HStack>
        </HStack>

        <Box
          borderRadius="14px"
          p={2}
          bg={highlight ? "blue.50" : "transparent"}
          transition="background-color 140ms ease"
          minH="72px"
        >
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <Stack spacing={3}>
              {cards.length === 0 ? (
                <Text fontSize="sm" color="gray.500" px={2} py={2}>
                  Solte aqui
                </Text>
              ) : null}

              {cards.map((c) => (
                <SortableCard key={c.id} card={c} onOpen={onOpen} />
              ))}
            </Stack>
          </SortableContext>
        </Box>
      </CardBody>
    </Card>
  );
}

type PendingMove = {
  woId: string;
  from: WorkOrderStatus;
  to: WorkOrderStatus;
};

export default function WorkOrdersKanbanPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const noteModal = useDisclosure();

  const [clients, setClients] = useState<Client[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  // filtros topo
  const [q, setQ] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<WorkOrderPriority | "ALL">("ALL");

  // drag overlay
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeFromStatus, setActiveFromStatus] = useState<WorkOrderStatus | null>(null);

  // modal nota
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [note, setNote] = useState("");

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

  const cards: KanbanCardModel[] = useMemo(() => {
    return workOrders.map((wo) => {
      const clientName = clientMap.get(wo.clientId)?.name || "-";
      const vesselName = wo.vesselId ? (vesselMap.get(wo.vesselId)?.name || "-") : "-";
      const equipmentName = wo.equipmentId ? (equipmentMap.get(wo.equipmentId)?.name || "-") : "-";
      const code = wo.code || "PENDING";

      const base: KanbanCardModel = {
        id: wo.id,
        code,
        status: wo.status,
        priority: wo.priority,
        clientName,
        vesselName,
        equipmentName,
        reportedDefect: wo.reportedDefect || "",
        updatedAt: wo.updatedAt || 0,
        searchText: "",
        serviceReport: wo.serviceReport || "",
      };
      base.searchText = buildSearchText(base);
      return base;
    });
  }, [workOrders, clientMap, vesselMap, equipmentMap]);

  const filteredCards = useMemo(() => {
    const qq = q.toLowerCase().trim();
    return cards.filter((c) => {
      if (priorityFilter !== "ALL" && c.priority !== priorityFilter) return false;
      if (qq && !c.searchText.includes(qq)) return false;
      return true;
    });
  }, [cards, q, priorityFilter]);

  const byStatus = useMemo(() => {
    const m = new Map<WorkOrderStatus, KanbanCardModel[]>();
    for (const s of STATUSES) m.set(s.key, []);
    for (const c of filteredCards) m.get(c.status)?.push(c);

    const prioRank: Record<WorkOrderPriority, number> = { critica: 4, alta: 3, media: 2, baixa: 1 };
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => {
        const p = prioRank[b.priority] - prioRank[a.priority];
        if (p !== 0) return p;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
      m.set(k, arr);
    }
    return m;
  }, [filteredCards]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const activeCard = useMemo(
    () => (activeId ? cards.find((c) => c.id === activeId) || null : null),
    [activeId, cards]
  );

  function findStatusOfCard(cardId: string): WorkOrderStatus | null {
    const c = cards.find((x) => x.id === cardId);
    return c?.status ?? null;
  }

  function parseDropTargetToStatus(overId: string): WorkOrderStatus | null {
    if (overId.startsWith("col:")) {
      const st = overId.replace("col:", "") as WorkOrderStatus;
      if (STATUSES.some((s) => s.key === st)) return st;
    }
    return findStatusOfCard(overId);
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    setActiveId(id);
    setActiveFromStatus(findStatusOfCard(id));
  }

  async function applyMove(move: PendingMove, noteText?: string) {
    await changeWorkOrderStatus(move.woId, move.from, move.to, noteText);
    toast({ status: "success", title: "Status atualizado" });
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);

    const { active, over } = e;
    if (!over) return;

    const woId = String(active.id);
    const overId = String(over.id);

    const fromStatus = activeFromStatus ?? findStatusOfCard(woId);
    setActiveFromStatus(null);
    if (!fromStatus) return;

    const toStatus = parseDropTargetToStatus(overId);
    if (!toStatus || toStatus === fromStatus) return;

    const card = cards.find((c) => c.id === woId);
    if (!card) return;

    // Regra: não concluir sem relatório
    if (toStatus === "CONCLUIDO" && !String(card.serviceReport || "").trim()) {
  toast({
    status: "warning",
    duration: 7000,
    isClosable: true,
    position: "top",
    render: ({ onClose }) => (
      <Box
        bg="orange.50"
        borderWidth="1px"
        borderColor="orange.200"
        borderRadius="16px"
        p={4}
        boxShadow="lg"
      >
        <HStack justify="space-between" align="start" spacing={3}>
          <Stack spacing={1}>
            <Text fontWeight="800">Para concluir, preencha o Relatório do Serviço</Text>
            <Text fontSize="sm" color="gray.700">
              Abra a OS e informe o relatório antes de mover para <b>Concluído</b>.
            </Text>
          </Stack>

          <Button
            size="sm"
            colorScheme="orange"
            onClick={() => {
              onClose();
              navigate(`/app/work-orders/${card.id}`);
            }}
          >
            Abrir OS
          </Button>
        </HStack>
      </Box>
    ),
  });
  return;
}

    // Nota obrigatória em certos status
    if (NOTE_REQUIRED_STATUSES.includes(toStatus)) {
      setPendingMove({ woId, from: fromStatus, to: toStatus });
      setNote("");
      noteModal.onOpen();
      return;
    }

    // Move direto
    try {
      await applyMove({ woId, from: fromStatus, to: toStatus }, "Movido no Kanban");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ status: "error", title: "Erro ao mover", description: msg });
    }
  }

  async function confirmNote() {
    if (!pendingMove) return;

    const txt = note.trim();
    if (!txt) {
      toast({ status: "error", title: "Informe uma nota para essa mudança." });
      return;
    }

    try {
      await applyMove(pendingMove, txt);
      noteModal.onClose();
      setPendingMove(null);
      setNote("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ status: "error", title: "Erro ao atualizar", description: msg });
    }
  }

  return (
    <Stack spacing={4}>
      <HStack justify="space-between">
        <Stack spacing={0}>
          <Heading size="md">Kanban de Ordens</Heading>
          <Text color="gray.600" fontSize="sm">
            Arraste os cards entre colunas para alterar o status.
          </Text>
        </Stack>
        <Text fontSize="sm" color="gray.600">
          Dica: duplo clique abre detalhes
        </Text>
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

        <Box ml="auto" />
      </HStack>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => { setActiveId(null); setActiveFromStatus(null); }}
      >
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
          {STATUSES.map((s) => {
            const colCards = byStatus.get(s.key) ?? [];
            const isActiveDrop = !!activeFromStatus && activeFromStatus !== s.key;

            return (
              <KanbanColumn
                key={s.key}
                status={s.key}
                label={s.label}
                scheme={s.scheme}
                cards={colCards}
                isActiveDrop={isActiveDrop}
                onOpen={(id) => navigate(`/app/work-orders/${id}`)}
              />
            );
          })}
        </SimpleGrid>

        <DragOverlay>
          {activeCard ? (
            <Box w={{ base: "320px", md: "360px" }}>
              <Card borderRadius="16px" boxShadow="2xl">
                <CardBody>
                  <HStack justify="space-between" align="start">
                    <Stack spacing={0}>
                      <Text fontWeight="800">{activeCard.code}</Text>
                      <Text fontSize="sm" color="gray.600" noOfLines={1}>
                        {activeCard.clientName}
                      </Text>
                    </Stack>
                    <Badge borderRadius="999px" px={2} colorScheme={prioBadge(activeCard.priority).scheme}>
                      {prioBadge(activeCard.priority).label}
                    </Badge>
                  </HStack>

                  <Text mt={2} fontSize="sm" noOfLines={3}>
                    {activeCard.reportedDefect}
                  </Text>
                </CardBody>
              </Card>
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de Nota obrigatória */}
      <Modal isOpen={noteModal.isOpen} onClose={() => { noteModal.onClose(); setPendingMove(null); }}>
        <ModalOverlay />
        <ModalContent borderRadius="18px">
          <ModalHeader>Nota obrigatória</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <Text color="gray.600">
                Você está movendo para <b>{pendingMove ? statusLabel(pendingMove.to) : "-"}</b>.  
                Informe uma nota (ex.: peça necessária, orçamento, motivo, etc.).
              </Text>

              <FormControl isRequired>
                <FormLabel>Nota</FormLabel>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Descreva o motivo / próxima ação..."
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={() => { noteModal.onClose(); setPendingMove(null); }}>
              Cancelar
            </Button>
            <Button colorScheme="brand" onClick={confirmNote}>
              Confirmar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
