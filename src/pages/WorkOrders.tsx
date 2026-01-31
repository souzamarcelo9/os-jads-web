import {
  Badge,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { FiEdit2, FiEye, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import {
  
  createWorkOrder,
  deleteWorkOrder,
  subscribeClients,
  subscribeEquipment,
  subscribeVessels,
  subscribeWorkOrders,
  updateWorkOrder,
} from "../lib/firebase/db";

import {
 type  Client,
 type Vessel,
 type Equipment,
 type WorkOrder,
 type WorkOrderPriority,
 type WorkOrderStatus
} from "../lib/firebase/db";

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

type WorkOrderForm = {
  clientId: string;
  vesselId?: string;
  equipmentId?: string;
  reportedDefect: string;
  serviceReport?: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
};

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

function priorityBadge(p: WorkOrderPriority) {
  switch (p) {
    case "baixa": return { label: "Baixa", scheme: "gray" as const };
    case "media": return { label: "Média", scheme: "blue" as const };
    case "alta": return { label: "Alta", scheme: "orange" as const };
    case "critica": return { label: "Crítica", scheme: "red" as const };
  }
}

type WoRow = {
  id: string;
  code: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  clientName: string;
  vesselName: string;
  equipmentName: string;
  reportedDefect: string;
  updatedAt: number;
  // campo auxiliar pra busca
  searchText: string;
};

export default function WorkOrdersPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selected, setSelected] = useState<WorkOrder | null>(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState, watch, setValue } = useForm<WorkOrderForm>();

  // filtros topo
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<WorkOrderPriority | "ALL">("ALL");
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);

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

  // selects dependentes no modal
  const vesselsByClient = useMemo(() => {
    const m = new Map<string, Vessel[]>();
    vessels.forEach((v) => {
      const arr = m.get(v.clientId) ?? [];
      arr.push(v);
      m.set(v.clientId, arr);
    });
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      m.set(k, arr);
    }
    return m;
  }, [vessels]);

  const equipmentByClient = useMemo(() => {
    const m = new Map<string, Equipment[]>();
    equipment.forEach((e) => {
      const arr = m.get(e.clientId) ?? [];
      arr.push(e);
      m.set(e.clientId, arr);
    });
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      m.set(k, arr);
    }
    return m;
  }, [equipment]);

  const formClientId = watch("clientId");
  const availableVessels = useMemo(
    () => (formClientId ? vesselsByClient.get(formClientId) ?? [] : []),
    [formClientId, vesselsByClient]
  );
  const availableEquipment = useMemo(
    () => (formClientId ? equipmentByClient.get(formClientId) ?? [] : []),
    [formClientId, equipmentByClient]
  );

  useEffect(() => {
    setValue("vesselId", "");
    setValue("equipmentId", "");
  }, [formClientId, setValue]);

  function openNew() {
    setSelected(null);
    const defaultClient = clients[0]?.id || "";
    reset({
      clientId: defaultClient,
      vesselId: "",
      equipmentId: "",
      reportedDefect: "",
      serviceReport: "",
      priority: "media",
      status: "EM_ANALISE",
    });
    onOpen();
  }

  function openEdit(wo: WorkOrder) {
    setSelected(wo);
    reset({
      clientId: wo.clientId,
      vesselId: wo.vesselId ?? "",
      equipmentId: wo.equipmentId ?? "",
      reportedDefect: wo.reportedDefect ?? "",
      serviceReport: wo.serviceReport ?? "",
      priority: wo.priority,
      status: wo.status,
    });
    onOpen();
  }

  async function onSubmit(data: WorkOrderForm) {
    if (!data.clientId) {
      toast({ status: "error", title: "Selecione um cliente." });
      return;
    }
    const payload = {
      ...data,
      vesselId: data.vesselId || undefined,
      equipmentId: data.equipmentId || undefined,
    };

    try {
      if (selected) {
        await updateWorkOrder(selected.id, payload);
        toast({ status: "success", title: "Ordem atualizada." });
      } else {
        await createWorkOrder(payload as any);
        toast({ status: "success", title: "Ordem criada." });
      }
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ status: "error", title: "Erro", description: msg });
    }
  }

  async function onDelete(wo: WorkOrder) {
    if (!confirm(`Excluir ordem "${wo.code}"?`)) return;
    try {
      await deleteWorkOrder(wo.id);
      toast({ status: "success", title: "Ordem excluída." });
    } catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  toast({ status: "error", title: "Erro", description: msg });
}
  }

  // =========================
  // TABLE (TanStack)
  // =========================
  const rows: WoRow[] = useMemo(() => {
    return workOrders.map((wo) => {
      const clientName = clientMap.get(wo.clientId)?.name || "-";
      const vesselName = wo.vesselId ? (vesselMap.get(wo.vesselId)?.name || "-") : "-";
      const equipmentName = wo.equipmentId ? (equipmentMap.get(wo.equipmentId)?.name || "-") : "-";
      const code = wo.code || "PENDING";

      const searchText = [
        code,
        clientName,
        vesselName,
        equipmentName,
        wo.reportedDefect || "",
      ]
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
        reportedDefect: wo.reportedDefect || "",
        updatedAt: wo.updatedAt || 0,
        searchText,
      };
    });
  }, [workOrders, clientMap, vesselMap, equipmentMap]);

  const columns = useMemo<ColumnDef<WoRow>[]>(() => {
    return [
      {
        accessorKey: "code",
        header: "Código",
        cell: (info) => <Text fontWeight="800">{info.getValue<string>()}</Text>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => {
          const st = statusBadge(info.getValue<WorkOrderStatus>());
          return (
            <Badge colorScheme={st.scheme} borderRadius="999px" px={2}>
              {st.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "priority",
        header: "Prioridade",
        cell: (info) => {
          const pr = priorityBadge(info.getValue<WorkOrderPriority>());
          return (
            <Badge colorScheme={pr.scheme} borderRadius="999px" px={2}>
              {pr.label}
            </Badge>
          );
        },
      },
      { accessorKey: "clientName", header: "Cliente" },
      { accessorKey: "vesselName", header: "Embarcação" },
      { accessorKey: "equipmentName", header: "Equipamento" },
      {
        accessorKey: "updatedAt",
        header: "Atualizada",
        cell: (info) => {
          const ts = info.getValue<number>();
          return <Text fontSize="sm" color="gray.600">{ts ? new Date(ts).toLocaleString() : "-"}</Text>;
        },
        sortingFn: "basic",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const id = row.original.id;
          const wo = workOrders.find((w) => w.id === id);
          return (
            <HStack spacing={2} justify="flex-end">
              <IconButton
                aria-label="Ver"
                icon={<FiEye />}
                size="sm"
                variant="outline"
                onClick={() => navigate(`/app/work-orders/${id}`)}
              />
              <IconButton
                aria-label="Editar"
                icon={<FiEdit2 />}
                size="sm"
                variant="outline"
                onClick={() => wo && openEdit(wo)}
              />
              <IconButton
                aria-label="Excluir"
                icon={<FiTrash2 />}
                size="sm"
                variant="outline"
                onClick={() => wo && onDelete(wo)}
              />
            </HStack>
          );
        },
      },
      // coluna auxiliar para busca (não renderiza)
      {
        accessorKey: "searchText",
        header: "",
        enableSorting: false,
        cell: () => null,
      },
    ];
  }, [navigate, workOrders]);
 

  // aplica filtros topo via "filtered rows" (sem mexer em column filters)
  const visibleRows = useMemo(() => {
    const qq = q.toLowerCase().trim();
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && r.priority !== priorityFilter) return false;
      if (qq && !r.searchText.includes(qq)) return false;
      return true;
    });
  }, [rows, q, statusFilter, priorityFilter]);

  // Recria table com data filtrada (pra paginação/ordenação baterem certo)
  const filteredTable = useReactTable({
    data: visibleRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  // =========================

  return (
    <Card>
      <CardBody>
        <HStack justify="space-between" mb={4}>
          <Heading size="md">Ordens de Serviço</Heading>
          <Button leftIcon={<FiPlus />} colorScheme="brand" onClick={openNew}>
            Nova OS
          </Button>
        </HStack>

        {/* Filtros no topo */}
        <HStack spacing={3} mb={4} align="stretch">
          <InputGroup maxW="420px">
            <InputLeftElement pointerEvents="none">
              <FiSearch />
            </InputLeftElement>
            <Input
              placeholder="Buscar (código, cliente, embarcação, equipamento, defeito...)"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                filteredTable.setPageIndex(0);
              }}
            />
          </InputGroup>

          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as (WorkOrderStatus | "ALL"))
              filteredTable.setPageIndex(0);
            }}
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
            onChange={(e) => {
              setPriorityFilter(e.target.value as (WorkOrderPriority | "ALL"))
              filteredTable.setPageIndex(0);
            }}
            maxW="240px"
          >
            <option value="ALL">Prioridade: Todas</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </Select>

          <HStack ml="auto">
            <Select
              value={filteredTable.getState().pagination.pageSize}
              onChange={(e) => filteredTable.setPageSize(Number(e.target.value))}
              maxW="140px"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n}/página
                </option>
              ))}
            </Select>
          </HStack>
        </HStack>

        {/* Tabela */}
        <Table variant="simple">
          <Thead>
            {filteredTable.getHeaderGroups().map((hg) => (
              <Tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted(); // false | "asc" | "desc"
                  return (
                    <Th
                      key={header.id}
                      cursor={canSort ? "pointer" : "default"}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      userSelect="none"
                    >
                      <HStack spacing={2}>
                        <span>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {canSort ? (
                          <Text fontSize="xs" color="gray.500">
                            {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : ""}
                          </Text>
                        ) : null}
                      </HStack>
                    </Th>
                  );
                })}
              </Tr>
            ))}
          </Thead>

          <Tbody>
            {filteredTable.getRowModel().rows.map((row) => (
              <Tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  // não renderiza coluna auxiliar searchText
                  if (cell.column.id === "searchText") return null;
                  return (
                    <Td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Td>
                  );
                })}
              </Tr>
            ))}

            {filteredTable.getRowModel().rows.length === 0 ? (
              <Tr>
                <Td colSpan={7}>
                  <Text color="gray.600">Nenhuma ordem encontrada com os filtros atuais.</Text>
                </Td>
              </Tr>
            ) : null}
          </Tbody>
        </Table>

        {/* Paginação */}
        <HStack justify="space-between" mt={4}>
          <Text fontSize="sm" color="gray.600">
            Página {filteredTable.getState().pagination.pageIndex + 1} de{" "}
            {filteredTable.getPageCount() || 1} • {visibleRows.length} resultado(s)
          </Text>

          <HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={() => filteredTable.previousPage()}
              isDisabled={!filteredTable.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => filteredTable.nextPage()}
              isDisabled={!filteredTable.getCanNextPage()}
            >
              Próxima
            </Button>
          </HStack>
        </HStack>

        {/* Modal CRUD (mantém como estava) */}
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent borderRadius="22px">
            <ModalHeader>{selected ? "Editar OS" : "Nova OS"}</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Cliente</FormLabel>
                    <Select {...register("clientId", { required: true })}>
                      <option value="">Selecione...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </FormControl>

                  <HStack spacing={4}>
                    <FormControl>
                      <FormLabel>Embarcação</FormLabel>
                      <Select {...register("vesselId")}>
                        <option value="">(Opcional) Selecione...</option>
                        {availableVessels.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Equipamento</FormLabel>
                      <Select {...register("equipmentId")}>
                        <option value="">(Opcional) Selecione...</option>
                        {availableEquipment.map((e) => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </Select>
                    </FormControl>
                  </HStack>

                  <HStack spacing={4}>
                    <FormControl>
                      <FormLabel>Status</FormLabel>
                      <Select {...register("status")}>
                        <option value="EM_ANALISE">Em análise</option>
                        <option value="AGUARDANDO_PECA">Aguardando peça</option>
                        <option value="AGUARDANDO_APROVACAO_ORCAMENTO">Aguardando aprovação de orçamento</option>
                        <option value="EM_EXECUCAO">Em execução</option>
                        <option value="CONCLUIDO">Concluído</option>
                        <option value="CANCELADO">Cancelado</option>
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Prioridade</FormLabel>
                      <Select {...register("priority")}>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                        <option value="critica">Crítica</option>
                      </Select>
                    </FormControl>
                  </HStack>

                  <FormControl isRequired>
                    <FormLabel>Defeito reportado</FormLabel>
                    <Textarea rows={3} {...register("reportedDefect", { required: true })} />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Relatório do serviço</FormLabel>
                    <Textarea rows={4} {...register("serviceReport")} />
                  </FormControl>

                  <Button type="submit" colorScheme="brand" isLoading={formState.isSubmitting}>
                    Salvar
                  </Button>
                </Stack>
              </form>
            </ModalBody>
          </ModalContent>
        </Modal>
      </CardBody>
    </Card>
  );
}
