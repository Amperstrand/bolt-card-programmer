import React, { useEffect, useState } from "react";

import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Button, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Dialog from "react-native-dialog";
import NfcManager, { Ndef, NfcTech } from "react-native-nfc-manager";
import { Card, Title } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Ntag424 from "../class/NTag424";

export default function ResetKeysScreen() {
    const [writeKeysOutput, setWriteKeysOutput] = useState();

    const defaultKey = "00000000000000000000000000000000";

    const [uid, setUid] = useState();
    const [key0, setKey0] = useState(defaultKey);
    const [key1, setKey1] = useState(defaultKey);
    const [key2, setKey2] = useState(defaultKey);
    const [key3, setKey3] = useState(defaultKey);
    const [key4, setKey4] = useState(defaultKey);

    const [pasteWipeKeysJSON, setPasteWipeKeysJSON] = useState();
    const [promptVisible, setPromptVisible] = useState(false);
    const [keyJsonError, setKeyJsonError] = useState(false);
    const [resetNow, setResetNow] = useState(false);

    const params = useLocalSearchParams();
    const data = params.result ? params.result.toString() : null;
    const timestamp = params.timestamp ? params.timestamp.toString() : null;
    console.log("data:", data);

    useEffect(() => {
        if (data) {
            try {
                const dataObj = JSON.parse(data);
                setUid(dataObj.uid);

                const k1 = dataObj.k1 || defaultKey;
                setKey0(dataObj.k0 || defaultKey);
                setKey1(k1);
                setKey2(dataObj.k2 || defaultKey);
                setKey3(dataObj.k3 || k1);
                setKey4(dataObj.k4 || k1);
                let warnings = "";
                if (dataObj.action != "wipe") {
                    warnings = "Wipe action not specified, proceed with caution.\r\n";
                }
                if (dataObj.version != "1") {
                    warnings = warnings + " Expected version 1, found version: " + dataObj.version + "\r\n";
                }
                if (!dataObj.k0 || !dataObj.k1 || !dataObj.k2) {
                    warnings = warnings + " Required keys (k0/k1/k2) missing, proceed with caution";
                }
                if (!dataObj.k3 || !dataObj.k4) {
                    warnings = warnings + " Keys k3/k4 missing from JSON — using k1 as fallback.\r\n";
                }
                if (warnings) {
                    setKeyJsonError(warnings);
                }
            } catch (exceptionVar) {
                console.log("Error parsing JSON data:", exceptionVar);
                setKeyJsonError("" + exceptionVar);
            }
        }
    }, [data, timestamp]);

    const enableResetMode = async () => {
        setResetNow(true);
        setWriteKeysOutput(null);
        let result: string[] = [];
        let hadError = false;
        try {
            await NfcManager.requestTechnology(NfcTech.IsoDep, {
                alertMessage: "Ready to write card. Hold NFC card to phone until all keys are changed.",
            });

            const defaultKey = "00000000000000000000000000000000";

            await Ntag424.AuthEv2First("00", key0);

            await Ntag424.resetFileSettings();

            const tryChangeKey = async (keyNo: string, oldKey: string, label: string) => {
                try {
                    await Ntag424.changeKey(keyNo, oldKey, defaultKey, "00");
                    result.push(label + ": Success");
                } catch (e) {
                    hadError = true;
                    const msg = typeof e === "string" ? e : (e as Error).message ?? String(e);
                    result.push(label + ": FAILED — " + msg);
                }
            };

            await tryChangeKey("01", key1, "Key 1");
            await tryChangeKey("02", key2, "Key 2");
            await tryChangeKey("03", key3, "Key 3");
            await tryChangeKey("04", key4, "Key 4");
            await tryChangeKey("00", key0, "Key 0");

            const message = [Ndef.uriRecord("")];
            const bytes = Ndef.encodeMessage(message);
            await Ntag424.setNdefMessage(bytes);

            result.push("NDEF and SUN/SDM cleared");
        } catch (ex) {
            hadError = true;
            console.error("Oops!", ex, ex.constructor.name);
            let error: string =
                typeof ex === "object" && ex !== null
                    ? "NFC Error: " + ((ex as Error).message ?? (ex as Error).constructor?.name ?? String(ex))
                    : String(ex);
            result.push(error);
            setWriteKeysOutput(error);
        } finally {
            NfcManager.cancelTechnologyRequest();
            if (!hadError) {
                setWriteKeysOutput(result.join("\r\n"));
            }
        }
    };

    const disableResetMode = () => {
        NfcManager.cancelTechnologyRequest();
        setResetNow(false);
    };

    const scanQRCode = () => {
        router.push({
            pathname: "/scan",
            params: { redirect: "/(tabs)/reset" },
        });
    };

    const clearKeys = () => {
        setKey0(defaultKey);
        setKey1(defaultKey);
        setKey2(defaultKey);
        setKey3(defaultKey);
        setKey4(defaultKey);
    };

    return (
        <SafeAreaView>
            <ScrollView style={{ padding: 10 }}>
                <Card style={styles.card}>
                    <Card.Content>
                        <Title>Wipe Keys QR code</Title>
                        <Text>
                            Click on the wipe keys button on LNBits or run the ./wipeboltcard command on your boltcard
                            server
                        </Text>
                    </Card.Content>
                    <Card.Actions style={{ justifyContent: "space-around" }}>
                        <Button onPress={scanQRCode} title="Scan QR Code" />
                        <Button onPress={() => setPromptVisible(true)} title="Paste Key JSON" />
                    </Card.Actions>
                </Card>
                <Dialog.Container visible={promptVisible}>
                    <Dialog.Title style={styles.textBlack}>Enter Wipe Key JSON</Dialog.Title>
                    <Dialog.Description>Paste your wipe keys JSON here.</Dialog.Description>
                    <Dialog.Input
                        style={styles.textBlack}
                        label="Wipe Key JSON"
                        onChangeText={setPasteWipeKeysJSON}
                        value={pasteWipeKeysJSON}
                    />
                    <Dialog.Button
                        label="Cancel"
                        onPress={() => {
                            setPromptVisible(false);
                            setPasteWipeKeysJSON();
                        }}
                    />
                    <Dialog.Button
                        label="Continue"
                        onPress={() => {
                            try {
                                const parsed = JSON.parse(pasteWipeKeysJSON);
                                setPromptVisible(false);
                                router.replace({
                                    pathname: "/(tabs)/reset",
                                    params: {
                                        result: JSON.stringify(parsed),
                                        timestamp: Date.now().toString(),
                                    },
                                });
                            } catch (e) {
                                setKeyJsonError("Invalid JSON: " + (e instanceof Error ? e.message : String(e)));
                                setPromptVisible(false);
                            }
                        }}
                    />
                </Dialog.Container>
                <Dialog.Container visible={keyJsonError}>
                    <Dialog.Title style={{ color: "white" }}>Wipe Keys Issue</Dialog.Title>
                    <Text style={{ color: "white" }}>{keyJsonError}</Text>
                    <Dialog.Button
                        label="I understand"
                        onPress={() => {
                            setKeyJsonError(false);
                        }}
                    />
                </Dialog.Container>

                <Dialog.Container visible={resetNow}>
                    <Dialog.Title style={styles.textBlack}>
                        <Ionicons name="card" size={30} color="green" /> Tap NFC Card
                    </Dialog.Title>
                    {!writeKeysOutput && (
                        <Text style={{ fontSize: 20, textAlign: "center", borderColor: "black" }}>
                            Hold NFC card to reader when ready
                        </Text>
                    )}

                    <Text style={{ fontSize: 20, textAlign: "center", borderColor: "black" }}>
                        {writeKeysOutput ? writeKeysOutput : <ActivityIndicator />}
                    </Text>
                    <Dialog.Button
                        label="Close"
                        onPress={() => {
                            disableResetMode();
                        }}
                    />
                </Dialog.Container>

                <Card style={styles.card}>
                    <Card.Content>
                        <Title>Card Details</Title>
                        <View style={styles.titlecontainer}>
                            <Text style={styles.title}>Key 0</Text>
                            <Button
                                onPress={() => {
                                    setKey0("00000000000000000000000000000000");
                                }}
                                title="Set to Zeros"
                            />
                        </View>
                        <TextInput
                            style={styles.input}
                            value={key0}
                            maxLength={32}
                            multiline={true}
                            numberOfLines={1}
                            autoCapitalize="none"
                            onChangeText={(text) => setKey0(text)}
                            placeholder={defaultKey}
                        />
                        <View style={styles.titlecontainer}>
                            <Text style={styles.title}>Key 1</Text>
                            <Button
                                onPress={() => {
                                    setKey1("00000000000000000000000000000000");
                                }}
                                title="Set to Zeros"
                            />
                        </View>
                        <TextInput
                            style={styles.input}
                            value={key1}
                            maxLength={32}
                            multiline={true}
                            numberOfLines={1}
                            autoCapitalize="none"
                            onChangeText={(text) => setKey1(text)}
                            placeholder={defaultKey}
                        />
                        <View style={styles.titlecontainer}>
                            <Text style={styles.title}>Key 2</Text>
                            <Button
                                onPress={() => {
                                    setKey2("00000000000000000000000000000000");
                                }}
                                title="Set to Zeros"
                            />
                        </View>
                        <TextInput
                            style={styles.input}
                            value={key2}
                            maxLength={32}
                            multiline={true}
                            numberOfLines={1}
                            autoCapitalize="none"
                            onChangeText={(text) => setKey2(text)}
                            placeholder={defaultKey}
                        />
                        <View style={styles.titlecontainer}>
                            <Text style={styles.title}>Key 3</Text>
                            <Button
                                onPress={() => {
                                    setKey3("00000000000000000000000000000000");
                                }}
                                title="Set to Zeros"
                            />
                        </View>
                        <TextInput
                            style={styles.input}
                            value={key3}
                            maxLength={32}
                            multiline={true}
                            numberOfLines={1}
                            autoCapitalize="none"
                            onChangeText={(text) => setKey3(text)}
                            placeholder={defaultKey}
                        />
                        <View style={styles.titlecontainer}>
                            <Text style={styles.title}>Key 4</Text>
                            <Button
                                onPress={() => {
                                    setKey4("00000000000000000000000000000000");
                                }}
                                title="Set to Zeros"
                            />
                        </View>
                        <TextInput
                            style={styles.input}
                            value={key4}
                            maxLength={32}
                            multiline={true}
                            numberOfLines={1}
                            autoCapitalize="none"
                            onChangeText={(text) => setKey4(text)}
                            placeholder={defaultKey}
                        />
                        <Card.Actions style={{ justifyContent: "space-around" }}>
                            <Button onPress={() => enableResetMode()} title="Reset Card Now" />
                            <Button color="red" onPress={() => clearKeys()} title="Reset Inputs" />
                        </Card.Actions>
                    </Card.Content>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    card: {
        margin: 10,
    },
    title: {
        fontSize: 16,
    },
    titlecontainer: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    centerText: {
        flex: 1,
        fontSize: 18,
        padding: 32,
        color: "#777",
    },
    textBold: {
        fontWeight: "500",
        color: "#000",
    },
    buttonText: {
        fontSize: 21,
        color: "rgb(0,122,255)",
    },
    buttonTouchable: {
        padding: 16,
    },
    uid: {
        height: 30,
        width: "60%",
        marginBottom: 12,
        padding: 5,
        borderWidth: 1,
    },
    input: {
        height: 30,
        width: "100%",
        marginBottom: 12,
        borderWidth: 1,
        flexWrap: "wrap",
        padding: 5,
        fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
        textAlignVertical: "top",
        color: "#000",
    },
    textBlack: {
        color: "#000",
    },
});
