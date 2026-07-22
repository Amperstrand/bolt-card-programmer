import React, { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, spacing } from "@/constants/theme";
import { SectionTitle } from "./SectionTitle";

type CardProps = {
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    centered?: boolean;
    style?: StyleProp<ViewStyle>;
};

export function Card({ title, children, footer, centered, style }: CardProps) {
    return (
        <View style={[styles.card, centered && styles.centered, style]}>
            {title ? <SectionTitle style={centered && styles.centeredText}>{title}</SectionTitle> : null}
            {children}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.md,
    },
    centered: {
        alignItems: "center",
    },
    centeredText: {
        textAlign: "center",
    },
    footer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-end",
        gap: spacing.md,
        alignSelf: "stretch",
        marginTop: spacing.xs,
    },
});
