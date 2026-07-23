import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

import { colors, fonts } from "@/constants/theme";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: StyleSheet.hairlineWidth,
                },
                tabBarLabelStyle: {
                    fontFamily: fonts.button,
                    fontSize: 11,
                },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="create"
                options={{
                    title: "Create",
                    tabBarIcon: ({ color }) => <Ionicons size={24} name="flash" color={color} />,
                }}
            />
            <Tabs.Screen
                name="reset-keys"
                options={{
                    title: "Reset",
                    tabBarIcon: ({ color }) => <Ionicons size={24} name="refresh" color={color} />,
                }}
            />
            <Tabs.Screen
                name="read"
                options={{
                    title: "Read",
                    tabBarIcon: ({ color }) => <Ionicons size={24} name="scan" color={color} />,
                }}
            />
            <Tabs.Screen
                name="test"
                options={{
                    title: "Test",
                    tabBarIcon: ({ color }) => <Ionicons size={24} name="flask" color={color} />,
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    title: "Help",
                    tabBarIcon: ({ color }) => <Ionicons size={24} name="help-circle" color={color} />,
                }}
            />
        </Tabs>
    );
}
