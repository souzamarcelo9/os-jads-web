import {
  Box,
  Divider,
  HStack,
  Image,
  Stack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@chakra-ui/react";
import type { Budget } from "../../lib/firebase/budgets.types";
import type { WorkOrder, Client, Vessel, Equipment } from "../../lib/firebase/db";

const LOGO_SRC = `${import.meta.env.BASE_URL}godwrites-logo.jpg`;

function brl(v: number) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDateOnly(ts?: number) {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("pt-BR");
}

function safe(s?: string | null) {
  return s?.trim() ? s : "-";
}

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function calcServiceHH(b: Budget) {
  const hours = b.hourEntries ? Object.values(b.hourEntries) : [];
  return hours.reduce(
    (acc, e) =>
      acc +
      toNum(e.techNormalHours) +
      toNum(e.techExtraHours) +
      toNum(e.auxNormalHours) +
      toNum(e.auxExtraHours),
    0
  );
}

function calcTravelHH(b: Budget) {
  const hours = b.hourEntries ? Object.values(b.hourEntries) : [];
  return hours.reduce(
    (acc, e) =>
      acc +
      toNum(e.techTravelNormalHours) +
      toNum(e.techTravelExtraHours) +
      toNum(e.auxTravelNormalHours) +
      toNum(e.auxTravelExtraHours),
    0
  );
}

function TermsElectronicRepair() {
  return (
    <Box fontSize="11px" lineHeight="1.5">
      <Text fontWeight="900" color="blue.800" mb={2}>
        TERMOS E CONDIÇÕES – SERVIÇO DE REPARO ELETRÔNICO
      </Text>

      <Text fontWeight="800" mt={2}>1. Aceite da Proposta</Text>
      <Text>
        Após a aprovação desta proposta, o cancelamento poderá implicar na cobrança dos custos já incorridos
        até o momento, incluindo análises técnicas, mão de obra e materiais eventualmente utilizados.
      </Text>

      <Text fontWeight="800" mt={3}>2. Backup e Configurações</Text>
      <Text>
        A GOD WRITES não se responsabiliza pela realização de backup, parametrização ou salvamento de
        configurações dos equipamentos enviados para reparo. Tal responsabilidade é integralmente do cliente,
        não cabendo à GOD WRITES qualquer ônus em caso de perda de dados durante os procedimentos para reparo.
      </Text>

      <Text fontWeight="800" mt={3}>3. Condições para Efetivação do Reparo</Text>
      <Text>
        A aprovação desta proposta não implica na obrigatoriedade da GOD WRITES em efetivar o reparo do
        equipamento, uma vez que este poderá ser inviabilizado por fatores externos ou técnicos, tais como:
      </Text>
      <Box pl={4} mt={1}>
        <Text>• Indisponibilidade de componentes.</Text>
        <Text>• Componentes ou softwares descontinuados e/ou exclusivos.</Text>
        <Text>• Outros fatores técnicos extraordinários.</Text>
      </Box>

      <Text fontWeight="800" mt={3}>4. Prazo para Aprovação ou Retirada</Text>
      <Text>
        Os equipamentos deverão ser aprovados ou retirados pelo cliente no prazo máximo de 90 (noventa) dias
        a contar da data do orçamento. Após este período, a GOD WRITES não se responsabiliza pela guarda ou
        destino dos equipamentos.
      </Text>

      <Text fontWeight="800" mt={3}>5. Prazo de Entrega</Text>
      <Text>
        O prazo de entrega está sujeito a alterações, especialmente em casos de importação de componentes,
        greves alfandegárias, retenções para conferência ou outros procedimentos de órgãos reguladores.
      </Text>

      <Text fontWeight="800" mt={3}>6. Materiais Adicionais</Text>
      <Text>
        Quando necessário, os materiais adicionais serão orçados separadamente ou incorporados ao custo final
        mediante ciência do cliente.
      </Text>

      <Text fontWeight="900" mt={4}>GARANTIA – EXCLUSÕES</Text>
      <Box pl={4} mt={1}>
        <Text>• Instalação em desacordo com as especificações técnicas.</Text>
        <Text>• Mau uso, descuido, alterações ou modificações no equipamento.</Text>
        <Text>• Violação ou remoção do lacre de garantia.</Text>
        <Text>• Danos decorrentes de transporte, manuseio inadequado ou eventos naturais.</Text>
        <Text>• Armazenamento em condições inadequadas para equipamentos eletrônicos.</Text>
      </Box>

      <Text fontWeight="900" mt={4}>ATENÇÃO</Text>
      <Text>
        É imprescindível que todas as condições e recomendações descritas neste documento sejam rigorosamente
        observadas, a fim de garantir a qualidade, a segurança e a excelência dos serviços prestados pela GOD WRITES.
      </Text>
    </Box>
  );
}

function TermsByHourService() {
  return (
    <Box fontSize="11px" lineHeight="1.5">
      <Text fontWeight="900" color="blue.800" mb={2}>
        Termos e Condições
      </Text>

      <Text>1. <b>Execução do serviço:</b> até 30 dias úteis. Neste período, serão realizadas todas as tentativas
        de reparos possíveis. Caso seja necessário um tempo adicional para a conclusão do atendimento por parte
        do técnico, a proposta será revisada com base no relatório de serviço e na folha de ponto final.
      </Text>

      <Text mt={2}>2. <b>Despesas adicionais:</b> Se houver necessidade de o técnico arcar com algum custo
        diretamente durante a execução do serviço, o valor será reembolsado mediante apresentação do comprovante,
        acrescido de uma taxa administrativa de 30%.
      </Text>

      <Text mt={2}>3. <b>Responsabilidade pelo acesso:</b> A responsabilidade por garantir o acesso adequado
        ao local de execução do serviço — incluindo autorizações, estrutura de apoio (como andaimes) e
        disponibilidade dos equipamentos — é inteiramente do cliente.
      </Text>

      <Text mt={2}>4. <b>Diária Normal:</b> Considera-se diária normal o período de trabalho entre 1 (uma) e
        8 (oito) horas, realizado em dias úteis.
      </Text>

      <Text mt={2}>5. <b>Diária Extra:</b> Considera-se diária extra o período de trabalho entre 1 (uma) e
        8 (oito) horas, realizado aos fins de semana, feriados e/ou no período noturno (entre 18h e 6h).
      </Text>

      <Text mt={2}>6. <b>Diária à disposição (50% da diária normal):</b> Aplica-se quando a equipe já tiver
        sido mobilizada para o atendimento, mas estiver aguardando atracação, desembarque, lancha de transporte,
        liberação de trabalho, permissão de trabalho (PT) ou outras condições logísticas.
      </Text>

      <Text mt={2}>7. <b>Reajuste de valores por variação cambial:</b> Os preços de equipamentos ou materiais
        importados estarão sujeitos a reajuste conforme a variação positiva do Dólar americano na data do faturamento.
      </Text>

      <Text mt={2}>8. <b>Materiais adicionais:</b> Quando necessário, será emitida uma cotação separada para
        os materiais a serem utilizados no serviço, ou os respectivos valores poderão ser incorporados à planilha
        de custos final.
      </Text>

      <Text mt={2}>9. <b>Valores logísticos:</b> Todos os custos referentes à alimentação, hospedagem e transporte
        são de responsabilidade do cliente.
      </Text>
    </Box>
  );
}

export function BudgetPrintFormal(props: {
  budget: Budget;
  workOrder?: WorkOrder | null;
  client?: Client | null;
  vessel?: Vessel | null;
  equipment?: Equipment | null;
}) {
  const { budget, workOrder, client, vessel, equipment } = props;

  const hours = budget.hourEntries ? Object.values(budget.hourEntries) : [];
  const items = budget.items ? Object.values(budget.items) : [];

  const sortedHours = [...hours].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const sortedItems = [...items].sort((a, b) => (a.description ?? "").localeCompare(b.description ?? ""));

  const isByHour = budget.pricing === "POR_HORA";

  // ✅ POR_HORA costuma ter muitas colunas -> paisagem
  const pageW = isByHour ? "297mm" : "210mm";
  const pageH = isByHour ? "210mm" : "297mm";

  const totalHH = calcServiceHH(budget);
  const totalTravelHH = calcTravelHH(budget);

  return (
    <Box bg="white" color="black" fontSize="12px" p="18mm" width={pageW} minH={pageH}>
      {/* ✅ Força tamanho de página no print */}
      <style>
        {`
          @page {
            size: ${isByHour ? "A4 landscape" : "A4 portrait"};
            margin: 12mm;
          }
        `}
      </style>

      {/* Header */}
      <HStack justify="space-between" align="start">
        <Image src={LOGO_SRC} alt="God Writes" height="64px" objectFit="contain" />

        <Stack spacing={1} align="end" maxW="90mm">
          <Text fontWeight="700">Rua Anibal Costa, 26, Rocha Miranda,</Text>
          <Text fontWeight="700">Rio de Janeiro - RJ, CEP: 21540-560</Text>
          <Text fontWeight="700">CNPJ: 50.456.368/0001-37</Text>
          <Text fontWeight="700">Tel.: (21) 96486-780</Text>
          <Text color="blue.600" textDecoration="underline" fontWeight="700">
            comercial@godwritesgw.com.br
          </Text>
        </Stack>
      </HStack>

      <Text mt={4} fontStyle="italic" color="gray.700" lineHeight="1.35">
        Com 15 anos de experiência em serviços na área naval, fornecendo inovação, tecnologia e praticidade,
        através de soluções em automação, hidráulica móvel, laboratórios de eletrônica, atendimento técnico a bordo e muito mais!
      </Text>

      <Text mt={4} fontWeight="800" fontSize="14px" color="blue.800">
        {isByHour ? "Relatório de medição - horas de atendimento" : "Orçamento - valores e serviços"}
      </Text>

      <Divider my={3} borderColor="gray.300" />

      {/* Bloco de dados */}
      <HStack align="start" spacing={10}>
        <Stack spacing={1} flex="1">
          <Line label="Data" value={fmtDateOnly(budget.createdAt)} />
          <Line label="Validade da Proposta" value={budget.validityDays ? `${budget.validityDays} dias` : "-"} />
          <Line label="Condição de Pagamento" value={safe(budget.paymentTerms)} />
          <Line label="Prazo de Entrega" value={safe(budget.deliveryTerms)} />

          <Line label="Cliente" value={safe(client?.name)} />
          <Line label="Contato" value={safe(client?.contactName)} />
          <Line label="CNPJ/CPF" value={safe((client as any)?.document)} />
          <Line label="Telefone" value={safe((client as any)?.phone)} />
          <Line label="Endereço" value={safe((client as any)?.address)} />
          <Line label="E-mail" value={safe((client as any)?.email)} />
        </Stack>

        <Stack spacing={1} flex="1">
          <Line label="OS" value={safe(workOrder?.code ?? budget.workOrderId)} />
          <Line label="Embarcação" value={safe(vessel?.name)} />
          <Line label="Equipamento" value={safe(equipment?.name)} />
          <Line label="Tipo" value={budget.kind === "ANALISE" ? "Análise" : "Serviço"} />
          <Line label="Modelo" value={isByHour ? "Por hora" : "Fechado"} />
          <Line label="Status" value={safe(budget.status)} />
        </Stack>
      </HStack>

      <Divider my={4} borderColor="gray.300" />

      {/* Tabela */}
      {isByHour ? (
        <Box>
          <Box bg="blue.800" color="white" textAlign="center" py={2} fontWeight="800" mb={3}>
            MEDIÇÃO DE HORAS PARA ATENDIMENTO
          </Box>

          <Box border="1px solid" borderColor="gray.300" overflow="hidden">
            <Table
              size="sm"
              variant="simple"
              width="100%"
              sx={{
                tableLayout: "fixed",
                "th, td": {
                  borderColor: "gray.300",
                  px: "6px",
                  py: "6px",
                  fontSize: "10px",
                  whiteSpace: "normal",
                },
              }}
            >
              <Thead>
                <Tr>
                  <Th>Data</Th>
                  <Th>Início</Th>
                  <Th>Fim</Th>

                  <Th isNumeric>HH téc. Normal</Th>
                  <Th isNumeric>HH téc. Extra</Th>
                  <Th isNumeric>HH aux. Normal</Th>
                  <Th isNumeric>HH aux. Extra</Th>

                  {/* ✅ NOVOS CAMPOS */}
                  <Th isNumeric>HH téc. desloc. Normal</Th>
                  <Th isNumeric>HH téc. desloc. Extra</Th>
                  <Th isNumeric>HH aux. desloc. Normal</Th>
                  <Th isNumeric>HH aux. desloc. Extra</Th>

                  <Th isNumeric>Valor total</Th>
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

                      {/* ✅ NOVOS CAMPOS */}
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

          {/* ✅ Totalizadores pedidos + impostos */}
          <TotalsBlock budget={budget} totalHH={totalHH} totalTravelHH={totalTravelHH} />
        </Box>
      ) : (
        <Box>
          <Box bg="blue.800" color="white" textAlign="center" py={2} fontWeight="800" mb={3}>
            ITENS DO ORÇAMENTO
          </Box>

          <Box border="1px solid" borderColor="gray.300">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th borderColor="gray.300">Descrição</Th>
                  <Th isNumeric borderColor="gray.300">Qtd</Th>
                  <Th isNumeric borderColor="gray.300">Vlr unit.</Th>
                  <Th isNumeric borderColor="gray.300">Total</Th>
                </Tr>
              </Thead>

              <Tbody>
                {sortedItems.length === 0 ? (
                  <Tr>
                    <Td colSpan={4} borderColor="gray.300">
                      <Text color="gray.600">Nenhum item informado.</Text>
                    </Td>
                  </Tr>
                ) : (
                  sortedItems.map((it) => (
                    <Tr key={it.id}>
                      <Td borderColor="gray.300">{it.description}</Td>
                      <Td isNumeric borderColor="gray.300">{it.qty}</Td>
                      <Td isNumeric borderColor="gray.300">{brl(it.unitPrice ?? 0)}</Td>
                      <Td isNumeric borderColor="gray.300" fontWeight="800">{brl(it.total ?? 0)}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>

          <TotalsBlock budget={budget} />
        </Box>
      )}

      <Divider my={6} borderColor="gray.300" />

     {isByHour ? <TermsByHourService /> : <TermsElectronicRepair />}

      {/* Assinaturas */}
      <Divider my={6} borderColor="gray.300" />

      <HStack justify="space-between" spacing={8} mt={8}>
        <SignatureLine label="God Writes" />
        <SignatureLine label="Cliente (Aprovação)" />
      </HStack>

      <Text mt={6} fontSize="11px" color="gray.700">
        Observações: {safe(budget?.note ?? budget?.note)}
      </Text>
    </Box>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <HStack spacing={2} align="baseline">
      <Text minW="170px" fontWeight="800" color="blue.800">
        {label}:
      </Text>
      <Text color="gray.800">{value}</Text>
    </HStack>
  );
}

function TotalsBlock({
  budget,
  totalHH,
  totalTravelHH,
}: {
  budget: Budget;
  totalHH?: number;
  totalTravelHH?: number;
}) {
  return (
    <Box border="1px solid" borderColor="gray.300" borderTop="none" p={4}>
      {/* ✅ Para POR_HORA: totalizadores separados */}
      {budget.pricing === "POR_HORA" ? (
        <>
          <HStack justify="space-between">
            <Text fontWeight="800">TOTAL HH</Text>
            <Text fontWeight="800">{(totalHH ?? 0).toFixed(2)}</Text>
          </HStack>

          <HStack justify="space-between" mt={2}>
            <Text fontWeight="800">TOTAL HH (Traslado)</Text>
            <Text fontWeight="800">{(totalTravelHH ?? 0).toFixed(2)}</Text>
          </HStack>

          <Divider my={3} borderColor="gray.300" />
        </>
      ) : null}

      <HStack justify="space-between">
        <Text fontWeight="800">Impostos de serviço (ISS {budget.issPercent ?? 0}%)</Text>
        <Text fontWeight="800">{brl(budget.issValue ?? 0)}</Text>
      </HStack>

      <HStack justify="space-between" mt={2}>
        <Text fontWeight="900">VALOR TOTAL</Text>
        <Text fontWeight="900">{brl(budget.total ?? 0)}</Text>
      </HStack>
    </Box>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <Box flex="1" textAlign="center">
      <Box borderBottom="1px solid" borderColor="gray.600" height="28px" />
      <Text mt={2} fontWeight="800">
        {label}
      </Text>
    </Box>
  );
}