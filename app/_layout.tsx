import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";
import {
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    useFonts,
} from "@expo-google-fonts/space-grotesk";
import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import React, { useEffect } from "react";
import Toast from "react-native-toast-message";

import { toastConfig } from "@/components/ui/toast-config";
import { colors, navTheme } from "@/constants/theme";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
    anchor: "(tabs)",
};

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        SpaceGrotesk_500Medium,
        SpaceGrotesk_600SemiBold,
        SpaceGrotesk_700Bold,
        JetBrainsMono_400Regular,
    });

    useEffect(() => {
        SystemUI.setBackgroundColorAsync(colors.bg);
    }, []);

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <ThemeProvider value={navTheme}>
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="scan" options={{ headerShown: false }} />
                <Stack.Screen name="program" options={{ headerShown: false }} />
                <Stack.Screen name="reset" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="light" />
            <Toast config={toastConfig} />
        </ThemeProvider>
    );
}
