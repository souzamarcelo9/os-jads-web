import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        bg: "gray.50",
        color: "gray.800",
      },
    },
  },
  fonts: {
    heading: `'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
    body: `'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
  },
  colors: {
    brand: {
      50: "#eef4ff",
      100: "#d9e5ff",
      200: "#b3cbff",
      300: "#8db1ff",
      400: "#6797ff",
      500: "#3f7cff",
      600: "#2f61db",
      700: "#2348a8",
      800: "#173076",
      900: "#0b1944",
    },
  },
  radii: {
    xl: "16px",
    "2xl": "22px",
  },
  shadows: {
    soft: "0 10px 30px rgba(0,0,0,0.06)",
  },
  components: {
    Card: {
      baseStyle: {
        container: {
          borderRadius: "22px",
          border: "1px solid",
          borderColor: "gray.200",
          boxShadow: "soft",
          bg: "white",
        },
      },
    },
    Button: {
      baseStyle: {
        borderRadius: "14px",
        fontWeight: 700,
      },
      variants: {
        solid: (props: any) => ({
          bg: props.colorScheme === "brand" ? "brand.500" : undefined,
          _hover: { bg: props.colorScheme === "brand" ? "brand.600" : undefined },
          _active: { transform: "translateY(1px)" },
        }),
        outline: {
          borderRadius: "14px",
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            borderRadius: "14px",
            bg: "white",
            _focusVisible: {
              borderColor: "brand.500",
              boxShadow: "0 0 0 3px rgba(63,124,255,0.15)",
            },
          },
        },
      },
      defaultProps: { variant: "outline" },
    },
    Textarea: {
      variants: {
        outline: {
          borderRadius: "14px",
          bg: "white",
          _focusVisible: {
            borderColor: "brand.500",
            boxShadow: "0 0 0 3px rgba(63,124,255,0.15)",
          },
        },
      },
      defaultProps: { variant: "outline" },
    },
    Table: {
      baseStyle: {
        th: { color: "gray.600", fontWeight: 700, textTransform: "none", letterSpacing: "0" },
        td: { borderColor: "gray.100" },
      },
    },
  },
});
