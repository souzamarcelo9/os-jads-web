import { Box, Container } from "@chakra-ui/react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box minH="100vh" position="relative" overflow="hidden">
      {/* Background */}
      <Box
        position="absolute"
        inset={0}
        bgImage={"url('/wallpaper-offshore.webp')"}
        bgSize="cover"
        bgPosition="center"
        filter="saturate(1.1)"
        transform="scale(1.03)"
      />
      {/* Overlay */}
      <Box
        position="absolute"
        inset={0}
        bg="blackAlpha.700"
        backdropFilter="blur(6px)"
      />

      {/* Content */}
      <Container
        position="relative"
        zIndex={1}
        maxW="container.sm"
        minH="100vh"
        display="grid"
        alignItems="center"
        py={10}
      >
        {children}
      </Container>
    </Box>
  );
}
