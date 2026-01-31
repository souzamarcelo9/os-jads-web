import { Badge, Box, HStack, Stack, Text } from "@chakra-ui/react";
import {
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiPackage,
  FiPauseCircle,
  FiPlayCircle,
  FiXCircle,
} from "react-icons/fi";
import type { WorkOrderStatus } from "../../lib/firebase/db";

export type WorkOrderStatusEvent = {
  id: string;
  from?: WorkOrderStatus | null;
  to: WorkOrderStatus;
  note?: string | null;
  changedAt: number;
  changedBy?: string | null;
};

const STATUS_META: Record<
  WorkOrderStatus,
  { label: string; icon: any; scheme: string }
> = {
  EM_ANALISE: { label: "Em análise", icon: FiActivity, scheme: "yellow" },
  AGUARDANDO_PECA: { label: "Aguardando peça", icon: FiPackage, scheme: "orange" },
  AGUARDANDO_APROVACAO_ORCAMENTO: {
    label: "Aguardando aprovação",
    icon: FiPauseCircle,
    scheme: "purple",
  },
  EM_EXECUCAO: { label: "Em execução", icon: FiPlayCircle, scheme: "blue" },
  CONCLUIDO: { label: "Concluído", icon: FiCheckCircle, scheme: "green" },
  CANCELADO: { label: "Cancelado", icon: FiXCircle, scheme: "red" },
};

function fmt(ts: number) {
  return new Date(ts).toLocaleString();
}

export function StatusTimeline({
  currentStatus,
  history,
}: {
  currentStatus: WorkOrderStatus;
  history: WorkOrderStatusEvent[];
}) {
  // ordena do mais antigo → mais novo, pra ficar “linha do tempo”
  const ordered = [...history].sort((a, b) => a.changedAt - b.changedAt);

  return (
    <Stack spacing={3}>
      <HStack justify="space-between">
        <Text fontWeight="800">Linha do tempo</Text>
        <Badge borderRadius="999px" px={2} colorScheme={STATUS_META[currentStatus].scheme}>
          Status atual: {STATUS_META[currentStatus].label}
        </Badge>
      </HStack>

      <Stack spacing={0}>
        {ordered.length === 0 ? (
          <HStack p={3} borderWidth="1px" borderRadius="14px">
            <FiClock />
            <Text color="gray.600">Sem histórico ainda.</Text>
          </HStack>
        ) : (
          ordered.map((ev, idx) => {
            const meta = STATUS_META[ev.to];
            const Icon = meta.icon;
            const isLast = idx === ordered.length - 1;

            return (
              <HStack key={ev.id} align="start" spacing={3}>
                <Stack align="center" spacing={0}>
                  <Box
                    mt={1}
                    w="34px"
                    h="34px"
                    borderRadius="999px"
                    display="grid"
                    placeItems="center"
                    borderWidth="1px"
                    borderColor="blackAlpha.200"
                  >
                    <Icon />
                  </Box>
                  {!isLast ? (
                    <Box w="2px" flex="1" minH="26px" bg="blackAlpha.200" />
                  ) : null}
                </Stack>

                <Box flex="1" pb={4}>
                  <HStack justify="space-between" wrap="wrap">
                    <HStack>
                      <Badge borderRadius="999px" px={2} colorScheme={meta.scheme}>
                        {meta.label}
                      </Badge>
                      {ev.from ? (
                        <Text fontSize="sm" color="gray.600">
                          {ev.from} → {ev.to}
                        </Text>
                      ) : null}
                    </HStack>

                    <Text fontSize="sm" color="gray.600">
                      {fmt(ev.changedAt)}
                    </Text>
                  </HStack>

                  {ev.note ? (
                    <Text mt={1} fontSize="sm">
                      {ev.note}
                    </Text>
                  ) : (
                    <Text mt={1} fontSize="sm" color="gray.500">
                      Sem nota
                    </Text>
                  )}
                </Box>
              </HStack>
            );
          })
        )}
      </Stack>
    </Stack>
  );
}
