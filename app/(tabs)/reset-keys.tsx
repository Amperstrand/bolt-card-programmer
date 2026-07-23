import React, { useEffect, useState } from "react";

import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import NfcManager, { Ndef, NfcTech } from "react-native-nfc-manager";

import { AppDialog, AppTextInput, Button, Card, NfcPulse, Screen, StatusRow } from "@/components/ui";
import { type } from "@/constants/theme";
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

                setKey0(dataObj.k0 || defaultKey);
                setKey1(dataObj.k1 || defaultKey);
                setKey2(dataObj.k2 || defaultKey);
                setKey3(dataObj.k3 || defaultKey);
                setKey4(dataObj.k4 || defaultKey);
                let error = "";
                if (dataObj.action != "wipe") {
                    error = "Wipe action not specified, proceed with caution.\r\n";
                }
                if (dataObj.version != "1") {
                    error = error + " Expected version 1, found version: " + dataObj.version + "\r\n";
                }
                if (!dataObj.k0 || !dataObj.k1 || !dataObj.k2 || !dataObj.k3 || !dataObj.k4) {
                    error = error + " Some keys missing, proceed with caution";
                }
                setKeyJsonError(error);
            } catch (exceptionVar) {
                console.log("Error parsing JSON data:", exceptionVar);
                setKeyJsonError("" + exceptionVar);
            }
        }
    }, [data, timestamp]);

    const enableResetMode = async () => {
        setResetNow(true);
        setWriteKeysOutput(null);
        var result: any = [];
        try {
            // register for the NFC tag with NDEF in it
            await NfcManager.requestTechnology(NfcTech.IsoDep, {
                alertMessage: "Ready to write card. Hold NFC card to phone until all keys are changed.",
            });

            const defaultKey = "00000000000000000000000000000000";

            // //auth first
            await Ntag424.AuthEv2First("00", key0);

            //reset file settings
            await Ntag424.resetFileSettings();

            //change keys
            await Ntag424.changeKey("01", key1, defaultKey, "00");
            result.push("Change Key1: Success");
            console.log("changekey 2");
            await Ntag424.changeKey("02", key2, defaultKey, "00");
            result.push("Change Key2: Success");
            console.log("changekey 3");
            await Ntag424.changeKey("03", key3, defaultKey, "00");
            result.push("Change Key3: Success");
            await Ntag424.changeKey("04", key4, defaultKey, "00");
            result.push("Change Key4: Success");
            await Ntag424.changeKey("00", key0, defaultKey, "00");
            result = ["Change Key0: Success", ...result];

            const message = [Ndef.uriRecord("")];
            const bytes = Ndef.encodeMessage(message);
            await Ntag424.setNdefMessage(bytes);

            result.push("NDEF and SUN/SDM cleared");
        } catch (ex) {
            console.error("Oops!", ex, ex.constructor.name);
            var error = ex;
            if (typeof ex === "object") {
                error = "NFC Error: " + (ex.message ? ex.message : ex.constructor.name);
            }
            result.push(error);
            setWriteKeysOutput(error);
        } finally {
            // stop the nfc scanning
            NfcManager.cancelTechnologyRequest();
            setWriteKeysOutput(result.join("\r\n"));
            // setResetNow(false);
        }
    };

    const disableResetMode = () => {
        NfcManager.cancelTechnologyRequest();
        setResetNow(false);
    };

    const scanQRCode = () => {
        router.push({
            pathname: "/scan",
            params: { redirect: "/(tabs)/reset-keys" },
        });
    };

    const clearKeys = () => {
        setKey0(defaultKey);
        setKey1(defaultKey);
        setKey2(defaultKey);
        setKey3(defaultKey);
        setKey4(defaultKey);
    };

    const keyFields: { label: string; value: string; set: (text: string) => void }[] = [
        { label: "Key 0", value: key0, set: setKey0 },
        { label: "Key 1", value: key1, set: setKey1 },
        { label: "Key 2", value: key2, set: setKey2 },
        { label: "Key 3", value: key3, set: setKey3 },
        { label: "Key 4", value: key4, set: setKey4 },
    ];

    return (
        <Screen>
            <Card
                title="Wipe Keys QR code"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            title="Paste Key JSON"
                            icon="clipboard-outline"
                            onPress={() => setPromptVisible(true)}
                        />
                        <Button title="Scan QR Code" icon="qr-code" onPress={scanQRCode} />
                    </>
                }
            >
                <Text style={type.body}>
                    Click the wipe keys button on LNbits, or run the ./wipeboltcard command on your boltcard server.
                </Text>
            </Card>

            <AppDialog
                visible={promptVisible}
                title="Enter Wipe Key JSON"
                onRequestClose={() => {
                    setPromptVisible(false);
                    setPasteWipeKeysJSON();
                }}
                actions={[
                    {
                        label: "Cancel",
                        onPress: () => {
                            setPromptVisible(false);
                            setPasteWipeKeysJSON();
                        },
                    },
                    {
                        label: "Continue",
                        variant: "primary",
                        onPress: () => {
                            setPromptVisible(false);
                            setPasteWipeKeysJSON();
                            router.replace({
                                pathname: "/(tabs)/reset-keys",
                                params: {
                                    // the useEffect above reads `params.result`
                                    result: pasteWipeKeysJSON,
                                    timestamp: Date.now(),
                                },
                            });
                        },
                    },
                ]}
            >
                <Text style={type.caption}>Paste your wipe keys JSON here.</Text>
                <AppTextInput
                    mono
                    multiline
                    numberOfLines={4}
                    label="Wipe Key JSON"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setPasteWipeKeysJSON}
                    value={pasteWipeKeysJSON}
                />
            </AppDialog>

            <AppDialog
                visible={!!keyJsonError}
                title="Wipe Keys Issue"
                onRequestClose={() => setKeyJsonError(false)}
                actions={[
                    {
                        label: "I understand",
                        variant: "primary",
                        onPress: () => setKeyJsonError(false),
                    },
                ]}
            >
                <StatusRow status="warning" label={String(keyJsonError)} />
            </AppDialog>

            <AppDialog
                visible={resetNow}
                title="Tap NFC Card"
                onRequestClose={disableResetMode}
                actions={[{ label: "Close", onPress: disableResetMode }]}
            >
                {!writeKeysOutput ? (
                    <NfcPulse label="Hold NFC card to phone" sublabel="Keep holding until all keys are changed" />
                ) : (
                    <Text selectable style={type.mono}>
                        {writeKeysOutput}
                    </Text>
                )}
            </AppDialog>

            <Card
                title="Card Details"
                footer={
                    <>
                        <Button variant="destructive" title="Clear Inputs" onPress={() => clearKeys()} />
                        <Button title="Reset Card Now" onPress={() => enableResetMode()} />
                    </>
                }
            >
                {keyFields.map((field) => (
                    <AppTextInput
                        key={field.label}
                        mono
                        label={field.label}
                        labelAccessory={
                            <Button
                                variant="ghost"
                                compact
                                title="Set to zeros"
                                onPress={() => field.set(defaultKey)}
                            />
                        }
                        value={field.value}
                        maxLength={32}
                        multiline={true}
                        numberOfLines={1}
                        autoCapitalize="none"
                        onChangeText={field.set}
                        placeholder={defaultKey}
                    />
                ))}
            </Card>
        </Screen>
    );
}
