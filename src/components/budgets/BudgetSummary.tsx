import { Badge, Box, Card, CardBody, Divider, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import type { Budget } from "../../lib/firebase/budgets.types";

function brl(v: number) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusLabel(s: Budget["status"]) {
  switch (s) {
    case "RASCUNHO": return { label: "Rascunho", scheme: "gray" as const };
    case "ENVIADO": return { label: "Enviado", scheme: "blue" as const };
    case "APROVADO": return { label: "Aprovado", scheme: "green" as const };
    case "REPROVADO": return { label: "Reprovado", scheme: "red" as const };
    default: return { label: String(s), scheme: "gray" as const };
  }
}

export function BudgetSummary({ budget }: { budget: Budget }) {
  const st = statusLabel(budget.status);

  return (
    <Stack spacing={4}>
      <Card>
        <CardBody>
          <HStack justify="space-between" align="start">
            <Box>
              <Text fontWeight="900" fontSize="lg">
                {budget.title || "Orçamento"}
              </Text>
              <Text color="gray.600" fontSize="sm">
                Tipo: <b>{budget.kind}</b> • Precificação: <b>{budget.pricing}</b> • Moeda: <b>{budget.currency}</b>
              </Text>
            </Box>
            <Badge colorScheme={st.scheme} borderRadius="999px" px={3} py={1}>
              {st.label}
            </Badge>
          </HStack>

          <Divider my={4} />

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
            <Box p={3} bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="16px">
              <Text fontSize="xs" color="gray.600">Subtotal</Text>
              <Text fontWeight="900" fontSize="lg">{brl(budget.subtotal ?? 0)}</Text>
            </Box>

            <Box p={3} bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="16px">
              <Text fontSize="xs" color="gray.600">ISS ({budget.issPercent ?? 0}%)</Text>
              <Text fontWeight="900" fontSize="lg">{brl(budget.issValue ?? 0)}</Text>
            </Box>

            <Box p={3} bg="brand.50" border="1px solid" borderColor="brand.200" borderRadius="16px">
              <Text fontSize="xs" color="gray.700">Total</Text>
              <Text fontWeight="900" fontSize="xl">{brl(budget.total ?? 0)}</Text>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Text fontWeight="800" mb={2}>Informações comerciais</Text>
          <Stack spacing={1} fontSize="sm" color="gray.700">
            <Text>• Validade: <b>{budget.validityDays ?? 7}</b> dias</Text>
            <Text>• Condição de pagamento: <b>{budget.paymentTerms ?? "-"}</b></Text>
            <Text>• Prazo de entrega: <b>{budget.deliveryTerms ?? "-"}</b></Text>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}