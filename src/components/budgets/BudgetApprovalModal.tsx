import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { approveBudget, rejectBudget } from "../../lib/firebase/budgets.db";

export function BudgetApprovalModal(props: {
  isOpen: boolean;
  onClose: () => void;
  budgetId: string;
  mode: "approve" | "reject";
}) {
  const toast = useToast();
  const [clientName, setClientName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    try {
      setSaving(true);

      const payload = {
        budgetId: props.budgetId,
        clientName: clientName.trim() || null,
        note: note.trim() || null,
      };

      if (props.mode === "approve") {
        await approveBudget(payload);
        toast({ status: "success", title: "Orçamento aprovado" });
      } else {
        await rejectBudget(payload);
        toast({ status: "warning", title: "Orçamento reprovado" });
      }

      props.onClose();
      setClientName("");
      setNote("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ status: "error", title: "Erro", description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="18px">
        <ModalHeader>{props.mode === "approve" ? "Aprovar orçamento" : "Reprovar orçamento"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl>
              <FormLabel>Nome (cliente)</FormLabel>
              <Input
                placeholder="Ex: João Silva"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Observação</FormLabel>
              <Textarea
                placeholder="Observações/justificativa..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
              />
            </FormControl>
          </Stack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={props.onClose}>
            Cancelar
          </Button>

          <Button
            colorScheme={props.mode === "approve" ? "green" : "red"}
            onClick={submit}
            isLoading={saving}
          >
            {props.mode === "approve" ? "Aprovar" : "Reprovar"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
