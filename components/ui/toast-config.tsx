import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { type ToastConfig } from "react-native-toast-message";

import { colors, radius, spacing, type } from "@/constants/theme";

function ToastCard({ bar, text1, text2 }: { bar: string; text1?: string; text2?: string }) {
    return (
        <View style={styles.card}>
            <View style={[styles.bar, { backgroundColor: bar }]} />
            <View style={styles.textCol}>
                {text1 ? <Text style={type.body}>{text1}</Text> : null}
                {text2 ? <Text style={type.caption}>{text2}</Text> : null}
            </View>
        </View>
    );
}

export const toastConfig: ToastConfig = {
    success: ({ text1, text2 }) => <ToastCard bar={colors.success} text1={text1} text2={text2} />,
    error: ({ text1, text2 }) => <ToastCard bar={colors.danger} text1={text1} text2={text2} />,
    info: ({ text1, text2 }) => <ToastCard bar={colors.accent} text1={text1} text2={text2} />,
};

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        backgroundColor: colors.surfaceAlt,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        borderRadius: radius.button,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        marginHorizontal: spacing.lg,
        overflow: "hidden",
    },
    bar: {
        width: 3,
        alignSelf: "stretch",
        borderRadius: 2,
    },
    textCol: {
        flexShrink: 1,
        gap: 2,
    },
});
