import React, { type ReactNode } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, type } from "@/constants/theme";
import { Button, type ButtonVariant } from "./Button";

export type DialogAction = {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
};

type AppDialogProps = {
    visible: boolean;
    title: string;
    icon?: ReactNode;
    children?: ReactNode;
    actions: DialogAction[];
    /** Android back button handler. Scrim taps never dismiss. */
    onRequestClose?: () => void;
};

export function AppDialog({ visible, title, icon, children, actions, onRequestClose }: AppDialogProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onRequestClose}
        >
            <View style={styles.scrim}>
                <View style={styles.sheet}>
                    {icon ? <View style={styles.icon}>{icon}</View> : null}
                    <Text style={[type.heading, styles.title]}>{title}</Text>
                    {children}
                    <View style={styles.actions}>
                        {actions.map((action) => (
                            <Button
                                key={action.label}
                                title={action.label}
                                onPress={action.onPress}
                                variant={action.variant ?? "ghost"}
                            />
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    scrim: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: "center",
        padding: spacing.xl,
    },
    sheet: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.md,
    },
    icon: {
        alignItems: "center",
    },
    title: {
        textAlign: "center",
    },
    actions: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-end",
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
});
