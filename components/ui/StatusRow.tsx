import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing, type } from "@/constants/theme";

type StatusRowProps = {
    label: string;
    status: "success" | "error" | "pending" | "warning";
    detail?: string;
};

export function StatusRow({ label, status, detail }: StatusRowProps) {
    return (
        <View style={styles.row}>
            {status === "pending" ? (
                <ActivityIndicator size="small" color={colors.accent} />
            ) : (
                <Ionicons
                    name={status === "success" ? "checkmark-circle" : "alert-circle"}
                    size={20}
                    color={status === "success" ? colors.success : status === "warning" ? colors.accent : colors.danger}
                />
            )}
            <View style={styles.textCol}>
                <Text selectable style={type.body}>
                    {label}
                </Text>
                {detail ? (
                    <Text selectable style={type.caption}>
                        {detail}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.sm,
        alignSelf: "stretch",
    },
    textCol: {
        flex: 1,
        gap: 2,
    },
});
