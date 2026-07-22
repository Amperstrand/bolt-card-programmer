import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing, type } from "@/constants/theme";

type MonoFieldProps = {
    label: string;
    value?: string;
    placeholder?: string;
    /** When provided, renders a copy button that invokes this callback. */
    onCopy?: () => void;
};

export function MonoField({ label, value, placeholder = "pending…", onCopy }: MonoFieldProps) {
    return (
        <View style={styles.container}>
            <Text style={type.caption}>{label}</Text>
            <View style={styles.valueRow}>
                <Text selectable style={[type.mono, styles.value, !value && styles.placeholder]}>
                    {value || placeholder}
                </Text>
                {onCopy && value ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Copy ${label}`}
                        onPress={onCopy}
                        hitSlop={8}
                        style={({ pressed }) => [styles.copyButton, pressed && styles.copyPressed]}
                    >
                        <Ionicons name="copy-outline" size={16} color={colors.accent} />
                    </Pressable>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 2,
        alignSelf: "stretch",
    },
    valueRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    value: {
        flex: 1,
    },
    placeholder: {
        color: colors.textMuted,
    },
    copyButton: {
        padding: spacing.xs,
        borderRadius: 6,
    },
    copyPressed: {
        backgroundColor: colors.surfaceAlt,
    },
});
