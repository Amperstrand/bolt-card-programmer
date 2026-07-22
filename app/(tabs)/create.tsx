import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Text } from "react-native";
import NfcManager, { Ndef, NfcTech } from "react-native-nfc-manager";

import { AppDialog, AppTextInput, Button, Card, MonoField, NfcPulse, Screen, StatusRow } from "@/components/ui";
import { type } from "@/constants/theme";
import Ntag424 from "../class/NTag424";
import DisplayAuthInfo from "../components/DisplayAuthInfo";
import parseBoltcardUrl from "../utils/parseBoltcardUrl";

export default function CreateBoltcardScreen() {
    const params = useLocalSearchParams();
    console.log("CreateBoltcardScreen params:", params);
    const { result } = params;
    // Accept both a plain auth URL and a boltcard://program?url=... deeplink QR.
    // The camera/deeplink path is unwrapped by expo-router (app/program.tsx), but
    // the in-app scanner passes the raw scanned string straight through.
    const data = result ? parseBoltcardUrl(result.toString()) : null;

    const [promptVisible, setPromptVisible] = useState(false);
    const [pasteUrlValue, setPasteUrlValue] = useState();

    //setup
    const [keys, setKeys] = useState([]);
    const [lnurlw_base, setlnurlw_base] = useState();
    const [cardName, setCardName] = useState();
    const [readyToWrite, setReadyToWrite] = useState(false);
    const [writeMode, setWriteMode] = useState(false);

    //output
    const [cardUID, setCardUID] = useState();
    const [tagname, setTagname] = useState();
    const [tagTypeError, setTagTypeError] = useState();

    const [key0Changed, setKey0Changed] = useState();
    const [key1Changed, setKey1Changed] = useState();
    const [key2Changed, setKey2Changed] = useState();
    const [key3Changed, setKey3Changed] = useState();
    const [key4Changed, setKey4Changed] = useState();
    const [privateUID, setPrivateUID] = useState(false);

    const [ndefWritten, setNdefWritten] = useState();
    const [writekeys, setWriteKeys] = useState();
    const [ndefRead, setNdefRead] = useState();
    const [testp, setTestp] = useState();
    const [testc, setTestc] = useState();
    const [testBolt, setTestBolt] = useState();

    const scanQRCode = () => {
        router.push({
            pathname: "/scan",
            params: { redirect: "/(tabs)/create" },
        });
    };

    const resetAll = () => {
        setKeys([]);
        setReadyToWrite(false);
        setWriteMode(false);
        resetOutput();
        router.replace({
            pathname: "/(tabs)/create",
            params: { data: null },
        });
    };

    const resetOutput = () => {
        setTagTypeError(null);
        setTagname(null);
        setCardUID(null);
        setKey0Changed(null);
        setKey1Changed(null);
        setKey2Changed(null);
        setKey3Changed(null);
        setKey4Changed(null);
        setNdefWritten(null);
        setWriteKeys(null);
    };

    const writeAgain = async () => {
        resetOutput();
        console.log(keys);
        // NativeModules.MyReactModule.setCardMode('createBoltcard');
        setWriteMode(true);
        try {
            // register for the NFC tag with NDEF in it
            await NfcManager.requestTechnology(NfcTech.IsoDep, {
                alertMessage: "Ready to write card. Hold NFC card to phone until all keys are changed.",
            });

            //set ndef
            const ndefMessage = lnurlw_base.includes("?")
                ? lnurlw_base + "&p=00000000000000000000000000000000&c=0000000000000000"
                : lnurlw_base + "?p=00000000000000000000000000000000&c=0000000000000000";

            const message = [Ndef.uriRecord(ndefMessage)];
            const bytes = Ndef.encodeMessage(message);

            await Ntag424.setNdefMessage(bytes);
            setNdefWritten("success");

            const key0 = "00000000000000000000000000000000";
            // //auth first
            await Ntag424.AuthEv2First("00", key0);

            if (privateUID) {
                await Ntag424.setPrivateUid();
            }
            const piccOffset = ndefMessage.indexOf("p=") + 9;
            const macOffset = ndefMessage.indexOf("c=") + 9;
            //change file settings
            await Ntag424.setBoltCardFileSettings(piccOffset, macOffset);
            //get uid
            const uid = await Ntag424.getCardUid();
            console.log("UID", uid);
            setCardUID(uid);

            //change keys
            console.log("changekey 1");
            await Ntag424.changeKey("01", key0, keys[1], "01");
            setKey1Changed(true);
            console.log("changekey 2");
            await Ntag424.changeKey("02", key0, keys[2], "01");
            setKey2Changed(true);
            console.log("changekey 3");
            await Ntag424.changeKey("03", key0, keys[3], "01");
            setKey3Changed(true);
            console.log("changekey 4");
            await Ntag424.changeKey("04", key0, keys[4], "01");
            setKey4Changed(true);
            console.log("changekey 0");
            await Ntag424.changeKey("00", key0, keys[0], "01");
            setKey0Changed(true);
            setWriteKeys("success");

            //set offset for ndef header
            const ndef = await Ntag424.readData("060000");
            const setNdefMessage = Ndef.uri.decodePayload(ndef);
            setNdefRead(setNdefMessage);

            //we have the latest read from the card fire it off to the server.
            const httpsLNURL = setNdefMessage.replace("lnurlw://", "https://");
            fetch(httpsLNURL)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(response.statusText);
                    }
                    return response.json();
                })
                .then((json) => {
                    setTestBolt("success");
                })
                .catch((error) => {
                    setTestBolt("Error: " + error.message);
                });

            await Ntag424.AuthEv2First("00", keys[0]);

            const params = {};
            setNdefMessage.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
                params[key] = value;
            });
            if (!"p" in params) {
                setTestp("no p value to test");
                return;
            }
            if (!"c" in params) {
                setTestc("no c value to test");
                return;
            }

            const pVal = params["p"];
            const cVal = params["c"].slice(0, 16);

            const testResult = await Ntag424.testPAndC(pVal, cVal, uid, keys[1], keys[2]);
            setTestp(testResult.pTest ? "ok" : "decrypt with key failed");
            setTestc(testResult.cTest ? "ok" : "decrypt with key failed");
        } catch (ex) {
            console.error("Oops!", ex);
            var error = ex;
            if (typeof ex === "object") {
                error = "NFC Error: " + (ex.message ? ex.message : ex.constructor.name);
            }
            setTagTypeError(error);
        } finally {
            // stop the nfc scanning
            NfcManager.cancelTechnologyRequest();
            setWriteMode(false);
        }
    };

    return (
        <Screen>
            {!data || data == null ? (
                <>
                    <Card
                        title="Scan QR Code"
                        footer={
                            <>
                                <Button
                                    variant="secondary"
                                    title="Paste Auth URL"
                                    icon="clipboard-outline"
                                    onPress={() => setPromptVisible(true)}
                                />
                                <Button title="Scan QR Code" icon="qr-code" onPress={scanQRCode} />
                            </>
                        }
                    >
                        <Text style={type.body}>
                            Press the create card button on LNbits, or run the ./createboltcard command on your boltcard
                            server.
                        </Text>
                    </Card>
                    <AppDialog
                        visible={promptVisible}
                        title="Enter Auth URL"
                        onRequestClose={() => {
                            setPromptVisible(false);
                            setPasteUrlValue();
                        }}
                        actions={[
                            {
                                label: "Cancel",
                                onPress: () => {
                                    setPromptVisible(false);
                                    setPasteUrlValue();
                                },
                            },
                            {
                                label: "Continue",
                                variant: "primary",
                                onPress: () => {
                                    setPromptVisible(false);
                                    setPasteUrlValue();
                                    router.replace({
                                        pathname: "/(tabs)/create",
                                        params: {
                                            // screen reads `params.result` (not `data`) — see top of component
                                            result: pasteUrlValue,
                                            timestamp: Date.now(),
                                        },
                                    });
                                },
                            },
                        ]}
                    >
                        <Text style={type.caption}>
                            Paste your Auth URL from the console here to import the keys.
                        </Text>
                        <AppTextInput
                            mono
                            label="Auth URL"
                            autoCapitalize="none"
                            autoCorrect={false}
                            onChangeText={setPasteUrlValue}
                            value={pasteUrlValue}
                        />
                    </AppDialog>
                </>
            ) : (
                <Card
                    title="Check URLs and Keys"
                    footer={
                        <>
                            <Button variant="destructive" title="Reset" onPress={resetAll} />
                            {readyToWrite && !writeMode && <Button title="Write Card Now" onPress={writeAgain} />}
                        </>
                    }
                >
                    <DisplayAuthInfo
                        data={data}
                        keys={keys}
                        setKeys={setKeys}
                        lnurlw_base={lnurlw_base}
                        setlnurlw_base={setlnurlw_base}
                        setReadyToWrite={setReadyToWrite}
                        cardName={cardName}
                        setCardName={setCardName}
                        privateUID={privateUID}
                        setPrivateUID={setPrivateUID}
                    />
                </Card>
            )}

            {writeMode && (
                <Card
                    centered
                    footer={
                        <Button
                            variant="ghost"
                            title="Cancel"
                            onPress={() => {
                                NfcManager.cancelTechnologyRequest();
                                setWriteMode(false);
                                setReadyToWrite(true);
                            }}
                        />
                    }
                >
                    <NfcPulse label="Hold NFC card to phone" sublabel="Keep holding until all keys are written" />
                </Card>
            )}
            {(cardUID || tagTypeError) && (
                <Card title="Output" footer={<Button title="Write Again" onPress={writeAgain} />}>
                    {tagTypeError ? <StatusRow status="error" label="Tag Type Error" detail={tagTypeError} /> : null}
                    {cardUID ? <MonoField label="Card UID" value={cardUID} /> : null}
                    {tagname ? <StatusRow status="success" label={`Tag: ${tagname}`} /> : null}
                    {ndefWritten ? (
                        <StatusRow
                            status={ndefWritten == "success" ? "success" : "error"}
                            label="NDEF written"
                            detail={ndefWritten == "success" ? undefined : ndefWritten}
                        />
                    ) : null}
                    {writekeys ? (
                        <StatusRow
                            status={writekeys == "success" ? "success" : "error"}
                            label="Keys changed"
                            detail={writekeys == "success" ? undefined : writekeys}
                        />
                    ) : null}
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
                </Card>
            )}
        </Screen>
    );
}
