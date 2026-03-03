import {
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { AuthLayout } from "../components/layout/AuthLayout";

type FormData = { email: string; password: string };

export default function LoginPage() {
  const { register, handleSubmit, formState, watch } = useForm<FormData>();
  const { loginWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [isSendingReset, setIsSendingReset] = useState(false);

  const emailValue = watch("email");
  const trimmedEmail = useMemo(() => (emailValue ?? "").trim(), [emailValue]);

  async function onSubmit(data: FormData) {
    await loginWithEmail(data.email, data.password);
    navigate("/app/dashboard");
  }

  async function onResetPassword() {
    const email = trimmedEmail;
    if (!email) {
      toast({
        status: "warning",
        title: "Informe seu e-mail",
        description: "Digite o e-mail no campo acima para enviarmos o link de redefinição.",
      });
      return;
    }

    setIsSendingReset(true);
    try {
      await resetPassword(email);
      toast({
        status: "success",
        title: "E-mail enviado",
        description: "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({
        status: "error",
        title: "Não foi possível enviar",
        description: msg,
      });
    } finally {
      setIsSendingReset(false);
    }
  }

  return (
    <AuthLayout>
      <Card w="100%" maxW="420px" borderRadius="20px">
        <CardBody p={8}>
          <Heading size="md" mb={2}>
            Entrar
          </Heading>
          <Text color="gray.600" mb={6}>
            Acesse o sistema de ordens de serviço.
          </Text>

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

              {/* ✅ Reset de senha */}
              <Button
                variant="link"
                alignSelf="flex-start"
                size="sm"
                onClick={onResetPassword}
                isLoading={isSendingReset}
              >
                Esqueci minha senha
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
