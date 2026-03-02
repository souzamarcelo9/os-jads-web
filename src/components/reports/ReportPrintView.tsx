import { Box, Divider, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import type { WorkOrderReport } from "../../lib/firebase/reports.types";
import type { Client, Vessel, Equipment, WorkOrder } from "../../lib/firebase/db";
//import  GodWritesLogo  from "../../../public/brand/godwrites-logo.jpg";

function safe(v: unknown) {
  if (v === null || v === undefined) return "-";
  const s = String(v).trim();
  return s.length ? s : "-";
}

function fmtDateBR(iso?: string | null) {
  if (!iso) return "-";
  // espera YYYY-MM-DD
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <HStack justify="space-between" align="start" spacing={6}>
      <Text fontSize="sm" color="gray.600" minW="220px">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="600" flex="1" textAlign="right">
        {value}
      </Text>
    </HStack>
  );
}

export function ReportPrintView(props: {
  report: WorkOrderReport;
  workOrder: WorkOrder;
  client: Client | null;
  vessel: Vessel | null;
  equipment: Equipment | null;
}) {
  const { report, workOrder, client, vessel, equipment } = props;

  return (
    <Box p={8} bg="white" color="black">
      <HStack justify="space-between" align="start">
        <Box>
          {/* <GodWritesLogo variant="print" />
          <Text fontSize="sm" color="gray.600" mt={2}>
            Automação Hidráulica Móvel • Eletrônica • Offshore • Embarcações
          </Text> */}
        </Box>

        <Box textAlign="right">
          <Heading size="md">RELATÓRIO DE PRESTAÇÃO</Heading>
          <Heading size="md">DE SERVIÇO TÉCNICO</Heading>
          <Text fontSize="sm" mt={2}>
            OS: <b>{safe(workOrder.code)}</b>
          </Text>
        </Box>
      </HStack>

      <Divider my={6} />

      <Stack spacing={2}>
        <Heading size="sm">DADOS DO ATENDIMENTO</Heading>

        <Line label="Data do atendimento" value={fmtDateBR(report.serviceDate)} />
        <Line label="Navio / Casco" value={safe(report.vesselName ?? vessel?.name)} />
        <Line label="Cliente" value={safe(client?.name)} />
        <Line label="Localização" value={safe(report.location)} />
        <Line label="IMO" value={safe(report.imo)} />
        <Line label="Armador" value={safe(report.shipOwner)} />
        <Line label="Call Sign" value={safe(report.callSign)} />
        <Line label="Técnico" value={safe(report.technician)} />
      </Stack>

      <Divider my={6} />

      <Stack spacing={2}>
        <Heading size="sm">IDENTIFICAÇÃO DO EQUIPAMENTO</Heading>

        <Line label="Equipamento" value={safe(report.equipmentName ?? equipment?.name)} />
        {/* <Line label="Modelo" value={safe(report.equipmentModel)} />
        <Line label="Série" value={safe(report.equipmentSerial)} /> */}
      </Stack>

      <Divider my={6} />

      <Stack spacing={4}>
        <Heading size="sm">RELATO</Heading>

        <Box>
          <Text fontSize="sm" color="gray.600" mb={1}>
            Defeito / solicitação
          </Text>
          <Text whiteSpace="pre-wrap" fontSize="sm">
            {/* {safe(report.reportedIssue ?? workOrder.reportedDefect)} */}
          </Text>
        </Box>

        <Box>
          <Text fontSize="sm" color="gray.600" mb={1}>
            Atividades realizadas
          </Text>
          <Text whiteSpace="pre-wrap" fontSize="sm">
           {/*  {safe(report.activities)} */}
          </Text>
        </Box>

        <Box>
          <Text fontSize="sm" color="gray.600" mb={1}>
            Conclusão / recomendações
          </Text>
          <Text whiteSpace="pre-wrap" fontSize="sm">
            {safe(report.conclusion)}
          </Text>
        </Box>
      </Stack>

      <Divider my={8} />

      <Stack spacing={3}>
        <Heading size="sm">TERMO DE ACEITE DO CLIENTE</Heading>
        <Text fontSize="sm" color="gray.700">
          Declaro que o serviço descrito foi executado e apresentado.
        </Text>

        <HStack justify="space-between" mt={8}>
          <Box w="48%">
            <Box borderTop="1px solid" borderColor="gray.400" pt={2}>
              <Text fontSize="sm" fontWeight="700">
                {safe(report.technician)}
              </Text>
              <Text fontSize="xs" color="gray.600">
                Técnico (God Writes)
              </Text>
            </Box>
          </Box>

          <Box w="48%">
            <Box borderTop="1px solid" borderColor="gray.400" pt={2}>
              <Text fontSize="sm" fontWeight="700">
                {safe(report.shipOwner)}
              </Text>
              <Text fontSize="xs" color="gray.600">
                {safe(report.callSign)}
              </Text>
            </Box>
          </Box>
        </HStack>
      </Stack>

      <Text fontSize="xs" color="gray.500" mt={10}>
        Documento gerado pelo sistema God Writes.
      </Text>
    </Box>
  );
}
