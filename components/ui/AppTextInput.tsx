import React, { type ReactNode } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, fonts, radius, spacing, type } from "@/constants/theme";

type AppTextInputProps = TextInputProps & {
    label?: string;
    mono?: boolean;
    labelAccessory?: ReactNode;
};

export function AppTextInput({ label, mono = false, labelAccessory, style, ...inputProps }: AppTextInputProps) {
    return (
        <View style={styles.container}>
            {label || labelAccessory ? (
                <View style={styles.labelRow}>
                    {label ? <Text style={type.caption}>{label}</Text> : <View />}
                    {labelAccessory}
                </View>
            ) : null}
            <TextInput
                placeholderTextColor={colors.textMuted}
                {...inputProps}
                style={[styles.input, mono && styles.mono, style]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.xs,
        alignSelf: "stretch",
    },
    labelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    input: {
        backgroundColor: colors.surfaceAlt,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        borderRadius: radius.input,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 42,
        color: colors.text,
        fontSize: 14,
    },
    mono: {
        fontFamily: fonts.mono,
        fontSize: 13,
    },
});
