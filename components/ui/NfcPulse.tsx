import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

import { colors, spacing, type } from "@/constants/theme";

type NfcPulseProps = {
    label?: string;
    sublabel?: string;
    active?: boolean;
    size?: number;
};

function Ring({ size, delay, animated }: { size: number; delay: number; animated: boolean }) {
    const progress = useSharedValue(0);

    useEffect(() => {
        if (animated) {
            progress.value = withDelay(
                delay,
                withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }), -1)
            );
        } else {
            progress.value = 0;
        }
    }, [animated, delay, progress]);

    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 1 + progress.value * 0.6 }],
        opacity: animated ? 0.5 * (1 - progress.value) : 0.4,
    }));

    return (
        <Animated.View
            style={[
                styles.ring,
                { width: size, height: size, borderRadius: size / 2 },
                ringStyle,
            ]}
        />
    );
}

export function NfcPulse({ label, sublabel, active = true, size = 72 }: NfcPulseProps) {
    const reducedMotion = useReducedMotion();
    const animated = active && !reducedMotion;
    const box = size * 1.7;

    return (
        <View style={styles.container}>
            <View style={[styles.pulseBox, { width: box, height: box }]}>
                <Ring size={size} delay={0} animated={animated} />
                {animated ? <Ring size={size} delay={900} animated /> : null}
                <Ionicons name="card-outline" size={size * 0.5} color={colors.accent} />
            </View>
            {label ? <Text style={[type.heading, styles.centerText]}>{label}</Text> : null}
            {sublabel ? <Text style={[type.caption, styles.centerText]}>{sublabel}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        gap: spacing.sm,
        paddingVertical: spacing.md,
        alignSelf: "stretch",
    },
    pulseBox: {
        alignItems: "center",
        justifyContent: "center",
    },
    ring: {
        position: "absolute",
        borderWidth: 2,
        borderColor: colors.accent,
    },
    centerText: {
        textAlign: "center",
    },
});
