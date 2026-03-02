import {
  IconButton,
  Input,
  NumberInput,
  NumberInputField,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tfoot,
  Box,
  Button,
  Heading,
  HStack,
  Stack,
  Text,
  SimpleGrid,
} from "@chakra-ui/react";
import { DeleteIcon, AddIcon } from "@chakra-ui/icons";
import { useEffect, useMemo, useState } from "react";
import { upsertHourEntry, removeHourEntry } from "../../lib/firebase/budgets.db";
import type { Budget, HourEntry, HourRates } from "../../lib/firebase/budgets.types";

type HourEntryPatch = Omit<
  Partial<HourEntry>,
  "rates" | "rowTotal" | "id" | "date"
> & {
  // horas/editáveis + start/end, etc.
  date?: string;
};

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normaliza rates:
 * - Se rates de traslado não existirem, herdam do normal/extra.
 * - Não força fallback quando é 0 (0 pode ser válido).
 */
function normalizeRates(r?: Partial<HourRates> | null): HourRates {
  const base: HourRates = {
    techNormal: toNum(r?.techNormal),
    techExtra: toNum(r?.techExtra),
    auxNormal: toNum(r?.auxNormal),
    auxExtra: toNum(r?.auxExtra),
    techTravelNormal: r?.techTravelNormal,
    techTravelExtra: r?.techTravelExtra,
    auxTravelNormal: r?.auxTravelNormal,
    auxTravelExtra: r?.auxTravelExtra,
  };

  // Para taxas de deslocamento, trate 0 (ou <=0) como "não definido" para herdar automaticamente
  const asTravel = (v: unknown) => {
    if (v == null) return null;
    const n = toNum(v as any);
    return n > 0 ? n : null;
  };

  const techTravelNormal =
    asTravel(base.techTravelNormal) == null ? base.techNormal : asTravel(base.techTravelNormal)!;
  const techTravelExtra =
    asTravel(base.techTravelExtra) == null ? base.techExtra : asTravel(base.techTravelExtra)!;
  const auxTravelNormal =
    asTravel(base.auxTravelNormal) == null ? base.auxNormal : asTravel(base.auxTravelNormal)!;
  const auxTravelExtra =
    asTravel(base.auxTravelExtra) == null ? base.auxExtra : asTravel(base.auxTravelExtra)!;

  return {
    techNormal: base.techNormal,
    techExtra: base.techExtra,
    auxNormal: base.auxNormal,
    auxExtra: base.auxExtra,
    techTravelNormal,
    techTravelExtra,
    auxTravelNormal,
    auxTravelExtra,
  };
}

function calcRowTotal(e: Omit<HourEntry, "rowTotal">) {
  const r = normalizeRates(e.rates);

  return (
    toNum(e.techNormalHours) * toNum(r.techNormal) +
    toNum(e.techExtraHours) * toNum(r.techExtra) +
    toNum(e.auxNormalHours) * toNum(r.auxNormal) +
    toNum(e.auxExtraHours) * toNum(r.auxExtra) +
    toNum(e.techTravelNormalHours) * toNum(r.techTravelNormal) +
    toNum(e.techTravelExtraHours) * toNum(r.techTravelExtra) +
    toNum(e.auxTravelNormalHours) * toNum(r.auxTravelNormal) +
    toNum(e.auxTravelExtraHours) * toNum(r.auxTravelExtra)
  );
}

// TOTAL HH (serviço, sem deslocamento)
function calcServiceHours(e: HourEntry) {
  return (
    toNum(e.techNormalHours) +
    toNum(e.techExtraHours) +
    toNum(e.auxNormalHours) +
    toNum(e.auxExtraHours)
  );
}

// TOTAL HH (só deslocamento)
function calcTravelHours(e: HourEntry) {
  return (
    toNum(e.techTravelNormalHours) +
    toNum(e.techTravelExtraHours) +
    toNum(e.auxTravelNormalHours) +
    toNum(e.auxTravelExtraHours)
  );
}

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function BudgetHours({ budget }: { budget: Budget }) {
  const isByHour = budget.pricing === "POR_HORA";

  // ✅ defaultRates normalizado: se traslado não vier, herda do normal/extra
  const defaultRates: HourRates = useMemo(() => {
    const raw = budget.defaultRates ?? {
      techNormal: 0,
      techExtra: 0,
      auxNormal: 0,
      auxExtra: 0,
      // deixa traslado como undefined por padrão para herdar automaticamente
      techTravelNormal: undefined,
      techTravelExtra: undefined,
      auxTravelNormal: undefined,
      auxTravelExtra: undefined,
    };
    return normalizeRates(raw);
  }, [budget.defaultRates]);

  // ✅ estado local para UI responder na hora
  const [localEntries, setLocalEntries] = useState<HourEntry[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // ✅ sincroniza do RTDB -> local (e normaliza rates por linha)
  useEffect(() => {
    if (!isByHour) {
      setLocalEntries([]);
      return;
    }
    const arr = budget.hourEntries ? Object.values(budget.hourEntries) : [];
    const normalized = arr.map((e) => ({
      ...e,
      rates: normalizeRates(e.rates),
    }));
    const sorted = [...normalized].sort((a, b) =>
      (a.date ?? "").localeCompare(b.date ?? "")
    );
    setLocalEntries(sorted);
  }, [isByHour, budget.hourEntries]);

  const entries = localEntries;

  // ✅ totalizadores solicitados (baseado no que está na tela)
  const totalHH = useMemo(
    () => entries.reduce((acc, e) => acc + calcServiceHours(e), 0),
    [entries]
  );
  const totalTravelHH = useMemo(
    () => entries.reduce((acc, e) => acc + calcTravelHours(e), 0),
    [entries]
  );
  const totalValue = useMemo(
    () => entries.reduce((acc, e) => acc + toNum(e.rowTotal), 0),
    [entries]
  );

  async function addRow() {
    if (!isByHour) return;

    const id = crypto.randomUUID();
    const base: Omit<HourEntry, "rowTotal"> = {
      id,
      date: todayISO(),
      start: "",
      end: "",
      techNormalHours: 0,
      techExtraHours: 0,
      auxNormalHours: 0,
      auxExtraHours: 0,
      techTravelNormalHours: 0,
      techTravelExtraHours: 0,
      auxTravelNormalHours: 0,
      auxTravelExtraHours: 0,
      rates: { ...defaultRates },
    };

    const rowTotal = calcRowTotal(base);
    const next: HourEntry = { ...base, rowTotal };

    setLocalEntries((prev) =>
      [...prev, next].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    );

    // salva já com rates completos/normalizados
    await upsertHourEntry(budget.id, next);
  }

  async function updateRow(rowId: string, patch: HourEntryPatch) {
    if (!isByHour) return;

    let nextRow: HourEntry | null = null;

    setLocalEntries((prev) => {
      const updated = prev.map((e) => {
        if (e.id !== rowId) return e;

        const nextBase: Omit<HourEntry, "rowTotal"> = {
          ...e,
          ...patch,
          // rates ficam sempre os mesmos (read-only na UI)
          rates: normalizeRates(e.rates ?? defaultRates),
        };

        const rowTotal = calcRowTotal(nextBase);
        nextRow = { ...nextBase, rowTotal };

        return nextRow!;
      });

      return updated;
    });

    if (!nextRow) return;

    try {
      setSavingId(rowId);
      await upsertHourEntry(budget.id, nextRow);
    } finally {
      setSavingId(null);
    }
  }

  async function delRow(rowId: string) {
    if (!isByHour) return;
    setLocalEntries((prev) => prev.filter((e) => e.id !== rowId));
    await removeHourEntry(budget.id, rowId);
  }

  if (!isByHour) {
    return (
      <Text color="gray.600" fontSize="sm">
        Este orçamento não é “por hora”.
      </Text>
    );
  }

  const W_DATE = 160;
  const W_TIME = 120;

  const stickyHead = (left: number) => ({
    position: "sticky" as const,
    left,
    bg: "gray.50",
    zIndex: 3,
    boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
  });

  const stickyCell = (left: number) => ({
    position: "sticky" as const,
    left,
    bg: "white",
    zIndex: 2,
    boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
  });

  const numFieldProps = {
    textAlign: "right" as const,
    minW: "92px",
    w: "92px",
    px: 2,
  };

  // ✅ campo read-only visualmente igual ao NumberInput
  function RateCell({ value }: { value: number }) {
    return (
      <NumberInput value={String(value ?? 0)} min={0} precision={2} size="sm" isReadOnly>
        <NumberInputField {...numFieldProps} readOnly bg="gray.50" />
      </NumberInput>
    );
  }

  return (
    <Stack spacing={4}>
      <HStack justify="space-between">
        <Box>
          <Heading size="sm">Horas do atendimento</Heading>
          <Text fontSize="sm" color="gray.600">
            Digite as horas. Os valores/hora são automáticos (herdam do orçamento).
          </Text>
        </Box>

        <Button leftIcon={<AddIcon />} onClick={addRow} colorScheme="brand" size="sm">
          Adicionar linha
        </Button>
      </HStack>

      {/* ✅ Totalizadores solicitados */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
        <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="16px" bg="white">
          <Text fontSize="sm" color="gray.600">TOTAL HH (serviço)</Text>
          <Text fontSize="2xl" fontWeight="900">{totalHH.toFixed(2)}</Text>
        </Box>

        <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="16px" bg="white">
          <Text fontSize="sm" color="gray.600">TOTAL HH (traslado)</Text>
          <Text fontSize="2xl" fontWeight="900">{totalTravelHH.toFixed(2)}</Text>
        </Box>

        <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="16px" bg="white">
          <Text fontSize="sm" color="gray.600">VALOR TOTAL (linhas)</Text>
          <Text fontSize="2xl" fontWeight="900">{brl(totalValue)}</Text>
        </Box>
      </SimpleGrid>

      <Box
        overflowX="auto"
        overflowY="hidden"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="16px"
      >
        <Table size="sm" minW="1850px">
          <Thead bg="gray.50">
            <Tr>
              <Th {...stickyHead(0)} rowSpan={2}>Data</Th>
              <Th {...stickyHead(W_DATE)} rowSpan={2}>Início</Th>
              <Th {...stickyHead(W_DATE + W_TIME)} rowSpan={2}>Fim</Th>

              <Th colSpan={8} textAlign="center">Técnico</Th>
              <Th colSpan={8} textAlign="center">Auxiliar</Th>

              <Th isNumeric rowSpan={2}>Total</Th>
              <Th rowSpan={2} />
            </Tr>

            <Tr>
              <Th isNumeric>HH Normal</Th>
              <Th isNumeric>R$/h</Th>
              <Th isNumeric>HH Extra</Th>
              <Th isNumeric>R$/h</Th>
              <Th isNumeric>HH Desloc Normal</Th>
              <Th isNumeric>R$/h</Th>
              <Th isNumeric>HH Desloc Extra</Th>
              <Th isNumeric>R$/h</Th>

              <Th isNumeric>HH Normal</Th>
              <Th isNumeric>R$/h</Th>
              <Th isNumeric>HH Extra</Th>
              <Th isNumeric>R$/h</Th>
              <Th isNumeric>HH Desloc Normal</Th>
              <Th isNumeric>R$/h</Th>
              <Th isNumeric>HH Desloc Extra</Th>
              <Th isNumeric>R$/h</Th>
            </Tr>
          </Thead>

          <Tbody>
            {entries.map((e) => {
              const r = normalizeRates(e.rates ?? defaultRates);

              return (
                <Tr key={e.id} opacity={savingId === e.id ? 0.6 : 1}>
                  <Td {...stickyCell(0)}>
                    <Input
                      type="date"
                      value={e.date}
                      onChange={(ev) => updateRow(e.id, { date: ev.target.value })}
                      size="sm"
                      minW={`${W_DATE}px`}
                    />
                  </Td>

                  <Td {...stickyCell(W_DATE)}>
                    <Input
                      type="time"
                      value={e.start ?? ""}
                      onChange={(ev) => updateRow(e.id, { start: ev.target.value })}
                      size="sm"
                      minW={`${W_TIME}px`}
                    />
                  </Td>

                  <Td {...stickyCell(W_DATE + W_TIME)}>
                    <Input
                      type="time"
                      value={e.end ?? ""}
                      onChange={(ev) => updateRow(e.id, { end: ev.target.value })}
                      size="sm"
                      minW={`${W_TIME}px`}
                    />
                  </Td>

                  {/* TÉCNICO */}
                  <Td isNumeric>
                    <NumberInput
                      value={String(e.techNormalHours ?? 0)}
                      min={0}
                      precision={2}
                      onChange={(s) => updateRow(e.id, { techNormalHours: toNum(s) })}
                      size="sm"
                    >
                      <NumberInputField {...numFieldProps} />
                    </NumberInput>
                  </Td>
                  <Td isNumeric><RateCell value={toNum(r.techNormal)} /></Td>

                  <Td isNumeric>
                    <NumberInput
                      value={String(e.techExtraHours ?? 0)}
                      min={0}
                      precision={2}
                      onChange={(s) => updateRow(e.id, { techExtraHours: toNum(s) })}
                      size="sm"
                    >
                      <NumberInputField {...numFieldProps} />
                    </NumberInput>
                  </Td>
                  <Td isNumeric><RateCell value={toNum(r.techExtra)} /></Td>

                  <Td isNumeric>
                    <NumberInput
                      value={String(e.techTravelNormalHours ?? 0)}
                      min={0}
                      precision={2}
                      onChange={(s) => updateRow(e.id, { techTravelNormalHours: toNum(s) })}
                      size="sm"
                    >
                      <NumberInputField {...numFieldProps} />
                    </NumberInput>
                  </Td>
                  <Td isNumeric><RateCell value={toNum(r.techTravelNormal)} /></Td>

                  <Td isNumeric>
                    <NumberInput
                      value={String(e.techTravelExtraHours ?? 0)}
                      min={0}
                      precision={2}
                      onChange={(s) => updateRow(e.id, { techTravelExtraHours: toNum(s) })}
                      size="sm"
                    >
                      <NumberInputField {...numFieldProps} />
                    </NumberInput>
                  </Td>
                  <Td isNumeric><RateCell value={toNum(r.techTravelExtra)} /></Td>

                  {/* AUXILIAR */}
                  <Td isNumeric>
                    <NumberInput
                      value={String(e.auxNormalHours ?? 0)}
                      min={0}
                      precision={2}
                      onChange={(s) => updateRow(e.id, { auxNormalHours: toNum(s) })}
                      size="sm"
                    >
                      <NumberInputField {...numFieldProps} />
                    </NumberInput>
                  </Td>
                  <Td isNumeric><RateCell value={toNum(r.auxNormal)} /></Td>

                  <Td isNumeric>
                    <NumberInput
                      value={String(e.auxExtraHours ?? 0)}
                      min={0}
                      precision={2}
                      onChange={(s) => updateRow(e.id, { auxExtraHours: toNum(s) })}
                      size="sm"
                    >
                      <NumberInputField {...numFieldProps} />
                    </NumberInput>
                  </Td>
                  <Td isNumeric><RateCell value={toNum(r.auxExtra)} /></Td>

                  <Td isNumeric>
                    <NumberInput
                      value={String(e.auxTravelNormalHours ?? 0)}
                      min={0}
                      precision={2}
                      onChange={(s) => updateRow(e.id, { auxTravelNormalHours: toNum(s) })}
                      size="sm"
                    >
                      <NumberInputField {...numFieldProps} />
                    </NumberInput>
                  </Td>
                  <Td isNumeric><RateCell value={toNum(r.auxTravelNormal)} /></Td>

                  <Td isNumeric>
                    <NumberInput
                      value={String(e.auxTravelExtraHours ?? 0)}
                      min={0}
                      precision={2}
                      onChange={(s) => updateRow(e.id, { auxTravelExtraHours: toNum(s) })}
                      size="sm"
                    >
                      <NumberInputField {...numFieldProps} />
                    </NumberInput>
                  </Td>
                  <Td isNumeric><RateCell value={toNum(r.auxTravelExtra)} /></Td>

                  <Td isNumeric fontWeight="800">
                    {brl(e.rowTotal ?? 0)}
                  </Td>

                  <Td textAlign="right">
                    <IconButton
                      aria-label="Remover"
                      icon={<DeleteIcon />}
                      size="sm"
                      variant="ghost"
                      onClick={() => delRow(e.id)}
                    />
                  </Td>
                </Tr>
              );
            })}
          </Tbody>

          <Tfoot>
            <Tr bg="gray.50">
              <Th colSpan={19} textAlign="right">Subtotal:</Th>
              <Th isNumeric fontWeight="900">{brl(budget.subtotal ?? 0)}</Th>
              <Th />
            </Tr>

            <Tr bg="gray.50">
              <Th colSpan={19} textAlign="right">ISS ({budget.issPercent ?? 0}%):</Th>
              <Th isNumeric fontWeight="900">{brl(budget.issValue ?? 0)}</Th>
              <Th />
            </Tr>

            <Tr bg="gray.50">
              <Th colSpan={19} textAlign="right">Total:</Th>
              <Th isNumeric fontWeight="900">{brl(budget.total ?? 0)}</Th>
              <Th />
            </Tr>
          </Tfoot>
        </Table>
      </Box>
    </Stack>
  );
}