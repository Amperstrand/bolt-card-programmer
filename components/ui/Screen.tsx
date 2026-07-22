import React, { type ReactNode } from "react";
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants/theme";

type ScreenProps = {
    children: ReactNode;
    scroll?: boolean;
    padded?: boolean;
    style?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll = true, padded = true, style }: ScreenProps) {
    const insets = useSafeAreaInsets();

    if (!scroll) {
        return (
            <SafeAreaView edges={["top", "left", "right"]} style={[styles.root, style]}>
                {children}
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["top", "left", "right"]} style={styles.root}>
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[
                    padded && styles.padded,
                    { paddingBottom: spacing.xl + insets.bottom },
                    style,
                ]}
            >
                {children}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    padded: {
        padding: spacing.lg,
        gap: spacing.lg,
    },
});
