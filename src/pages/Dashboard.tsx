import { Card, CardBody, Heading, Text } from "@chakra-ui/react";

export default function DashboardPage() {
  return (
    <Card borderRadius="20px">
      <CardBody>
        <Heading size="md">Dashboard</Heading>
        <Text color="gray.600" mt={2}>
          Bootstrap OK. Próximo passo: módulos de Clientes, Embarcações, Equipamentos e Ordens.
        </Text>
      </CardBody>
    </Card>
  );
}
