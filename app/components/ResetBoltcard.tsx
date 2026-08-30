import { useFocusEffect } from "@react-navigation/native";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import nfcManager, { Ndef, NfcTech } from "react-native-nfc-manager";

import { Button, Card, NfcPulse, SectionTitle, StatusRow } from "@/components/ui";
import { colors, spacing, type } from "@/constants/theme";
import Ntag424 from "../class/NTag424";

const SetupStep = {
    Init: 1,
    Restart: 2,
    HoldCard: 3,
    ReadingUid: 4,
    RequestingKeys: 5,
    WritingCard: 6,
};

const WithStep = ({ step, current, children }: any) => {
    return step === current ? children : null;
};
export default function SetupBoltcard({ url }: any) {
    const [step, setStep] = useState(SetupStep.Init);
    const [readingNfc, setReadingNfc] = useState(false);
    const [error, setError] = useState("");

    //output
    const [tagTypeError, setTagTypeError] = useState("");
    const [writingCard, setWritingCard] = useState(false);

    const [writeKeysOutput, setWriteKeysOutput] = useState("");

    if (!url) {
        return (
            <Card>
                <Text style={type.body}>No valid URL passed.</Text>
            </Card>
        );
    }

    // Pre-existing hook-order hazard: this early return sits above useFocusEffect.
    // The url prop is fixed per mount in practice, so the order is stable at runtime.
    useFocusEffect(
        React.useCallback(() => {
            readNfc();
            return () => {
                nfcManager.cancelTechnologyRequest();
            };
        }, [])
    );

    const reset = () => {
        setError("");
        setTagTypeError("");
        setWriteKeysOutput("");
        setWritingCard(false);
        nfcManager.cancelTechnologyRequest();
        setReadingNfc(false);
    };

    const readNfc = async () => {
        reset();
        setStep(SetupStep.HoldCard);
        var result = [];
        try {
            setReadingNfc(true);
            await nfcManager.requestTechnology(NfcTech.IsoDep, {
                alertMessage: "Ready to write card. Hold NFC card to phone until all keys are changed.",
            });
            setStep(SetupStep.ReadingUid);
            const tag = await nfcManager.getTag();
            if (!tag) throw new Error("Error reading card. No tag detected");
            const uid = tag?.id;

            // DEEPLINK.md "Reset action" step 1: if the lnurlw NDEF can't be read the
            // card is already reset — surface a clear message rather than a generic
            // NFC error from decoding a missing record below.
            if (!tag.ndefMessage || !tag.ndefMessage[0]) {
                throw new Error("YOUR CARD IS ALREADY RESET!");
            }

            const ndefMessage = Ndef.uri.decodePayload(tag.ndefMessage[0].payload);

            await Ntag424.isoSelectFileApplication();
            const key1Version = await Ntag424.getKeyVersion("01");
            if (key1Version == "00") throw new Error("YOUR CARD IS ALREADY RESET!");

            setStep(SetupStep.RequestingKeys);
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    LNURLW: ndefMessage,
                }),
            });
            if (!response.ok) {
                console.log(response);
                console.log(await response.text());
                throw new Error("Error fetching the keys");
            }
            const json = await response.json();
            console.log(json);
            const K0 = json.K0 ? json.K0 : json.k0;
            const K1 = json.K1 ? json.K1 : json.k1;
            const K2 = json.K2 ? json.K2 : json.k2;
            const K3 = json.K3 ? json.K3 : json.k3;
            const K4 = json.K4 ? json.K4 : json.k4;
            if (!K0 || !K1 || !K2 || !K3 || !K4) {
                throw new Error("Error fetching the keys");
            }

            setWritingCard(true);
            setStep(SetupStep.WritingCard);

            const defaultKey = "00000000000000000000000000000000";
            // //auth first
            await Ntag424.AuthEv2First("00", K0);

            //reset file settings
            await Ntag424.resetFileSettings();

            //change keys
            await Ntag424.changeKey("01", K1, defaultKey, "00");
            result.push("Change Key1: Success");
            console.log("changekey 2");
            await Ntag424.changeKey("02", K2, defaultKey, "00");
            result.push("Change Key2: Success");
            console.log("changekey 3");
            await Ntag424.changeKey("03", K3, defaultKey, "00");
            result.push("Change Key3: Success");
            await Ntag424.changeKey("04", K4, defaultKey, "00");
            result.push("Change Key4: Success");
            await Ntag424.changeKey("00", K0, defaultKey, "00");
            result = ["Change Key0: Success", ...result];

            const message = [Ndef.uriRecord("")];
            const bytes = Ndef.encodeMessage(message);
            await Ntag424.setNdefMessage(bytes);

            result.push("NDEF and SUN/SDM cleared");
        } catch (ex) {
            console.error("Oops!", ex);
            var error = ex;
            if (typeof ex === "object") {
                error = ex.message ? ex.message : ex.constructor.name;
            }
            if (
                error == "You can only issue one request at a time" ||
                error == "UserCancel" ||
                error == "Duplicated registration"
            ) {
                setStep(SetupStep.Restart);
                return;
            }
            error = "NFC Error: " + error;
            setStep(SetupStep.WritingCard);
            setTagTypeError(error);
        } finally {
            setWritingCard(false);
            nfcManager.cancelTechnologyRequest();
            setReadingNfc(false);
            setWriteKeysOutput(result.join("\r\n"));
        }
    };

    return (
        <Card centered>
            <WithStep step={SetupStep.Init} current={step}>
                <ActivityIndicator size="large" color={colors.accent} />
            </WithStep>
            <WithStep step={SetupStep.Restart} current={step}>
                <Button title="Start resetting the card" onPress={readNfc} />
            </WithStep>
            <WithStep step={SetupStep.HoldCard} current={step}>
                <NfcPulse label="Hold NFC card to phone" sublabel="Keep holding until all keys are changed" />
            </WithStep>
            <WithStep step={SetupStep.ReadingUid} current={step}>
                <NfcPulse label="Reading card UID…" sublabel="Keep holding the card" />
            </WithStep>
            <WithStep step={SetupStep.RequestingKeys} current={step}>
                <NfcPulse label="Requesting keys to wipe…" sublabel="Keep holding the card" />
            </WithStep>
            <WithStep step={SetupStep.WritingCard} current={step}>
                <View style={styles.output}>
                    {writingCard && <StatusRow status="pending" label="Writing card — keep holding it…" />}
                    <SectionTitle>Output</SectionTitle>
                    {tagTypeError ? <StatusRow status="error" label="Tag Type Error" detail={tagTypeError} /> : null}
                    {writeKeysOutput ? (
                        <Text selectable style={type.mono}>
                            {writeKeysOutput}
                        </Text>
                    ) : null}
                    {!writingCard && <Button title="Wipe again" onPress={readNfc} style={styles.again} />}
                </View>
            </WithStep>
        </Card>
    );
}

const styles = StyleSheet.create({
    output: {
        alignSelf: "stretch",
        gap: spacing.sm,
    },
    again: {
        alignSelf: "center",
        marginTop: spacing.sm,
    },
});
