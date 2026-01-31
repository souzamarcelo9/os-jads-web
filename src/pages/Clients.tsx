import {
  Button, Card, CardBody, Heading, HStack, Input, Modal, ModalBody, ModalCloseButton,
  ModalContent, ModalHeader, ModalOverlay, Stack, Table, Tbody, Td, Th, Thead, Tr,
  useDisclosure, FormControl, FormLabel, Textarea, useToast, IconButton
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";
import { useForm } from "react-hook-form";
import { createClient, deleteClient, subscribeClients, updateClient } from "../lib/firebase/db";
import type { Client } from "../lib/firebase/db";

type ClientForm = {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const { register, handleSubmit, reset, formState } = useForm<ClientForm>();

  useEffect(() => {
    const unsub = subscribeClients(setClients);
    return () => unsub();
  }, []);

  const title = useMemo(() => (selected ? "Editar cliente" : "Novo cliente"), [selected]);

  function openNew() {
    setSelected(null);
    reset({ name: "", contactName: "", phone: "", email: "", address: "" });
    onOpen();
  }

  function openEdit(c: Client) {
    setSelected(c);
    reset({
      name: c.name ?? "",
      contactName: c.contactName ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
    });
    onOpen();
  }

  async function onSubmit(data: ClientForm) {
    try {
      if (selected) {
        await updateClient(selected.id, data);
        toast({ status: "success", title: "Cliente atualizado." });
      } else {
        await createClient(data);
        toast({ status: "success", title: "Cliente criado." });
      }
      onClose();
    } catch (e: any) {
      toast({ status: "error", title: "Erro ao salvar", description: e?.message || String(e) });
    }
  }

  async function onDelete(c: Client) {
    if (!confirm(`Excluir cliente "${c.name}"?`)) return;
    try {
      await deleteClient(c.id);
      toast({ status: "success", title: "Cliente excluído." });
    } catch (e: any) {
      toast({ status: "error", title: "Erro ao excluir", description: e?.message || String(e) });
    }
  }

  return (
    <Card>
      <CardBody>
        <HStack justify="space-between" mb={4}>
          <Heading size="md">Clientes</Heading>
          <Button leftIcon={<FiPlus />} colorScheme="brand" onClick={openNew}>
            Novo
          </Button>
        </HStack>

        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Nome</Th>
              <Th>Contato</Th>
              <Th>Telefone</Th>
              <Th>Email</Th>
              <Th width="120px">Ações</Th>
            </Tr>
          </Thead>
          <Tbody>
            {clients.map((c) => (
              <Tr key={c.id}>
                <Td>{c.name}</Td>
                <Td>{c.contactName || "-"}</Td>
                <Td>{c.phone || "-"}</Td>
                <Td>{c.email || "-"}</Td>
                <Td>
                  <HStack spacing={2}>
                    <IconButton
                      aria-label="Editar"
                      icon={<FiEdit2 />}
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(c)}
                    />
                    <IconButton
                      aria-label="Excluir"
                      icon={<FiTrash2 />}
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(c)}
                    />
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay />
          <ModalContent borderRadius="20px">
            <ModalHeader>{title}</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Nome</FormLabel>
                    <Input {...register("name", { required: true })} />
                  </FormControl>

                  <HStack spacing={4}>
                    <FormControl>
                      <FormLabel>Contato</FormLabel>
                      <Input {...register("contactName")} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Telefone</FormLabel>
                      <Input {...register("phone")} />
                    </FormControl>
                  </HStack>

                  <FormControl>
                    <FormLabel>Email</FormLabel>
                    <Input type="email" {...register("email")} />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Endereço</FormLabel>
                    <Textarea rows={3} {...register("address")} />
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
