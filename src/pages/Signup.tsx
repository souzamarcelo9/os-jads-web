import { Box, Button, Card, CardBody, FormControl, FormLabel, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AuthLayout } from "../components/layout/AuthLayout";

type FormData = { name: string; email: string; password: string };

export default function SignupPage() {
  const { register, handleSubmit, formState } = useForm<FormData>();
  const { signupWithEmail } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(data: FormData) {
    await signupWithEmail(data.name, data.email, data.password);
    navigate("/app/dashboard");
  }

  return (
     <AuthLayout>
      <Card w="100%" maxW="420px" borderRadius="20px">
        <CardBody p={8}>
          <Heading size="md" mb={2}>Criar conta</Heading>
          <Text color="gray.600" mb={6}>Comece a gerenciar ordens de serviço.</Text>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Nome</FormLabel>
                <Input {...register("name", { required: true })} />
              </FormControl>

              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input type="email" {...register("email", { required: true })} />
              </FormControl>

              <FormControl>
                <FormLabel>Senha</FormLabel>
                <Input type="password" {...register("password", { required: true, minLength: 6 })} />
              </FormControl>

              <Button type="submit" isLoading={formState.isSubmitting} colorScheme="blue" borderRadius="14px">
                Criar conta
              </Button>

              <Text fontSize="sm" color="gray.600">
                Já tem conta? <Link to="/login">Entrar</Link>
              </Text>
            </Stack>
          </form>
        </CardBody>
      </Card>
    </AuthLayout>
  );
}
