import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  HStack,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { FiFileText, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import type { Client, Vessel, Equipment, WorkOrder } from "../lib/firebase/db";
import {
  subscribeClients,
  subscribeVessels,
  subscribeEquipment,
  subscribeWorkOrders,
} from "../lib/firebase/db";

import { subscribeReportsIndex, type ReportSummary } from "../lib/firebase/reports.db";

function minutesAgo(ts?: number) {
  if (!ts) return "-";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

export default function ReportsListPage() {
  const navigate = useNavigate();

  const [q, setQ] = useState("");

  const [clients, setClients] = useState<Client[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [reportsIdx, setReportsIdx] = useState<Record<string, ReportSummary>>({});

  useEffect(() => {
    const u1 = subscribeClients(setClients);
    const u2 = subscribeVessels(setVessels);
    const u3 = subscribeEquipment(setEquipment);
    const u4 = subscribeWorkOrders(setWorkOrders);
    const u5 = subscribeReportsIndex(setReportsIdx);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const vesselMap = useMemo(() => new Map(vessels.map((v) => [v.id, v])), [vessels]);
  const equipmentMap = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);

  const rows = useMemo(() => {
    // mantém só OS que possuem report
    const withReport = workOrders
      .filter((wo) => !!reportsIdx[wo.id])
      .map((wo) => {
        const rep = reportsIdx[wo.id];
        const clientName = clientMap.get(wo.clientId)?.name || "-";
        const vesselName = wo.vesselId ? (vesselMap.get(wo.vesselId)?.name || "-") : "-";
        const equipmentName = wo.equipmentId ? (equipmentMap.get(wo.equipmentId)?.name || "-") : "-";
        const updatedAt = rep?.updatedAt || wo.updatedAt || 0;

        const searchText = [
          wo.code,
          wo.id,
          clientName,
          vesselName,
          equipmentName,
          rep?.serviceDate ?? "",
          wo.reportedDefect ?? "",
        ].join(" ").toLowerCase();

        return {
          id: wo.id,
          code: wo.code || "PENDING",
          status: wo.status,
          priority: wo.priority,
          clientName,
          vesselName,
          equipmentName,
          serviceDate: rep?.serviceDate ?? "-",
          updatedAt,
          searchText,
        };
      });

    // mais recentes primeiro
    withReport.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return withReport;
  }, [workOrders, reportsIdx, clientMap, vesselMap, equipmentMap]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((r) => r.searchText.includes(qq));
  }, [rows, q]);

  return (
    <Stack spacing={4}>
      <HStack justify="space-between" align="start">
        <Box>
          <Heading size="md">Relatórios</Heading>
          <Text mt={1} color="gray.600">
            Lista de relatórios já gerados (1 por OS).
          </Text>
        </Box>

        <InputGroup maxW="420px">
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por OS, cliente, embarcação, equipamento..."
          />
        </InputGroup>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {filtered.length === 0 ? (
          <Card>
            <CardBody>
              <Text color="gray.600">
                Nenhum relatório encontrado. Gere um relatório dentro de uma OS.
              </Text>
            </CardBody>
          </Card>
        ) : (
          filtered.map((r) => (
            <Card key={r.id} border="1px solid" borderColor="gray.200" borderRadius="18px">
              <CardBody>
                <HStack justify="space-between" align="start">
                  <Box>
                    <HStack spacing={2}>
                      <Icon as={FiFileText} />
                      <Text fontWeight="900">{r.code}</Text>
                    </HStack>
                    <Text mt={1} color="gray.600" fontSize="sm">
                      {r.clientName} • {r.vesselName} • {r.equipmentName}
                    </Text>
                    <Text mt={1} color="gray.600" fontSize="sm">
                      Data do atendimento: <b>{r.serviceDate}</b>
                    </Text>
                    <Text mt={1} color="gray.500" fontSize="xs">
                      Atualizado: {minutesAgo(r.updatedAt)}
                    </Text>

                    <HStack mt={3} spacing={2}>
                      <Badge variant="subtle">{r.status}</Badge>
                      <Badge variant="subtle">{r.priority}</Badge>
                    </HStack>
                  </Box>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/app/reports/${r.id}`)}
                  >
                    Abrir
                  </Button>
                </HStack>
              </CardBody>
            </Card>
          ))
        )}
      </SimpleGrid>
    </Stack>
  );
}