import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { FinanceReceivable, PaymentMethod } from "../lib/firebase/finance.types";
import { labelReceivableStatus, markReceivablePaid, subscribeReceivables } from "../lib/firebase/finance.db";

function brl(v: number) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmt(ts?: number | null) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("pt-BR");
}

export default function FinancePage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinanceReceivable[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"PENDENTE" | "PAGO">("PENDENTE");

  // modal pagamento
  const payModal = useDisclosure();
  const [selected, setSelected] = useState<FinanceReceivable | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [note, setNote] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeReceivables(setRows);
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows
      .filter((r) => (tab === "PENDENTE" ? r.status === "PENDENTE" : r.status === "PAGO"))
      .filter((r) => {
        if (!query) return true;
        const hay = [
          r.workOrderCode,
          r.workOrderId,
          r.clientName,
          r.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }, [rows, q, tab]);

  function openPay(r: FinanceReceivable) {
    setSelected(r);
    setMethod("PIX");
    setNote("");
    payModal.onOpen();
  }

  async function confirmPay() {
    if (!selected) return;
    setIsSaving(true);
    try {
      await markReceivablePaid({
        receivableId: selected.id,
        method,
        note: note.trim() ? note.trim() : null,
      });
      toast({ status: "success", title: "Pagamento registrado" });
      payModal.onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ status: "error", title: "Erro ao registrar pagamento", description: msg });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Stack spacing={4}>
      <Card>
        <CardBody>
          <HStack justify="space-between" align="start" spacing={4} flexWrap="wrap">
            <Box>
              <Text fontSize="lg" fontWeight={900}>
                Financeiro
              </Text>
              <Text color="gray.600" fontSize="sm">
                Títulos gerados a partir de OS concluídas + orçamentos aprovados.
              </Text>
            </Box>

            <Box minW={{ base: "100%", md: "360px" }}>
              <Input
                placeholder="Buscar por OS, cliente, descrição..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </Box>
          </HStack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Tabs
            variant="enclosed"
            index={tab === "PENDENTE" ? 0 : 1}
            onChange={(i) => setTab(i === 0 ? "PENDENTE" : "PAGO")}
          >
            <TabList>
              <Tab>Pendentes</Tab>
              <Tab>Pagos</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <ReceivablesTable
                  rows={filtered}
                  onOpenOS={(r) => navigate(`/app/work-orders/${r.workOrderId}`)}
                  onPay={openPay}
                  showPay
                />
              </TabPanel>
              <TabPanel px={0}>
                <ReceivablesTable
                  rows={filtered}
                  onOpenOS={(r) => navigate(`/app/work-orders/${r.workOrderId}`)}
                  onPay={openPay}
                  showPay={false}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>

      {/* Modal pagamento */}
      <Modal isOpen={payModal.isOpen} onClose={payModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="18px">
          <ModalHeader>Registrar pagamento</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <Box>
                <Text fontWeight={800}>{selected?.description}</Text>
                <Text color="gray.600" fontSize="sm">
                  Valor: <b>{brl(selected?.amount ?? 0)}</b>
                </Text>
              </Box>

              <Divider />

              <FormControl>
                <FormLabel>Método</FormLabel>
                <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  <option value="PIX">PIX</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="CARTAO">Cartão</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="OUTRO">Outro</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Observação (opcional)</FormLabel>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
              </FormControl>

              <Text fontSize="sm" color="gray.600">
                Ao confirmar, o título será marcado como <b>PAGO</b> e ficará no histórico.
              </Text>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={payModal.onClose}>
              Cancelar
            </Button>
            <Button colorScheme="green" onClick={confirmPay} isLoading={isSaving}>
              Confirmar pagamento
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}

function ReceivablesTable(props: {
  rows: FinanceReceivable[];
  onOpenOS: (r: FinanceReceivable) => void;
  onPay: (r: FinanceReceivable) => void;
  showPay: boolean;
}) {
  const { rows, onOpenOS, onPay, showPay } = props;

  if (rows.length === 0) {
    return <Text color="gray.600">Nenhum registro.</Text>;
  }

  return (
    <Stack spacing={2}>
      {rows.map((r) => {
        const st = labelReceivableStatus(r.status);
        return (
          <Box
            key={r.id}
            p={4}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="16px"
            bg="white"
          >
            <HStack justify="space-between" align="start" flexWrap="wrap" spacing={4}>
              <Box>
                <HStack spacing={2} mb={1} flexWrap="wrap">
                  <Badge colorScheme={st.scheme} borderRadius="999px" px={2}>
                    {st.label}
                  </Badge>
                  {r.workOrderCode ? (
                    <Badge variant="subtle" borderRadius="999px" px={2}>
                      {r.workOrderCode}
                    </Badge>
                  ) : null}
                  {r.clientName ? (
                    <Badge variant="subtle" borderRadius="999px" px={2}>
                      {r.clientName}
                    </Badge>
                  ) : null}
                </HStack>

                <Text fontWeight={900}>{r.description}</Text>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Valor: <b>{brl(r.amount)}</b>
                  {r.approvedAt ? ` • Aprovado: ${fmt(r.approvedAt)}` : ""}
                  {r.concludedAt ? ` • Concluído: ${fmt(r.concludedAt)}` : ""}
                  {r.paidAt ? ` • Pago: ${fmt(r.paidAt)}` : ""}
                </Text>
              </Box>

              <HStack>
                <Button size="sm" variant="outline" onClick={() => onOpenOS(r)}>
                  Abrir OS
                </Button>
                {showPay ? (
                  <Button size="sm" colorScheme="green" onClick={() => onPay(r)}>
                    Marcar como pago
                  </Button>
                ) : null}
              </HStack>
            </HStack>
          </Box>
        );
      })}
    </Stack>
  );
}
