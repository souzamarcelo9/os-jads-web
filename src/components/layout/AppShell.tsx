import {
  Avatar,
  Badge,
  Box,
  Image,
  Stack,
  Flex,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spacer,
  Text,
  VStack,
} from "@chakra-ui/react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FiAnchor,FiClipboard, FiHome, FiLogOut, FiMessageSquare, FiSearch, FiTool, FiUsers } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";


const navItems = [
  { to: "/app/dashboard", label: "Dashboard", icon: FiHome },
  { to: "/app/work-orders", label: "Ordens", icon: FiClipboard, badge: "Beta" },
  { to: "/app/clients", label: "Clientes", icon: FiUsers },
  { to: "/app/vessels", label: "Embarcações", icon: FiAnchor },
  { to: "/app/equipment", label: "Equipamentos", icon: FiTool },
  { to: "/app/work-orders-kanban", label: "Kanban", icon: FiMessageSquare },
];

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  width: "100%",
  padding: "10px 12px",
  borderRadius: "16px",
  textDecoration: "none",
  background: isActive ? "white" : "transparent",
  boxShadow: isActive ? "0 10px 25px rgba(0,0,0,0.06)" : "none",
  border: isActive ? "1px solid rgba(0,0,0,0.06)" : "1px solid transparent",
});

export function AppShell() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle = (() => {
    const found = navItems.find((n) => location.pathname.startsWith(n.to));
    return found?.label ?? "Painel";
  })();

  return (
    <Flex minH="100vh" bg="gray.50">
      {/* Sidebar */}      
      <Box w="300px" p={4}>
        
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="22px" boxShadow="soft" p={4}>
          
          <Box px={4} pt={5} pb={4}>
          <Stack spacing={2} align="flex-start">
            <Image
              src="/brand/godwrites-logo.jpg"
              alt="God Writes"
              h="80px"
              objectFit="contain"
            />
            <Text fontSize="sm" color="gray.500" fontWeight="600">
              Soluções em Tecnologia
            </Text>
          </Stack>
        </Box>

          <VStack align="stretch" spacing={2}>
            {navItems.map((it) => (
              <NavLink key={it.to} to={it.to} style={linkStyle}>
                {({ isActive }) => (
                  <HStack>
                    <Box
                      w="36px"
                      h="36px"
                      display="grid"
                      placeItems="center"
                      borderRadius="14px"
                      bg={isActive ? "brand.50" : "gray.50"}
                      border="1px solid"
                      borderColor={isActive ? "brand.100" : "gray.100"}
                    >
                      <Icon as={it.icon} color={isActive ? "brand.600" : "gray.600"} />
                    </Box>

                    <Text fontWeight={isActive ? 800 : 600}>{it.label}</Text>
                    <Spacer />
                    {it.badge ? (
                      <Badge borderRadius="999px" px={2} colorScheme="purple" variant="subtle">
                        {it.badge}
                      </Badge>
                    ) : null}
                  </HStack>
                )}
              </NavLink>
            ))}
          </VStack>

          <Box mt={6} p={3} bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="18px">
            <HStack>
              <Avatar size="sm" name={user?.displayName || user?.email || "Usuário"} />
              <Box minW={0}>
                <Text fontSize="sm" fontWeight="700" noOfLines={1}>
                  {user?.displayName || "Usuário"}
                </Text>
                <Text fontSize="xs" color="gray.600" noOfLines={1}>
                  {user?.email}
                </Text>
              </Box>
              <Spacer />
              <Menu>
                <MenuButton as={Box} cursor="pointer" px={2} py={1} borderRadius="12px" _hover={{ bg: "blackAlpha.100" }}>
                  <Text fontSize="sm" fontWeight="800">⋯</Text>
                </MenuButton>
                <MenuList borderRadius="16px">
                  <MenuItem
                    icon={<FiLogOut />}
                    onClick={async () => {
                      await logoutUser();
                      navigate("/login");
                    }}
                  >
                    Sair
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Box>
        </Box>
      </Box>

      {/* Main */}
      <Box flex="1" p={4}>
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="22px" boxShadow="soft">
          {/* Header */}
          <Flex px={6} py={4} align="center" borderBottom="1px solid" borderColor="gray.100">
            <Box>
              <Text fontWeight="900" fontSize="lg">
                {pageTitle}
              </Text>
              <Text fontSize="sm" color="gray.500">
                Controle e rastreio de ordens de serviço
              </Text>
            </Box>
            <Spacer />
            <InputGroup maxW="420px">
              <InputLeftElement pointerEvents="none">
                <Icon as={FiSearch} color="gray.400" />
              </InputLeftElement>
              <Input placeholder="Buscar (em breve: OS, cliente, equipamento...)" />
            </InputGroup>
          </Flex>

          {/* Content */}
          <Box p={6}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Flex>
  );
}
