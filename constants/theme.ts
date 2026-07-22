/**
 * Design tokens for the app's dark-only theme.
 * Every color, spacing, radius, and text style in the UI should come from here.
 */

import { DarkTheme, type Theme } from "@react-navigation/native";

export const colors = {
    bg: "#0C0D10",
    surface: "#15171C",
    surfaceAlt: "#1D2026",
    border: "#2A2E37",
    text: "#ECEEF2",
    textMuted: "#98A0AC",
    accent: "#F7931A",
    accentPressed: "#DF7F0B",
    onAccent: "#14100A",
    success: "#4ADE80",
    danger: "#F87171",
    dangerPressed: "#EF5350",
    link: "#F7931A",
    overlay: "rgba(0,0,0,0.6)",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { input: 10, button: 12, card: 16 } as const;

export const fonts = {
    heading: "SpaceGrotesk_600SemiBold",
    headingBold: "SpaceGrotesk_700Bold",
    button: "SpaceGrotesk_500Medium",
    mono: "JetBrainsMono_400Regular",
} as const;

export const type = {
    title: { fontSize: 24, lineHeight: 30, fontFamily: fonts.headingBold, color: colors.text },
    heading: { fontSize: 17, lineHeight: 22, fontFamily: fonts.heading, color: colors.text },
    body: { fontSize: 15, lineHeight: 21, color: colors.text },
    caption: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
    mono: { fontSize: 13, lineHeight: 19, fontFamily: fonts.mono, color: colors.text },
} as const;

export const navTheme: Theme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        primary: colors.accent,
        background: colors.bg,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.accent,
    },
};
