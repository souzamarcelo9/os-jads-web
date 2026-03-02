import {
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { approveBudget, rejectBudget, sendBudgetToClient } from "../../lib/firebase/budgets.db";
import { useAuth } from "../../contexts/AuthContext";
import type { Budget } from "../../lib/firebase/budgets.types";


export function BudgetApproval({ budget }: { budget: Budget }) {
  const toast = useToast();
  const { user } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [mode, setMode] = useState<"SEND" | "APPROVE" | "REJECT">("SEND");
  const [note, setNote] = useState("");

  const uid = user?.uid ?? null;

  function open(m: typeof mode) {
    setMode(m);
    setNote("");
    onOpen();
  }

  async function confirm() {
    try {
      if (mode === "SEND") await sendBudgetToClient( budget.id);
      if (mode === "APPROVE") await approveBudget({ budgetId: budget.id, clientName: uid, note });
      if (mode === "REJECT") await rejectBudget({ budgetId: budget.id, clientName: uid, note });

      toast({
        status: "success",
        title:
          mode === "SEND" ? "Orçamento enviado" : mode === "APPROVE" ? "Orçamento aprovado" : "Orçamento reprovado",
      });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ status: "error", title: "Erro", description: msg });
    }
  }

  const canSend = budget.status === "RASCUNHO";
  const canDecide = budget.status === "ENVIADO" || budget.status === "RASCUNHO"; // ajuste regra

  return (
    <Stack spacing={4}>
      <Card>
        <CardBody>
          <Text fontWeight="800">Aprovação</Text>
          <Text fontSize="sm" color="gray.600" mt={1}>
            Envie ao cliente para aprovação ou registre a decisão manualmente.
          </Text>

          <HStack mt={4} spacing={3} flexWrap="wrap">
            <Button
              colorScheme="brand"
              onClick={() => open("SEND")}
              isDisabled={!canSend}
            >
              Enviar ao cliente
            </Button>

            <Button
              variant="outline"
              onClick={() => open("APPROVE")}
              isDisabled={!canDecide}
            >
              Aprovar
            </Button>

            <Button
              variant="outline"
              colorScheme="red"
              onClick={() => open("REJECT")}
              isDisabled={!canDecide}
            >
              Reprovar
            </Button>
          </HStack>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent borderRadius="22px">
          <ModalHeader>
            {mode === "SEND" ? "Enviar orçamento" : mode === "APPROVE" ? "Aprovar orçamento" : "Reprovar orçamento"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Nota (opcional)</FormLabel>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
            </FormControl>

            <HStack mt={4} justify="flex-end">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button colorScheme="brand" onClick={confirm}>
                Confirmar
              </Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Stack>
  );
}