import {
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Heading,
  HStack,

  Stack,
 // useToast,
} from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";

//import { subscribeReportByWO, upsertReportForWO } from "../lib/firebase/reports.db";

import {
  //subscribeClients,
  //subscribeEquipment,
  //subscribeVessels,
  //subscribeWorkOrderById,
} from "../lib/firebase/db";

//import type { Client, Vessel, Equipment, WorkOrder } from "../lib/firebase/db";
//import { ReportPrintView } from "../components/reports/ReportPrintView";


export default function ReportEditorPage() {
  const { woId } = useParams<{ woId: string }>();
  //const toast = useToast();


  //const [wo, setWo] = useState<WorkOrder | null>(null);
  /* const [clients, setClients] = useState<Client[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]); */
  //const [report, setReport] = useState<WorkOrderReport | null>(null);

  // form local (simples, sem RHF aqui)
  

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef:  printRef,
   // documentTitle: wo?.code ? `RELATORIO-${wo.code}` : "RELATORIO",
  });

  useEffect(() => {
    if (!woId) return;

   // const u1 = subscribeWorkOrderById(woId, setWo);
    //const u2 = subscribeClients(setClients);
    //const u3 = subscribeVessels(setVessels);
    ///const u4 = subscribeEquipment(setEquipment);
    //const u5 = subscribeReportByWO(woId, setReport);

    return () => {
      //u1();
      //u2();
     // u3();
     // u4();
      //u5();
    };
  }, [woId]);

  // Maps
 /*  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const vesselMap = useMemo(() => new Map(vessels.map((v) => [v.id, v])), [vessels]);
  const equipmentMap = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]); */

  /* const client = wo ? clientMap.get(wo.clientId) ?? null : null;
  const vessel = wo?.vesselId ? vesselMap.get(wo.vesselId) ?? null : null;
  const equipmentItem = wo?.equipmentId ? equipmentMap.get(wo.equipmentId) ?? null : null; */

  // Se não existe report ainda, pré-preenche uma vez com dados da OS
  /* useEffect(() => {
    if (!woId || !wo) return;

    // se já existe report no RTDB, carrega no form
    if (report) {
        const { id, workOrderId, createdAt, updatedAt, ...rest } = report;
        void id; void workOrderId; void createdAt; void updatedAt;
        setForm(rest);
        return;
        }

    // senão existe, preenche defaults úteis
    setForm((prev) => ({
      ...prev,
      workOrderCode: wo.code ?? null,
      technician: prev.technician || user?.displayName || user?.email || "",
      vesselName: prev.vesselName || (vessel?.name ?? ""),
      equipmentName: prev.equipmentName || (equipmentItem?.name ?? ""),
      reportedIssue: prev.reportedIssue || wo.reportedDefect || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [woId, wo, report, vessel?.name, equipmentItem?.name]); */

  /* async function save() {
    if (!woId || !wo) return;

    try {
      await upsertReportForWO(woId, {
        ...form,
        workOrderCode: wo.code ?? null,
      });

      toast({ status: "success", title: "Relatório salvo" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ status: "error", title: "Erro ao salvar", description: msg });
    }
  } */

  if (!woId) {
    return (
      <Card><CardBody><Heading size="md">Relatório</Heading></CardBody></Card>
    );
  }

  /* if (!wo) {
    return (
      <Card>
        <CardBody>
          <Heading size="md">OS não encontrada</Heading>
        </CardBody>
      </Card>
    );
  } */

  return (
    <Stack spacing={4}>
      {/* hidden print area */}
      <Box position="absolute" left="-99999px" top={0}>
        {/* <Box ref={printRef}>
          <ReportPrintView
            report={{
              id: woId,
              workOrderId: woId,
             // createdAt: report?.createdAt ?? Date.now(),
              updatedAt: Date.now(),
              
            }}
            workOrder={wo}
            client={client}
            vessel={vessel}
            equipment={equipmentItem}
          />
        </Box> */}
      </Box>

      <HStack justify="space-between">
        <Box>
         {/*  <Heading size="md">Relatório • {wo.code}</Heading> */}
        </Box>

        <HStack>
          <Button variant="outline" onClick={handlePrint}>
            Baixar / Imprimir (PDF)
          </Button>
          {/* <Button colorScheme="brand" onClick={save}>
            Salvar
          </Button> */}
        </HStack>
      </HStack>

      
      <Card>
        
      </Card>

      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Heading size="sm">Termo de aceite</Heading>

            <HStack spacing={4}>
              <FormControl>
                <FormLabel>Nome do representante</FormLabel>
                
              </FormControl>

              <FormControl>
                <FormLabel>Cargo</FormLabel>
               
              </FormControl>
            </HStack>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
