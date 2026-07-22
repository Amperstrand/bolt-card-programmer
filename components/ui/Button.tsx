import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { colors, fonts, radius, spacing } from "@/constants/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

type ButtonProps = {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    loading?: boolean;
    disabled?: boolean;
    icon?: keyof typeof Ionicons.glyphMap;
    compact?: boolean;
    style?: StyleProp<ViewStyle>;
};

const variantStyles: Record<ButtonVariant, { bg: string; bgPressed: string; label: string; border?: string }> = {
    primary: { bg: colors.accent, bgPressed: colors.accentPressed, label: colors.onAccent },
    secondary: { bg: colors.surfaceAlt, bgPressed: colors.border, label: colors.text, border: colors.border },
    ghost: { bg: "transparent", bgPressed: colors.surfaceAlt, label: colors.accent },
    destructive: { bg: "transparent", bgPressed: colors.surfaceAlt, label: colors.danger, border: colors.danger },
};

export function Button({
    title,
    onPress,
    variant = "primary",
    loading = false,
    disabled = false,
    icon,
    compact = false,
    style,
}: ButtonProps) {
    const v = variantStyles[variant];
    const inactive = disabled || loading;

    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            disabled={inactive}
            style={({ pressed }) => [
                styles.base,
                compact && styles.compact,
                {
                    backgroundColor: pressed ? v.bgPressed : v.bg,
                    borderColor: v.border ?? "transparent",
                    borderWidth: v.border ? StyleSheet.hairlineWidth : 0,
                },
                disabled && styles.disabled,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator size="small" color={v.label} />
            ) : icon ? (
                <Ionicons name={icon} size={compact ? 16 : 18} color={v.label} />
            ) : null}
            <Text style={[styles.label, compact && styles.labelCompact, { color: v.label }]}>{title}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        height: 44,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.button,
    },
    compact: {
        height: 36,
        paddingHorizontal: spacing.md,
    },
    disabled: {
        opacity: 0.5,
    },
    label: {
        fontFamily: fonts.button,
        fontSize: 15,
    },
    labelCompact: {
        fontSize: 13,
    },
});
