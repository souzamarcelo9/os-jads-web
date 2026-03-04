import {
    Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { get, ref } from "firebase/database";
import { rtdb } from "../../lib/firebase/firebase";
import { createBudget } from "../../lib/firebase/budgets.db";
import type { Budget, BudgetKind, BudgetPricing, HourRates } from "../../lib/firebase/budgets.types";

export function CreateBudgetModal(props: {
    isOpen: boolean;
    onClose: () => void;
    workOrderId: string;
    createdByUid: string;
    defaultKind?: BudgetKind;
    onCreated?: (b: Budget) => void;
  }) {
    const toast = useToast();

    const [kind, setKind] = useState<BudgetKind>(props.defaultKind ?? "SERVICO");
    const [pricing, setPricing] = useState<BudgetPricing>("FECHADO");
    const [issPercent, setIssPercent] = useState<number>(5);

    // valores default por hora (editáveis)
    const [rates, setRates] = useState<HourRates>({
      techNormal: 250,
      techExtra: 350,
      auxNormal: 150,
      auxExtra: 220,
      techTravelNormal: 0,
      techTravelExtra: 0,
      auxTravelNormal: 0,
      auxTravelExtra: 0,
    });

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
      if (!props.isOpen) return;
      // reseta defaults quando abre (opcional)
      setKind(props.defaultKind ?? "SERVICO");
      setPricing("FECHADO");
      setIssPercent(5);
    }, [props.isOpen, props.defaultKind]);

    async function onCreate() {
      try {
        setIsSaving(true);
        // ✅ Regra do novo fluxo:
        // - Para orçamento de SERVIÇO, o relatório deve existir antes.
        // - Para POR_HORA, o relatório deve ter a "Demonstração Geral de Horas Trabalhadas" preenchida.
        if (kind === "SERVICO") {
          const repSnap = await get(ref(rtdb, `/tenants/default/reports/${props.workOrderId}`));
          if (!repSnap.exists()) {
            toast({
              status: "warning",
              title: "Preencha o relatório antes do orçamento",
              description: "Abra o Relatório (editar / imprimir), preencha e salve. Depois crie o orçamento.",
            });
            return;
          }

          if (pricing === "POR_HORA") {
            const rep = repSnap.val() as { workedHours?: Record<string, unknown> | null };
            const hasRows = !!rep.workedHours && Object.keys(rep.workedHours).length > 0;
            if (!hasRows) {
              toast({
                status: "warning",
                title: "Informe as horas no relatório",
                description: "Preencha a tabela 'Demonstração Geral de Horas Trabalhadas' no relatório antes de criar o orçamento por horas.",
              });
              return;
            }
          }
        }

        const title =
          kind === "ANALISE"
            ? "Orçamento de Análise"
            : pricing === "POR_HORA"
            ? "Orçamento por Hora"
            : "Orçamento Fechado";

        const b = await createBudget({
          workOrderId: props.workOrderId,
          kind,
          pricing,
          createdByUid: props.createdByUid,
          title,
          issPercent,
          defaultRates: pricing === "POR_HORA" ? rates : undefined,
          version: 1,
        });

        toast({ status: "success", title: "Orçamento criado" });
        props.onClose();
        props.onCreated?.(b);
      } catch (e: unknown) {
        toast({
          status: "error",
          title: "Erro ao criar orçamento",
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setIsSaving(false);
      }
    }

    return (
      <Modal isOpen={props.isOpen} onClose={props.onClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="18px">
          <ModalHeader>Criar orçamento</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Tipo</FormLabel>
                <Select value={kind} onChange={(e) => setKind(e.target.value as BudgetKind)}>
                  <option value="ANALISE">Análise</option>
                  <option value="SERVICO">Serviço</option>
                </Select>
                <FormHelperText>
                  Interno pode ter análise + serviço. Externo normalmente é serviço.
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Modelo de cálculo</FormLabel>
                <Select value={pricing} onChange={(e) => setPricing(e.target.value as BudgetPricing)}>
                  <option value="FECHADO">Fechado (valor editável)</option>
                  <option value="POR_HORA">Por hora (tabela de horas)</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>ISS (%)</FormLabel>
                <NumberInput value={issPercent} min={0} max={30} precision={2} onChange={(_, n) => setIssPercent(Number.isFinite(n) ? n : 0)}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              {pricing === "POR_HORA" ? (
                <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="16px" bg="gray.50">
                  <Text fontWeight="900" mb={3}>Valor/hora default</Text>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    <FormControl>
                      <FormLabel>Téc. normal</FormLabel>
                      <NumberInput value={rates.techNormal} min={0} onChange={(_, n) => setRates((r) => ({ ...r, techNormal: Number.isFinite(n) ? n : 0 }))}>
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Téc. extra</FormLabel>
                      <NumberInput value={rates.techExtra} min={0} onChange={(_, n) => setRates((r) => ({ ...r, techExtra: Number.isFinite(n) ? n : 0 }))}>
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Aux. normal</FormLabel>
                      <NumberInput value={rates.auxNormal} min={0} onChange={(_, n) => setRates((r) => ({ ...r, auxNormal: Number.isFinite(n) ? n : 0 }))}>
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Aux. extra</FormLabel>
                      <NumberInput value={rates.auxExtra} min={0} onChange={(_, n) => setRates((r) => ({ ...r, auxExtra: Number.isFinite(n) ? n : 0 }))}>
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>
                  </SimpleGrid>

                  <Text mt={3} fontSize="sm" color="gray.600">
                    Você poderá editar o orçamento em detalhes posteriormente. Estes são os parâmetros iniciais.
                  </Text>
                </Box>
              ) : null}
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={props.onClose}>
              Cancelar
            </Button>
            <Button colorScheme="brand" onClick={onCreate} isLoading={isSaving}>
              Criar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }