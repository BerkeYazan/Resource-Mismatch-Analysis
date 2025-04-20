import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  colors: {
    bg: {
      primary: "#F8F8F8",
      secondary: "#FFFFFF",
      tertiary: "#F5F5F5",
    },
    text: {
      primary: "#121212",
      secondary: "#404040",
      tertiary: "#707070",
    },
    border: {
      primary: "#E0E0E0",
      secondary: "#CCCCCC",
      dark: "#202020",
    },
    accent: {
      primary: "#202020",
      highlight: "#454545",
      muted: "#808080",
    },
  },
  styles: {
    global: {
      body: {
        bg: "bg.primary",
        color: "text.primary",
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: "500",
      },
      variants: {
        solid: {
          bg: "accent.primary",
          color: "white",
          _hover: {
            bg: "accent.highlight",
          },
          _active: {
            bg: "text.primary",
          },
        },
        outline: {
          borderColor: "text.primary",
          color: "text.primary",
          _hover: {
            bg: "bg.tertiary",
            borderColor: "accent.primary",
            color: "accent.primary",
          },
        },
      },
    },
    Table: {
      variants: {
        simple: {
          th: {
            borderColor: "border.primary",
            color: "text.primary",
            bg: "bg.secondary",
            fontWeight: "700",
          },
          td: {
            borderColor: "border.primary",
          },
        },
      },
    },
    Tabs: {
      variants: {
        enclosed: {
          tab: {
            color: "text.secondary",
            _selected: {
              color: "text.primary",
              bg: "bg.secondary",
              borderColor: "border.primary",
              borderBottomColor: "bg.secondary",
              fontWeight: "600",
            },
            _hover: {
              color: "accent.primary",
            },
          },
          tabpanel: {
            pt: 8,
            px: 0,
          },
        },
      },
    },
    Heading: {
      baseStyle: {
        fontWeight: "600",
        color: "text.primary",
      },
    },
    Popover: {
      baseStyle: {
        content: {
          boxShadow: "lg",
          border: "1px solid",
          borderColor: "border.primary",
          maxHeight: "none",
          _focus: { boxShadow: "none" },
        },
      },
    },
    Tag: {
      variants: {
        solid: {
          bg: "accent.primary",
          color: "white",
        },
      },
    },
  },
});

export default theme;
