import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  NumberInput,
  NumberInputField,
  Stack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  IconButton,
  useToast,
  Badge,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import { useMemo, useState } from "react";
import type { Budget, BudgetItem } from "../../lib/firebase/budgets.types";
import { removeBudgetItem, upsertBudgetItem } from "../../lib/firebase/budgets.db";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toNum(x: unknown) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

type DraftItem = {
  description: string;
  qty: number;
  unitPrice: number;
};

export function BudgetItems({ budget }: { budget: Budget }) {
  const toast = useToast();

  const isFixed = budget.pricing === "FECHADO";

  const items = useMemo(() => {
    if (!isFixed) return [];
    const map = budget.items ?? {};
    return Object.values(map).sort((a, b) => (a.description ?? "").localeCompare(b.description ?? ""));
  }, [isFixed, budget.items]);

  const [draft, setDraft] = useState<DraftItem>({
    description: "",
    qty: 1,
    unitPrice: 0,
  });

  async function addItem() {
    if (!isFixed) return;

    const desc = draft.description.trim();
    if (!desc) {
      toast({ status: "warning", title: "Informe a descrição do item" });
      return;
    }

    const id = crypto.randomUUID();
    const qty = Math.max(0, toNum(draft.qty));
    const unitPrice = Math.max(0, toNum(draft.unitPrice));
    const total = qty * unitPrice;

    const item: BudgetItem = {
      id,
      description: desc,
      qty,
      unitPrice,
      total,
    };

    await upsertBudgetItem(budget.id, item);
    setDraft({ description: "", qty: 1, unitPrice: 0 });
    toast({ status: "success", title: "Item adicionado" });
  }

  async function updateItem(itemId: string, patch: Partial<BudgetItem>) {
    if (!isFixed) return;

    const cur = items.find((i) => i.id === itemId);
    if (!cur) return;

    const next: BudgetItem = {
      ...cur,
      ...patch,
      qty: Math.max(0, toNum(patch.qty ?? cur.qty)),
      unitPrice: Math.max(0, toNum(patch.unitPrice ?? cur.unitPrice)),
      total: 0,
    };
    next.total = next.qty * next.unitPrice;

    await upsertBudgetItem(budget.id, next);
  }

  async function del(itemId: string) {
    await removeBudgetItem(budget.id, itemId);
    toast({ status: "info", title: "Item removido" });
  }

  if (!isFixed) {
    return (
      <Text color="gray.600" fontSize="sm">
        Este orçamento não é “fechado”. Use a aba “Horas”.
      </Text>
    );
  }

  return (
    <Stack spacing={4}>
      <HStack justify="space-between">
        <Box>
          <Text fontWeight="900">Itens do orçamento</Text>
          <Text fontSize="sm" color="gray.600">
            Serviços, peças e outros custos. O total será calculado automaticamente.
          </Text>
        </Box>

        <Badge borderRadius="999px" px={3} py={1} variant="subtle">
          Total: <b>{brl(budget.total ?? 0)}</b>
        </Badge>
      </HStack>

      {/* Form add */}
      <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="16px" bg="gray.50">
        <HStack spacing={3} align="end" flexWrap="wrap">
          <FormControl minW={{ base: "100%", md: "360px" }}>
            <FormLabel>Descrição</FormLabel>
            <Input
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Ex: Troca de selo / Mão de obra / Peça X"
            />
          </FormControl>

          <FormControl w={{ base: "48%", md: "120px" }}>
            <FormLabel>Qtd</FormLabel>
            <NumberInput
              value={draft.qty}
              min={0}
              precision={2}
              onChange={(_, n) => setDraft((d) => ({ ...d, qty: Number.isFinite(n) ? n : 0 }))}
            >
              <NumberInputField />
            </NumberInput>
          </FormControl>

          <FormControl w={{ base: "48%", md: "180px" }}>
            <FormLabel>Valor unit.</FormLabel>
            <NumberInput
              value={draft.unitPrice}
              min={0}
              precision={2}
              onChange={(_, n) => setDraft((d) => ({ ...d, unitPrice: Number.isFinite(n) ? n : 0 }))}
            >
              <NumberInputField />
            </NumberInput>
          </FormControl>

          <Button leftIcon={<AddIcon />} colorScheme="brand" onClick={addItem}>
            Adicionar
          </Button>
        </HStack>
      </Box>

      {/* Table */}
      <Box overflowX="auto" border="1px solid" borderColor="gray.200" borderRadius="16px">
        <Table size="sm">
          <Thead bg="gray.50">
            <Tr>
              <Th>Descrição</Th>
              <Th isNumeric>Qtd</Th>
              <Th isNumeric>Valor unit.</Th>
              <Th isNumeric>Total</Th>
              <Th />
            </Tr>
          </Thead>

          <Tbody>
            {items.map((it) => (
              <Tr key={it.id}>
                <Td>
                  <Input
                    value={it.description}
                    onChange={(e) => updateItem(it.id, { description: e.target.value })}
                    size="sm"
                  />
                </Td>

                <Td isNumeric>
                  <NumberInput
                    value={it.qty}
                    min={0}
                    precision={2}
                    onChange={(_, n) => updateItem(it.id, { qty: Number.isFinite(n) ? n : 0 })}
                    size="sm"
                  >
                    <NumberInputField textAlign="right" />
                  </NumberInput>
                </Td>

                <Td isNumeric>
                  <NumberInput
                    value={it.unitPrice}
                    min={0}
                    precision={2}
                    onChange={(_, n) => updateItem(it.id, { unitPrice: Number.isFinite(n) ? n : 0 })}
                    size="sm"
                  >
                    <NumberInputField textAlign="right" />
                  </NumberInput>
                </Td>

                <Td isNumeric fontWeight="800">{brl(it.total ?? 0)}</Td>

                <Td textAlign="right">
                  <IconButton
                    aria-label="Remover item"
                    icon={<DeleteIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={() => del(it.id)}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Text fontSize="sm" color="gray.600">
        Subtotal: <b>{brl(budget.subtotal ?? 0)}</b> • ISS ({budget.issPercent ?? 0}%):{" "}
        <b>{brl(budget.issValue ?? 0)}</b> • Total: <b>{brl(budget.total ?? 0)}</b>
      </Text>
    </Stack>
  );
}
