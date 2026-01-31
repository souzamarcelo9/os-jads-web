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
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  createVessel,
  deleteVessel,
  subscribeClients,
  subscribeVessels,
  updateVessel,
} from "../lib/firebase/db";

import type { Client , Vessel} from "../lib/firebase/db";

type VesselForm = {
  clientId: string;
  name: string;
  registration?: string;
  type?: string;
  notes?: string;
};

export default function VesselsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [filterClientId, setFilterClientId] = useState<string>("ALL");
  const [selected, setSelected] = useState<Vessel | null>(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { register, handleSubmit, reset, formState, watch } = useForm<VesselForm>();

  useEffect(() => {
    const unsubC = subscribeClients(setClients);
    const unsubV = subscribeVessels(setVessels);
    return () => {
      unsubC();
      unsubV();
    };
  }, []);

  const clientMap = useMemo(() => {
    const m = new Map<string, Client>();
    clients.forEach((c) => m.set(c.id, c));
    return m;
  }, [clients]);

  const filteredVessels = useMemo(() => {
    if (filterClientId === "ALL") return vessels;
    return vessels.filter((v) => v.clientId === filterClientId);
  }, [vessels, filterClientId]);

  const modalTitle = selected ? "Editar embarcação" : "Nova embarcação";

  function openNew() {
    setSelected(null);
    const defaultClient = clients[0]?.id || "";
    reset({ clientId: defaultClient, name: "", registration: "", type: "", notes: "" });
    onOpen();
  }

  function openEdit(v: Vessel) {
    setSelected(v);
    reset({
      clientId: v.clientId,
      name: v.name ?? "",
      registration: v.registration ?? "",
      type: v.type ?? "",
      notes: v.notes ?? "",
    });
    onOpen();
  }

  async function onSubmit(data: VesselForm) {
    if (!data.clientId) {
      toast({ status: "error", title: "Selecione um cliente." });
      return;
    }
    try {
      if (selected) {
        await updateVessel(selected.id, data);
        toast({ status: "success", title: "Embarcação atualizada." });
      } else {
        await createVessel(data);
        toast({ status: "success", title: "Embarcação criada." });
      }
      onClose();
    } catch (e: any) {
      toast({ status: "error", title: "Erro ao salvar", description: e?.message || String(e) });
    }
  }

  async function onDelete(v: Vessel) {
    if (!confirm(`Excluir embarcação "${v.name}"?`)) return;
    try {
      await deleteVessel(v.id);
      toast({ status: "success", title: "Embarcação excluída." });
    } catch (e: any) {
      toast({ status: "error", title: "Erro ao excluir", description: e?.message || String(e) });
    }
  }

  const selectedClientId = watch("clientId");

  return (
    <Card>
      <CardBody>
        <HStack justify="space-between" mb={4}>
          <Heading size="md">Embarcações</Heading>
          <HStack>
            <Select
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              maxW="320px"
            >
              <option value="ALL">Todos os clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Button leftIcon={<FiPlus />} colorScheme="brand" onClick={openNew}>
              Nova
            </Button>
          </HStack>
        </HStack>

        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Embarcação</Th>
              <Th>Cliente</Th>
              <Th>Matrícula/IMO</Th>
              <Th>Tipo</Th>
              <Th width="120px">Ações</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredVessels.map((v) => (
              <Tr key={v.id}>
                <Td>
                  <HStack>
                    <Badge colorScheme="blue" borderRadius="999px">VSL</Badge>
                    <span>{v.name}</span>
                  </HStack>
                </Td>
                <Td>{clientMap.get(v.clientId)?.name || "-"}</Td>
                <Td>{v.registration || "-"}</Td>
                <Td>{v.type || "-"}</Td>
                <Td>
                  <HStack spacing={2}>
                    <IconButton
                      aria-label="Editar"
                      icon={<FiEdit2 />}
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(v)}
                    />
                    <IconButton
                      aria-label="Excluir"
                      icon={<FiTrash2 />}
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(v)}
                    />
                  </HStack>
                </Td>
              </Tr>
            ))}
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
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Nome da embarcação</FormLabel>
                    <Input {...register("name", { required: true })} />
                  </FormControl>

                  <HStack spacing={4}>
                    <FormControl>
                      <FormLabel>Matrícula/IMO</FormLabel>
                      <Input {...register("registration")} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Tipo</FormLabel>
                      <Input {...register("type")} placeholder="Offshore, apoio, etc." />
                    </FormControl>
                  </HStack>

                  <FormControl>
                    <FormLabel>Observações</FormLabel>
                    <Textarea rows={3} {...register("notes")} />
                  </FormControl>

                  <Button type="submit" colorScheme="brand" isLoading={formState.isSubmitting}>
                    Salvar
                  </Button>

                  {/* feedback rápido */}
                  {selectedClientId ? null : null}
                </Stack>
              </form>
            </ModalBody>
          </ModalContent>
        </Modal>
      </CardBody>
    </Card>
  );
}
