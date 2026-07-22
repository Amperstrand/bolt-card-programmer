import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, Screen } from "@/components/ui";
import { colors, spacing, type } from "@/constants/theme";

export default function ScanQR() {
    const params = useLocalSearchParams();

    const [facing, setFacing] = useState<CameraType>("back");
    const [permission, requestPermission] = useCameraPermissions();
    const [notQR, setNotQR] = useState<boolean>(false);
    const [redirect, setRedirect] = useState<string>(params.redirect ? params.redirect.toString() : "");
    const [redirecting, setRedirecting] = useState<boolean>(false);
    const [savedStates, setSavedStates] = useState<string>("");

    useEffect(() => {
        if (params.redirect) {
            setRedirect(params.redirect.toString());
        }
        if (params.savedStates) {
            setSavedStates(params.savedStates.toString());
        }
    }, []);

    if (!permission) {
        // Camera permissions are still loading.
        return <View style={styles.loading} />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <Screen scroll={false} style={styles.message}>
                <Ionicons name="camera-outline" size={72} color={colors.textMuted} />
                <Text style={[type.heading, styles.centerText]}>Camera access</Text>
                <Text style={[type.caption, styles.centerText]}>
                    We need access to your camera to scan QR codes. Please allow camera permission to continue.
                </Text>
                <Button title="Allow camera access" onPress={requestPermission} />
                <Button variant="ghost" title="Go back" onPress={() => router.back()} />
            </Screen>
        );
    }

    if (notQR) {
        return (
            <Screen scroll={false} style={styles.message}>
                <Ionicons name="warning-outline" size={72} color={colors.accent} />
                <Text style={[type.heading, styles.centerText]}>Not a QR code</Text>
                <Text style={[type.caption, styles.centerText]}>
                    This is not a QR code. Please try scanning again.
                </Text>
                <Button title="Try again" onPress={() => setNotQR(false)} />
                <Button variant="ghost" title="Go back" onPress={() => router.back()} />
            </Screen>
        );
    }

    function toggleCameraFacing() {
        setFacing((current) => (current === "back" ? "front" : "back"));
    }

    return (
        <View style={styles.wrapper}>
            <CameraView
                style={styles.camera}
                facing={facing}
                onBarcodeScanned={(result) => {
                    if (result.type != "qr") {
                        setNotQR(true);
                    } else {
                        if (redirecting) return;
                        setRedirecting(true);
                        router.replace({
                            pathname: redirect,
                            params: {
                                result: result.data,
                                savedStates: savedStates,
                            },
                        });
                    }
                }}
            />
            <View style={styles.buttonContainer}>
                <Button
                    variant="secondary"
                    icon="camera-reverse"
                    title="Flip camera"
                    onPress={toggleCameraFacing}
                    style={styles.overlayButton}
                />
                <Button
                    variant="secondary"
                    icon="close"
                    title="Cancel"
                    onPress={() => {
                        router.back();
                    }}
                    style={styles.overlayButton}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    wrapper: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: colors.bg,
    },
    message: {
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
        gap: spacing.md,
    },
    centerText: {
        textAlign: "center",
    },
    camera: {
        flex: 1,
    },
    buttonContainer: {
        position: "absolute",
        bottom: 60,
        left: 0,
        right: 0,
        paddingHorizontal: 30,
        gap: spacing.md,
    },
    overlayButton: {
        backgroundColor: colors.overlay,
        borderWidth: 0,
    },
});
