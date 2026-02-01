import { extendTheme, type ThemeConfig } from "@chakra-ui/react";
import type { StyleFunctionProps } from "@chakra-ui/theme-tools";

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
      50: "#E7EFF6",
      100: "#C7D9EA",
      200: "#A5C2DD",
      300: "#83A3BB",
      400: "#437398",
      500: "#014173", // azul God Writes
      600: "#013863",
      700: "#012F53",
      800: "#012643",
      900: "#001B33",
    },
    accent: {
      50: "#FFF6E5",
      100: "#FFE7B8",
      200: "#FFD88A",
      300: "#FFC95C",
      400: "#F8BA3E",
      500: "#F5AF30", // laranja God Writes
      600: "#D9951E",
      700: "#B87713",
      800: "#8E5B0A",
      900: "#5F3C00",
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
        solid: (props: StyleFunctionProps) => ({
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
