import { createTheme } from "@mui/material/styles";

// SFSU brand palette, taken from the approved mockup. Components read colors
// from the theme, so a color change is a one-line edit here.
export const brand = {
  purple: "#442C8B", // Core Purple: header, buttons, user bubbles, links
  gold: "#DCAE27", // Core Gold: strip under the header, map pin center
  purple2: "#665AA7", // input borders
  purple3: "#B1A5D0", // card borders, source chips
  rock: "#6E5D53", // secondary text
  fog: "#F6F0D6",
  sunlight: "#FFE2B4",
  error: "#B3261E", // palette has no red that passes contrast on white
} as const;

const theme = createTheme({
  palette: {
    primary: { main: brand.purple, light: brand.purple2, contrastText: "#FFFFFF" },
    secondary: { main: brand.gold, contrastText: "#000000" },
    error: { main: brand.error },
    text: { primary: "#000000", secondary: brand.rock },
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
    divider: brand.purple3,
  },
  typography: {
    fontFamily: '"Source Sans 3", system-ui, sans-serif',
    fontSize: 16,
    h1: { fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" },
    button: { textTransform: "none", fontWeight: 500 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiAppBar: { defaultProps: { elevation: 0 } },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiChip: {
      styleOverrides: {
        root: { backgroundColor: brand.purple3, color: brand.purple, fontWeight: 500 },
      },
    },
  },
});

export default theme;
