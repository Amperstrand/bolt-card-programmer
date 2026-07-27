import { useFocusEffect } from "@react-navigation/native";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import nfcManager, { Ndef, NfcTech } from "react-native-nfc-manager";

import { Button, Card, MonoField, NfcPulse, SectionTitle, StatusRow } from "@/components/ui";
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
    console.log("SetupBoltcard URL:", url);
    const [step, setStep] = useState(SetupStep.Init);
    const [readingNfc, setReadingNfc] = useState(false);
    const [error, setError] = useState("");

    //output
    const [tagTypeError, setTagTypeError] = useState("");
    const [cardUID, setCardUID] = useState("");
    const [ndefRead, setNdefRead] = useState("");
    const [ndefWritten, setNdefWritten] = useState(false);
    const [key0Changed, setKey0Changed] = useState(false);
    const [key1Changed, setKey1Changed] = useState(false);
    const [key2Changed, setKey2Changed] = useState(false);
    const [key3Changed, setKey3Changed] = useState(false);
    const [key4Changed, setKey4Changed] = useState(false);
    const [uidPrivacyEnabled, setUidPrivacyEnabled] = useState(false);
    const [writekeys, setWriteKeys] = useState("");
    const [testp, setTestp] = useState("");
    const [testc, setTestc] = useState("");
    const [testBolt, setTestBolt] = useState("");
    const [writingCard, setWritingCard] = useState(false);

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
        setCardUID("");
        setKey0Changed(false);
        setKey1Changed(false);
        setKey2Changed(false);
        setKey3Changed(false);
        setKey4Changed(false);
        setNdefWritten(false);
        setWriteKeys("");
        setTestp("");
        setTestc("");
        setTestBolt("");
        setWritingCard(false);
        nfcManager.cancelTechnologyRequest();
        setReadingNfc(false);
        setUidPrivacyEnabled(false);
    };

    const byteSize = (str: any) => new Blob([str]).size;

    const readNfc = async () => {
        reset();
        setStep(SetupStep.HoldCard);

        try {
            setReadingNfc(true);
            await nfcManager.requestTechnology(NfcTech.IsoDep, {
                alertMessage: "Ready to write card. Hold NFC card to phone until all keys are changed.",
            });
            setStep(SetupStep.ReadingUid);
            const tag = await nfcManager.getTag();
            if (!tag) throw new Error("Error reading card. No tag detected");
            let uid = tag?.id;
            setCardUID(uid ? uid : "");

            await Ntag424.isoSelectFileApplication();
            const key1Version = await Ntag424.getKeyVersion("01");
            if (key1Version != "00") throw new Error("TRY AGAIN AFTER RESETING YOUR CARD!");

            const key0 = "00000000000000000000000000000000";
            if (byteSize(uid) == 8) {
                //random uid
                //get the real uid by authenticating first
                await Ntag424.AuthEv2First("00", key0);
                uid = await Ntag424.getCardUid();
            }

            setStep(SetupStep.RequestingKeys);
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    UID: uid,
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
            const lnurlw_base = json.LNURLW ? json.LNURLW : json.lnurlw_base;
            const privateUID = json.uid_privacy != undefined && json.uid_privacy == "Y";

            if (!K0 || !K1 || !K2 || !K3 || !K4 || !lnurlw_base) {
                throw new Error("Error fetching the keys");
            }

            setWritingCard(true);
            setStep(SetupStep.WritingCard);
            //set ndef
            const ndefMessage = lnurlw_base.includes("?")
                ? lnurlw_base + "&p=00000000000000000000000000000000&c=0000000000000000"
                : lnurlw_base + "?p=00000000000000000000000000000000&c=0000000000000000";

            const message = [Ndef.uriRecord(ndefMessage)];
            const bytes = Ndef.encodeMessage(message);

            await Ntag424.setNdefMessage(bytes);
            setNdefWritten(true);

            // //auth first
            await Ntag424.AuthEv2First("00", key0);
            if (privateUID) {
                await Ntag424.setPrivateUid();
                setUidPrivacyEnabled(true);
            }
            const piccOffset = ndefMessage.indexOf("p=") + 9;
            const macOffset = ndefMessage.indexOf("c=") + 9;
            //change file settings
            await Ntag424.setBoltCardFileSettings(piccOffset, macOffset);
            //change keys
            console.log("changekey 1");
            await Ntag424.changeKey("01", key0, K1, "01");
            setKey1Changed(true);
            console.log("changekey 2");
            await Ntag424.changeKey("02", key0, K2, "01");
            setKey2Changed(true);
            console.log("changekey 3");
            await Ntag424.changeKey("03", key0, K3, "01");
            setKey3Changed(true);
            console.log("changekey 4");
            await Ntag424.changeKey("04", key0, K4, "01");
            setKey4Changed(true);
            console.log("changekey 0");
            await Ntag424.changeKey("00", key0, K0, "01");
            setKey0Changed(true);
            setWriteKeys("success");

            //set offset for ndef header
            var ndef = await Ntag424.readData("060000");
            while (ndef[ndef.length - 1] === 0) {
                //Remomving trailing 0s
                //@TODO: need to figure out why there are trailing 0s in ndef
                ndef.pop();
            }
            const setNdefMessage = Ndef.uri.decodePayload(ndef);
            setNdefRead(setNdefMessage);

            //we have the latest read from the card fire it off to the server.
            const httpsLNURL = String(setNdefMessage.replace("lnurlw://", "https://")).trim();
            fetch(httpsLNURL)
                .then((response) => {
                    if (!response.ok) {
                        // statusText is commonly blank on React Native, so lead with the code.
                        throw new Error(`Server returned ${response.status} ${response.statusText}`.trim());
                    }
                    return response.json();
                })
                .then((json) => {
                    setTestBolt("success");
                })
                .catch((error) => {
                    setTestBolt("Error: " + error.message);
                });

            await Ntag424.AuthEv2First("00", K0);

            const params = {};
            setNdefMessage.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
                params[key] = value;
                return value;
            });
            if (!("p" in params)) {
                setTestp("no p value to test");
                return;
            }
            if (!("c" in params)) {
                setTestc("no c value to test");
                return;
            }

            const pVal = params["p"];
            const cVal = params["c"].slice(0, 16);

            console.log({ pVal, cVal });
            const testResult = await Ntag424.testPAndC(pVal, cVal, uid, K1, K2);
            setTestp(testResult.pTest ? "ok" : "decrypt with key failed");
            setTestc(testResult.cTest ? "ok" : "decrypt with key failed");
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
            setTagTypeError(error);
            setStep(SetupStep.WritingCard);
        } finally {
            setWritingCard(false);
            nfcManager.cancelTechnologyRequest();
            setReadingNfc(false);
        }
    };

    return (
        <Card centered>
            <WithStep step={SetupStep.Init} current={step}>
                <ActivityIndicator size="large" color={colors.accent} />
            </WithStep>
            <WithStep step={SetupStep.Restart} current={step}>
                <Button title="Start programming the card" onPress={readNfc} />
            </WithStep>
            <WithStep step={SetupStep.HoldCard} current={step}>
                <NfcPulse label="Hold NFC card to phone" sublabel="Keep holding until all keys are written" />
            </WithStep>
            <WithStep step={SetupStep.ReadingUid} current={step}>
                <NfcPulse label="Reading card UID…" sublabel="Keep holding the card" />
            </WithStep>
            <WithStep step={SetupStep.RequestingKeys} current={step}>
                <NfcPulse label="Requesting new keys…" sublabel="Keep holding the card" />
            </WithStep>
            <WithStep step={SetupStep.WritingCard} current={step}>
                <View style={styles.output}>
                    {writingCard && <StatusRow status="pending" label="Writing card — keep holding it…" />}
                    <SectionTitle>Output</SectionTitle>
                    {tagTypeError ? <StatusRow status="error" label="Tag Type Error" detail={tagTypeError} /> : null}
                    {ndefWritten ? <StatusRow status="success" label="NDEF written" /> : null}
                    <StatusRow status={key0Changed ? "success" : "error"} label="Key 0" />
                    <StatusRow status={key1Changed ? "success" : "error"} label="Key 1" />
                    <StatusRow status={key2Changed ? "success" : "error"} label="Key 2" />
                    <StatusRow status={key3Changed ? "success" : "error"} label="Key 3" />
                    <StatusRow status={key4Changed ? "success" : "error"} label="Key 4" />
                    {writekeys ? (
                        <StatusRow
                            status={writekeys == "success" ? "success" : "error"}
                            label="Keys changed"
                            detail={writekeys == "success" ? undefined : writekeys}
                        />
                    ) : null}
                    {uidPrivacyEnabled ? <StatusRow status="success" label="Private UID enabled" /> : null}
                    <MonoField label="Card UID" value={cardUID} />
                    {ndefRead ? <MonoField label="Read NDEF" value={ndefRead} /> : null}
                    {testp ? (
                        cardUID && cardUID.length == 8 ? (
                            <StatusRow status="success" label="Test PICC: test skipped" />
                        ) : (
                            <StatusRow status={testp == "ok" ? "success" : "error"} label={`Test PICC: ${testp}`} />
                        )
                    ) : null}
                    {testc ? (
                        <StatusRow status={testc == "ok" ? "success" : "error"} label={`Test CMAC: ${testc}`} />
                    ) : null}
                    {testBolt ? (
                        <StatusRow
                            status={testBolt == "success" ? "success" : "error"}
                            label={`Bolt call test: ${testBolt}`}
                        />
                    ) : null}
                    {!writingCard && <Button title="Write again" onPress={readNfc} style={styles.again} />}
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
