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
  Th,
  Thead,
  Tr,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  createEquipment,
  deleteEquipment,
  subscribeClients,
  subscribeVessels,
  subscribeEquipment,
  updateEquipment,
} from "../lib/firebase/db";

import type { Client,Vessel,Equipment } from "../lib/firebase/db";

type EquipmentForm = {
  clientId: string;
  vesselId?: string;
  name: string;
  model?: string;
  serial?: string;
  systemType?: "hidraulico" | "eletronico" | "offshore";
  notes?: string;
};

function systemBadge(st?: Equipment["systemType"]) {
  if (st === "hidraulico") return { label: "Hidráulico", scheme: "teal" as const };
  if (st === "eletronico") return { label: "Eletrônico", scheme: "purple" as const };
  if (st === "offshore") return { label: "Offshore", scheme: "blue" as const };
  return { label: "—", scheme: "gray" as const };
}

export default function EquipmentPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  const [filterClientId, setFilterClientId] = useState<string>("ALL");
  const [filterVesselId, setFilterVesselId] = useState<string>("ALL");

  const [selected, setSelected] = useState<Equipment | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const { register, handleSubmit, reset, formState, watch, setValue } = useForm<EquipmentForm>();

  useEffect(() => {
    const unsubC = subscribeClients(setClients);
    const unsubV = subscribeVessels(setVessels);
    const unsubE = subscribeEquipment(setEquipment);
    return () => {
      unsubC();
      unsubV();
      unsubE();
    };
  }, []);

  const clientMap = useMemo(() => {
    const m = new Map<string, Client>();
    clients.forEach((c) => m.set(c.id, c));
    return m;
  }, [clients]);

  const vesselMap = useMemo(() => {
    const m = new Map<string, Vessel>();
    vessels.forEach((v) => m.set(v.id, v));
    return m;
  }, [vessels]);

  const vesselsByClient = useMemo(() => {
    const m = new Map<string, Vessel[]>();
    vessels.forEach((v) => {
      const arr = m.get(v.clientId) ?? [];
      arr.push(v);
      m.set(v.clientId, arr);
    });
    // ordenar por nome
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      m.set(k, arr);
    }
    return m;
  }, [vessels]);

  const filteredEquipment = useMemo(() => {
    let list = equipment;
    if (filterClientId !== "ALL") list = list.filter((e) => e.clientId === filterClientId);
    if (filterVesselId !== "ALL") list = list.filter((e) => (e.vesselId || "") === filterVesselId);
    return list;
  }, [equipment, filterClientId, filterVesselId]);

  const modalTitle = selected ? "Editar equipamento" : "Novo equipamento";

  function openNew() {
    setSelected(null);
    const defaultClient = clients[0]?.id || "";
    reset({
      clientId: defaultClient,
      vesselId: "",
      name: "",
      model: "",
      serial: "",
      systemType: "hidraulico",
      notes: "",
    });
    onOpen();
  }

  function openEdit(eqp: Equipment) {
    setSelected(eqp);
    reset({
      clientId: eqp.clientId,
      vesselId: eqp.vesselId ?? "",
      name: eqp.name ?? "",
      model: eqp.model ?? "",
      serial: eqp.serial ?? "",
      systemType: eqp.systemType ?? "hidraulico",
      notes: eqp.notes ?? "",
    });
    onOpen();
  }

  async function onSubmit(data: EquipmentForm) {
    if (!data.clientId) {
      toast({ status: "error", title: "Selecione um cliente." });
      return;
    }

    // vesselId opcional, mas se vier vazio, salva como null/undefined
    const payload = { ...data, vesselId: data.vesselId || undefined };

    try {
      if (selected) {
        await updateEquipment(selected.id, payload);
        toast({ status: "success", title: "Equipamento atualizado." });
      } else {
        await createEquipment(payload as any);
        toast({ status: "success", title: "Equipamento criado." });
      }
      onClose();
    } catch (err: any) {
      toast({ status: "error", title: "Erro ao salvar", description: err?.message || String(err) });
    }
  }

  async function onDelete(eqp: Equipment) {
    if (!confirm(`Excluir equipamento "${eqp.name}"?`)) return;
    try {
      await deleteEquipment(eqp.id);
      toast({ status: "success", title: "Equipamento excluído." });
    } catch (err: any) {
      toast({ status: "error", title: "Erro ao excluir", description: err?.message || String(err) });
    }
  }

  // Form dependent selects
  const formClientId = watch("clientId");
  const availableVessels = useMemo(() => {
    return formClientId ? vesselsByClient.get(formClientId) ?? [] : [];
  }, [formClientId, vesselsByClient]);

  // Se mudar o cliente no formulário, resetar vesselId (evita inconsistência)
  useEffect(() => {
    setValue("vesselId", "");
  }, [formClientId, setValue]);

  // Filtro de embarcação depende do filtro de cliente
  const filterVesselOptions = useMemo(() => {
    if (filterClientId === "ALL") return vessels;
    return vessels.filter((v) => v.clientId === filterClientId);
  }, [vessels, filterClientId]);

  return (
    <Card>
      <CardBody>
        <HStack justify="space-between" mb={4}>
          <Heading size="md">Equipamentos</Heading>
          <HStack>
            <Select value={filterClientId} onChange={(e) => {
              setFilterClientId(e.target.value);
              setFilterVesselId("ALL");
            }} maxW="280px">
              <option value="ALL">Todos os clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>

            <Select
              value={filterVesselId}
              onChange={(e) => setFilterVesselId(e.target.value)}
              maxW="280px"
              isDisabled={filterClientId === "ALL" && vessels.length === 0}
            >
              <option value="ALL">Todas as embarcações</option>
              {filterVesselOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>

            <Button  colorScheme="brand" onClick={openNew}>
             Novo
            </Button>
          </HStack>
        </HStack>

        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Equipamento</Th>
              <Th>Sistema</Th>
              <Th>Cliente</Th>
              <Th>Embarcação</Th>
              <Th>Modelo</Th>
              <Th>Série</Th>
              <Th width="120px">Ações</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredEquipment.map((e) => {
              const sys = systemBadge(e.systemType);
              return (
                <Tr key={e.id}>
                  <Td>{e.name}</Td>
                  <Td>
                    <Badge colorScheme={sys.scheme} borderRadius="999px" px={2}>
                      {sys.label}
                    </Badge>
                  </Td>
                  <Td>{clientMap.get(e.clientId)?.name || "-"}</Td>
                  <Td>{e.vesselId ? (vesselMap.get(e.vesselId)?.name || "-") : "-"}</Td>
                  <Td>{e.model || "-"}</Td>
                  <Td>{e.serial || "-"}</Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="Editar"
                        icon={<FiEdit2 />}
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(e)}
                      />
                      <IconButton
                        aria-label="Excluir"
                        icon={<FiTrash2 />}
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(e)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>

        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay />
          <ModalContent borderRadius="22px">
            <ModalHeader>{modalTitle}</ModalHeader>
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

                  <FormControl>
                    <FormLabel>Embarcação</FormLabel>
                    <Select {...register("vesselId")}>
                      <option value="">(Opcional) Selecione...</option>
                      {availableVessels.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Nome do equipamento</FormLabel>
                    <Input {...register("name", { required: true })} />
                  </FormControl>

                  <HStack spacing={4}>
                    <FormControl>
                      <FormLabel>Modelo</FormLabel>
                      <Input {...register("model")} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Nº Série</FormLabel>
                      <Input {...register("serial")} />
                    </FormControl>
                  </HStack>

                  <FormControl>
                    <FormLabel>Tipo de sistema</FormLabel>
                    <Select {...register("systemType")}>
                      <option value="hidraulico">Hidráulico</option>
                      <option value="eletronico">Eletrônico</option>
                      <option value="offshore">Offshore</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Observações</FormLabel>
                    <Textarea rows={3} {...register("notes")} />
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
