import Clipboard from "@react-native-clipboard/clipboard";
import React, { useState } from "react";
import { Text } from "react-native";
import NfcManager, { Ndef, NfcTech } from "react-native-nfc-manager";
import Toast from "react-native-toast-message";

import { Button, Card, MonoField, NfcPulse, Screen } from "@/components/ui";
import { colors, type } from "@/constants/theme";
import Ntag424 from "../class/NTag424";

export default function ReadNFCScreen() {
    const [cardReadInfo, setCardReadInfo] = useState("");
    const [ndef, setNdef] = useState("pending...");
    const [cardUID, setCardUID] = useState();
    const [key0Changed, setKey0Changed] = useState("Key 0 version pending");
    const [key1Changed, setKey1Changed] = useState("Key 1 version pending");
    const [key2Changed, setKey2Changed] = useState("Key 2 version pending");
    const [key3Changed, setKey3Changed] = useState("Key 3 version pending");
    const [key4Changed, setKey4Changed] = useState("Key 4 version pending");

    const [readyToRead, setReadyToRead] = useState(false);
    const [readError, setReadError] = useState(null);

    const copyToClipboard = () => {
        Clipboard.setString(cardUID);
        Toast.show({
            type: "success",
            text1: "Copied to clipboard",
        });
    };

    const readNfc = async () => {
        setReadError(null);
        setKey0Changed("Key 0 version pending");
        setKey1Changed("Key 1 version pending");
        setKey2Changed("Key 2 version pending");
        setKey3Changed("Key 3 version pending");
        setKey4Changed("Key 4 version pending");
        setCardReadInfo(null);
        setNdef(null);
        setReadyToRead(true);

        try {
            await NfcManager.requestTechnology(NfcTech.IsoDep);
            const tag = await NfcManager.getTag();

            const ndefMessage = Ndef.uri.decodePayload(tag.ndefMessage[0].payload);
            setNdef(ndefMessage);

            await Ntag424.isoSelectFileApplication();
            const cardVersion = await Ntag424.getVersion();
            const cardTypes = {
                "01": "MIFARE DESFire",
                "02": "MIFARE Plus",
                "03": "MIFARE Ultralight",
                "04": "NTAG",
                "05": "RFU",
                "06": "RFU",
                "07": "NTAG I2C",
                "08": "MIFARE DESFire Light",
            };
            setCardReadInfo(
                `Tagname: ${cardTypes.hasOwnProperty(cardVersion.HWType) ? cardTypes[cardVersion.HWType] : ""}\nUID:${
                    tag.id
                } \nTotalMem: ${cardVersion.HWStorageSize == "11" ? "Between 256B and 512B" : "RFU"}\nVendor: ${
                    cardVersion.VendorID == "04" ? "NXP" : "Non NXP"
                }`
            );

            setCardUID(tag.id);
            const key0Version = await Ntag424.getKeyVersion("00");
            // console.log('key0', key0Version);
            setKey0Changed("Key 0 version: " + key0Version);
            const key1Version = await Ntag424.getKeyVersion("01");
            setKey1Changed("Key 1 version: " + key1Version);
            const key2Version = await Ntag424.getKeyVersion("02");
            setKey2Changed("Key 2 version: " + key2Version);
            const key3Version = await Ntag424.getKeyVersion("03");
            setKey3Changed("Key 3 version: " + key3Version);
            const key4Version = await Ntag424.getKeyVersion("04");
            setKey4Changed("Key 4 version: " + key4Version);
        } catch (ex) {
            console.warn("Oops!", ex);
            var error = ex;
            if (typeof ex === "object") {
                error = "NFC Error: " + (ex.message ? ex.message : ex.constructor.name);
            }
            setReadError(error);
        } finally {
            // stop the nfc scanning
            await NfcManager.cancelTechnologyRequest();
            setReadyToRead(false);
        }
    };

    return (
        <Screen>
            {readyToRead ? (
                <Card centered>
                    <NfcPulse label="Hold NFC card to phone" />
                </Card>
            ) : (
                <Button title="Enable NFC reader" icon="scan" onPress={readNfc} />
            )}
            {readError && (
                <Card title="Tag Read Error">
                    <Text selectable style={[type.body, { color: colors.danger }]}>
                        {readError}
                    </Text>
                </Card>
            )}
            <Card title="Card Details">
                <MonoField label="NDEF Record" value={ndef} />
                <MonoField label="Card UID" value={cardUID} onCopy={copyToClipboard} />
                <MonoField label="Attributes" value={cardReadInfo} />
            </Card>
            <Card title="Card Keys">
                <Text style={type.body}>{key0Changed}</Text>
                <Text style={type.body}>{key1Changed}</Text>
                <Text style={type.body}>{key2Changed}</Text>
                <Text style={type.body}>{key3Changed}</Text>
                <Text style={type.body}>{key4Changed}</Text>
            </Card>
        </Screen>
    );
}
