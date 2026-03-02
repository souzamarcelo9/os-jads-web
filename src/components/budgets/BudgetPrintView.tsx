import { Box, Divider, Heading, HStack, Image, SimpleGrid, Stack, Text, Badge, Table, Thead, Tbody, Tr, Th, Td } from "@chakra-ui/react";
import type { Budget } from "../../lib/firebase/budgets.types";
import type { WorkOrder } from "../../lib/firebase/db";
import type { Client, Vessel, Equipment } from "../../lib/firebase/db";


const LOGO_SRC = "/godwrites-logo.jpg";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(ts?: number) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("pt-BR");
}


function labelPricing(p: Budget["pricing"]) {
  return p === "POR_HORA" ? "Por hora" : "Fechado";
}

function labelKind(k: Budget["kind"]) {
  return k === "ANALISE" ? "Análise" : "Serviço";
}

export function BudgetPrintView(props: {
  budget: Budget;
  workOrder?: WorkOrder | null;
  client?: Client | null;
  vessel?: Vessel | null;
  equipment?: Equipment | null;
}) {
  const { budget, workOrder, client, vessel, equipment } = props;

  const items = budget.items ? Object.values(budget.items) : [];
  const hourEntries = budget.hourEntries ? Object.values(budget.hourEntries) : [];

  const sortedItems = [...items].sort((a, b) => (a.description ?? "").localeCompare(b.description ?? ""));
  const sortedHours = [...hourEntries].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  return (
    <Box p={8} bg="white" color="black" fontSize="sm">
      {/* HEADER */}
      <HStack justify="space-between" align="start">
        <HStack spacing={4}>
          <Image src={LOGO_SRC} alt="God Writes" height="52px" objectFit="contain" />
          <Box>
            <Heading size="md" lineHeight="1.1">
              Orçamento
            </Heading>
            <Text color="gray.600">
              {budget.title || "—"}
            </Text>
          </Box>
        </HStack>

        <Stack spacing={1} align="end">
          <HStack spacing={2}>
            <Badge borderRadius="999px" px={3} variant="subtle">
              {labelKind(budget.kind)}
            </Badge>
            <Badge borderRadius="999px" px={3} variant="subtle">
              {labelPricing(budget.pricing)}
            </Badge>
            <Badge borderRadius="999px" px={3} colorScheme="blue">
              {budget.status}
            </Badge>
          </HStack>

          <Text color="gray.600">
            Emitido em: <b>{fmtDate(budget.createdAt)}</b>
          </Text>
        </Stack>
      </HStack>

      <Divider my={5} />

      {/* IDENTIFICAÇÃO */}
      <SimpleGrid columns={2} spacing={4}>
        <Box>
          <Text fontWeight="900" mb={1}>Cliente</Text>
          <Text>{client?.name || "-"}</Text>
          <Text color="gray.600">{client?.contactName || ""} {client?.phone ? `• ${client.phone}` : ""}</Text>
          <Text color="gray.600">{client?.address || ""}</Text>
        </Box>

        <Box>
          <Text fontWeight="900" mb={1}>Ordem de Serviço</Text>
          <Text>{workOrder?.code || budget.workOrderId}</Text>
          <Text color="gray.600">
            Embarcação: <b>{vessel?.name || "-"}</b> • Equip.: <b>{equipment?.name || "-"}</b>
          </Text>
          {workOrder?.reportedDefect ? (
            <Text color="gray.600" mt={2}>
              Defeito: {workOrder.reportedDefect}
            </Text>
          ) : null}
        </Box>
      </SimpleGrid>

      <Divider my={5} />

      {/* CORPO: ITENS OU HORAS */}
      {budget.pricing === "FECHADO" ? (
        <Box>
          <Text fontWeight="900" mb={2}>Itens</Text>
          <Box border="1px solid" borderColor="gray.200" borderRadius="12px" overflow="hidden">
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Descrição</Th>
                  <Th isNumeric>Qtd</Th>
                  <Th isNumeric>Vlr unit.</Th>
                  <Th isNumeric>Total</Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedItems.length === 0 ? (
                  <Tr>
                    <Td colSpan={4}>
                      <Text color="gray.600">Nenhum item informado.</Text>
                    </Td>
                  </Tr>
                ) : (
                  sortedItems.map((it) => (
                    <Tr key={it.id}>
                      <Td>{it.description}</Td>
                      <Td isNumeric>{it.qty}</Td>
                      <Td isNumeric>{brl(it.unitPrice ?? 0)}</Td>
                      <Td isNumeric fontWeight="800">{brl(it.total ?? 0)}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        </Box>
      ) : (
        <Box>
          <Text fontWeight="900" mb={2}>Horas</Text>
          <Box border="1px solid" borderColor="gray.200" borderRadius="12px" overflow="hidden">
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Data</Th>
                  <Th>Início</Th>
                  <Th>Fim</Th>
                  <Th isNumeric>Téc N</Th>
                  <Th isNumeric>Téc E</Th>
                  <Th isNumeric>Aux N</Th>
                  <Th isNumeric>Aux E</Th>

                  <Th isNumeric>HH téc desloc N</Th>
                  <Th isNumeric>HH téc desloc E</Th>
                  <Th isNumeric>HH aux desloc N</Th>
                  <Th isNumeric>HH aux desloc E</Th>

                  <Th isNumeric>Total</Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedHours.length === 0 ? (
                  <Tr>
                    <Td colSpan={12}>
                      <Text color="gray.600">Nenhuma linha de horas informada.</Text>
                    </Td>
                  </Tr>
                ) : (
                  sortedHours.map((e) => (
                    <Tr key={e.id}>
                      <Td>{e.date || "-"}</Td>
                      <Td>{e.start || "-"}</Td>
                      <Td>{e.end || "-"}</Td>
                      <Td isNumeric>{e.techNormalHours ?? 0}</Td>
                      <Td isNumeric>{e.techExtraHours ?? 0}</Td>
                      <Td isNumeric>{e.auxNormalHours ?? 0}</Td>
                      <Td isNumeric>{e.auxExtraHours ?? 0}</Td>

                      <Td isNumeric>{e.techTravelNormalHours ?? 0}</Td>
                      <Td isNumeric>{e.techTravelExtraHours ?? 0}</Td>
                      <Td isNumeric>{e.auxTravelNormalHours ?? 0}</Td>
                      <Td isNumeric>{e.auxTravelExtraHours ?? 0}</Td>

                      <Td isNumeric fontWeight="800">{brl(e.rowTotal ?? 0)}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        </Box>
      )}

      <Divider my={5} />

      {/* TOTAIS */}
      <Box maxW="420px" ml="auto">
        <Stack spacing={2}>
          <HStack justify="space-between">
            <Text color="gray.700">Subtotal</Text>
            <Text fontWeight="900">{brl(budget.subtotal ?? 0)}</Text>
          </HStack>

          <HStack justify="space-between">
            <Text color="gray.700">ISS ({budget.issPercent ?? 0}%)</Text>
            <Text fontWeight="900">{brl(budget.issValue ?? 0)}</Text>
          </HStack>

          <Divider />

          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="900">Total</Text>
            <Text fontSize="lg" fontWeight="900">{brl(budget.total ?? 0)}</Text>
          </HStack>
        </Stack>
      </Box>

      {/* Rodapé */}
      <Text mt={8} fontSize="xs" color="gray.600">
        God Writes • Documento gerado pelo sistema • {new Date().toLocaleString("pt-BR")}
      </Text>
    </Box>
  );
}
