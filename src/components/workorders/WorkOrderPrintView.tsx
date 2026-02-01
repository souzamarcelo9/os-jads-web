import { Box, Divider, Heading, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import type { WorkOrder, Client, Vessel, Equipment } from "../../lib/firebase/db";
import { Image } from "@chakra-ui/react";
import type { WorkOrderPhoto } from "../../lib/firebase/db";

export function WorkOrderPrintView({
  workOrder,
  client,
  vessel,
  equipment,
  photos = [],
}: {
  workOrder: WorkOrder;
  client?: Client | null;
  vessel?: Vessel | null;
  equipment?: Equipment | null;
  photos?: WorkOrderPhoto[];
}) {
  return (
    <Box p={8}>
      <HStack justify="space-between" align="center" mb={4}>
        <Image
          src="/brand/godwrites-logo.jpg"
          alt="God Writes"
          h="60px"
          objectFit="contain"
        />
        <Box textAlign="right">
          <Heading size="sm">Ordem de Serviço</Heading>
          <Text fontSize="sm" color="gray.600">
            {workOrder.code}
          </Text>
        </Box>
      </HStack>
      <Heading size="lg">Ordem de Serviço</Heading>
      <Text color="gray.600">Código: {workOrder.code}</Text>

      <Divider my={4} />

      <Stack spacing={3}>
        <Heading size="sm">Cliente</Heading>
        <Text><b>Nome:</b> {client?.name || "-"}</Text>
        <Text><b>Contato:</b> {client?.contactName || "-"}</Text>
        <Text><b>Endereço:</b> {client?.address || "-"}</Text>

        <Divider />

        <Heading size="sm">Ativo / Embarcação</Heading>
        <Text><b>Embarcação:</b> {vessel?.name || "-"}</Text>
        <Text><b>Equipamento:</b> {equipment?.name || "-"}</Text>

        <Divider />

        <Heading size="sm">Defeito reportado</Heading>
        <Text whiteSpace="pre-wrap">{workOrder.reportedDefect || "-"}</Text>

        <Divider />

        <Heading size="sm">Relatório do serviço</Heading>
        <Text whiteSpace="pre-wrap">{workOrder.serviceReport || "-"}</Text>

        <Divider />

        <Divider my={4} />

        <Heading size="sm">Fotos do serviço</Heading>

        {photos.length === 0 ? (
          <Text>-</Text>
        ) : (
          <SimpleGrid columns={2} spacing={3} mt={2}>
            {photos.map((p) => (
              <Box key={p.id} borderWidth="1px" borderRadius="10px" overflow="hidden">
                <Image src={p.url} alt={p.name} w="100%" h="220px" objectFit="cover" />
                <Text fontSize="xs" color="gray.600" p={2} noOfLines={1}>
                  {p.name}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        )}

        <HStack justify="space-between">
          <Text><b>Status:</b> {workOrder.status}</Text>
          <Text><b>Prioridade:</b> {workOrder.priority}</Text>
        </HStack>
      </Stack>
    </Box>
  );
}
