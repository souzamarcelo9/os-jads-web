import { Button, Card, CardBody, FormControl, FormLabel, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AuthLayout } from "../components/layout/AuthLayout";

type FormData = { email: string; password: string };

export default function LoginPage() {
  const { register, handleSubmit, formState } = useForm<FormData>();
  const { loginWithEmail } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(data: FormData) {
    await loginWithEmail(data.email, data.password);
    navigate("/app/dashboard");
  }

  return (
    <AuthLayout>
      <Card w="100%" maxW="420px" borderRadius="20px">
        <CardBody p={8}>
          <Heading size="md" mb={2}>Entrar</Heading>
          <Text color="gray.600" mb={6}>Acesse o sistema de ordens de serviço.</Text>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input type="email" {...register("email", { required: true })} />
              </FormControl>

              <FormControl>
                <FormLabel>Senha</FormLabel>
                <Input type="password" {...register("password", { required: true })} />
              </FormControl>

              <Button type="submit" isLoading={formState.isSubmitting} colorScheme="blue" borderRadius="14px">
                Entrar
              </Button>

              <Text fontSize="sm" color="gray.600">
                Não tem conta? <Link to="/signup">Criar agora</Link>
              </Text>
            </Stack>
          </form>
        </CardBody>
      </Card>
    </AuthLayout>
  );
}
