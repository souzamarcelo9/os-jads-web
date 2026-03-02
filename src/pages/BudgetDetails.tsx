import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Heading,
  HStack,
  Stack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Text,
  useToast,
} from "@chakra-ui/react";

import { useEffect, useState ,useMemo } from "react";
import { useParams } from "react-router-dom";
import { useDisclosure } from "@chakra-ui/react";
import { BudgetApprovalModal } from "../components/budgets/BudgetApprovalModal";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
//import { BudgetPrintView } from "../components/budgets/BudgetPrintView";
import { subscribeWorkOrderById, subscribeClients, subscribeVessels, subscribeEquipment, type WorkOrder, type Client, type Vessel, type Equipment } from "../lib/firebase/db";
import type { Budget } from "../lib/firebase/budgets.types";
import {
  subscribeBudgetById,
  //approveBudget,
  //rejectBudget,
  sendBudgetToClient,
} from "../lib/firebase/budgets.db";

import { BudgetItems } from "../components/budgets/BudgetItems";
import { BudgetHours } from "../components/budgets/BudgetHours";
import { BudgetPrintFormal } from "../components/budgets/BudgetPrintFormal";
import { BudgetSummary } from "../components/budgets/BudgetSummary";
import { BudgetApproval } from "../components/budgets/BudgetApproval";

export default function BudgetDetailsPage() {

  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const approveModal = useDisclosure();
  const rejectModal = useDisclosure();
  const [budget, setBudget] = useState<Budget | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const LOGO_SRC = `${import.meta.env.BASE_URL}godwrites-logo.jpg`;

  function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // não trava se falhar
    img.src = src;
  });
}

const handlePrint = useReactToPrint({
  contentRef: printRef,
  documentTitle: budget ? `Orcamento-${budget.id}` : "Orcamento",
  onBeforePrint: async () => {
    await preloadImage(LOGO_SRC);
  },
});

/* const handlePrint = useReactToPrint({
  contentRef: printRef,
  documentTitle: budget ? `Orcamento-${budget.id}` : "Orcamento",
}); */

const [wo, setWo] = useState<WorkOrder | null>(null);
const [clients, setClients] = useState<Client[]>([]);
const [vessels, setVessels] = useState<Vessel[]>([]);
const [equipment, setEquipment] = useState<Equipment[]>([]);

useEffect(() => {
  const u1 = subscribeClients(setClients);
  const u2 = subscribeVessels(setVessels);
  const u3 = subscribeEquipment(setEquipment);
  return () => { u1(); u2(); u3(); };
}, []);

useEffect(() => {
  if (!budget?.workOrderId) return;
  const unsub = subscribeWorkOrderById(budget.workOrderId, setWo);
  return () => unsub();
}, [budget?.workOrderId]);

const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
const vesselMap = useMemo(() => new Map(vessels.map((v) => [v.id, v])), [vessels]);
const equipmentMap = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);

const client = wo ? clientMap.get(wo.clientId) ?? null : null;
const vessel = wo?.vesselId ? vesselMap.get(wo.vesselId) ?? null : null;
const equipmentItem = wo?.equipmentId ? equipmentMap.get(wo.equipmentId) ?? null : null;


  useEffect(() => {
    if (!id) return;

    const unsub = subscribeBudgetById(id, setBudget);

    return () => unsub();
  }, [id]);

  async function onSend() {
    if (!id) return;

    await sendBudgetToClient(id);

    toast({
      status: "success",
      title: "Orçamento enviado",
    });
  }


  if (!budget) {
    return (
      <Card>
        <CardBody>
          <Text>Carregando orçamento...</Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Stack spacing={4}>
      {/* HEADER */}
              <Card>
                <CardBody>
                {/* <Box position="absolute" left="-99999px" top={0}>
                  <Box ref={printRef}>
                    {budget ? (
                      <BudgetPrintView
                        budget={budget}
                        workOrder={wo}
                        client={client}
                        vessel={vessel}
                        equipment={equipmentItem}
                      />
                    ) : null}
                  </Box>
              </Box> */}

             <Box position="absolute" left="-99999px" top={0}>
              <Box ref={printRef}>
                {budget ? (
                  <BudgetPrintFormal
                    budget={budget}
                    workOrder={wo}
                    client={client}
                    vessel={vessel}
                    equipment={equipmentItem}
                  />
                ) : null}
              </Box>
            </Box> 

          <HStack justify="space-between" align="start">
            <Box>
              <Heading size="md">
                {budget.title || "Orçamento"}
              </Heading>

              <HStack mt={2}>
                <Badge colorScheme="blue">
                  {budget.status}
                </Badge>

                <Badge variant="subtle">
                  {budget.pricing === "POR_HORA"
                    ? "Por hora"
                    : "Fechado"}
                </Badge>

                <Badge variant="subtle">
                  {budget.kind === "ANALISE"
                    ? "Análise"
                    : "Serviço"}
                </Badge>
              </HStack>

              <Text mt={3} color="gray.600">
                OS: {budget.workOrderId}
              </Text>
            </Box>

            <HStack>
              {budget.status === "RASCUNHO" && (
                <Button onClick={onSend} colorScheme="brand">
                  Enviar
                </Button>
              )}

              {budget.status === "ENVIADO" && (
                <>
                  <Button onClick={approveModal.onOpen} colorScheme="green">
                    Aprovar
                  </Button>

                  <Button onClick={rejectModal.onOpen} colorScheme="red" variant="outline">
                    Reprovar
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={handlePrint}>
                Exportar PDF
              </Button>
            </HStack>
          </HStack>
        </CardBody>
      </Card>

      {/* TABS */}
      <Card>
        <CardBody>
          <Tabs variant="enclosed">
            <TabList>
              <Tab>Resumo</Tab>
              <Tab>Itens</Tab>
              <Tab>Horas</Tab>
              <Tab>Aprovação</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <BudgetSummary budget={budget} />
              </TabPanel>

              <TabPanel>
                <BudgetItems budget={budget} />
              </TabPanel>

              <TabPanel>
                <BudgetHours budget={budget} />
              </TabPanel>

              <TabPanel>
                <BudgetApproval budget={budget} />
              </TabPanel>
            </TabPanels>
          </Tabs>

          {budget ? (
            <>
              <BudgetApprovalModal
                isOpen={approveModal.isOpen}
                onClose={approveModal.onClose}
                budgetId={budget.id}
                mode="approve"
              />
              <BudgetApprovalModal
                isOpen={rejectModal.isOpen}
                onClose={rejectModal.onClose}
                budgetId={budget.id}
                mode="reject"
              />
            </>
          ) : null}
        </CardBody>
      </Card>
    </Stack>
  );
}
