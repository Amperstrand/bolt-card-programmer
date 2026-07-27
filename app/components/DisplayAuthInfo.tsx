import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { MonoField, StatusRow } from "@/components/ui";
import { spacing } from "@/constants/theme";

export default function DisplayAuthInfo(props: any) {
    const {
        data,
        keys,
        setKeys,
        lnurlw_base,
        setlnurlw_base,
        setReadyToWrite,
        cardName,
        setCardName,
        privateUID,
        setPrivateUID,
    } = props;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();

    //Load the auth info from the URL
    useEffect(() => {
        if (!data || data == "") return;

        // Guards against a slow response for a previous URL landing after the user
        // has reset and pasted a new one, which would stage the wrong keys to write.
        let cancelled = false;

        const loadAuthInfo = async () => {
            setLoading(true);
            setError(undefined);
            try {
                // Bolt Card Hub endpoints (e.g. /batch?s=...) serve the keys over POST
                // and return an empty body (HTTP 405) for GET, which used to surface as
                // a cryptic "JSON Parse error: Unexpected end of input". POST first, then
                // fall back to GET for legacy auth endpoints that only accept GET.
                let response = await fetch(data, {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: "{}",
                });
                if (response.status === 404 || response.status === 405) {
                    response = await fetch(data, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                    });
                }

                // Read the body before checking the status: hubs report their failure
                // detail as {status:"ERROR", reason:"..."} and may pair it with a 4xx,
                // so rejecting on the status first would discard the only useful message.
                const body = (await response.text()).trim();

                let json;
                if (body) {
                    try {
                        json = JSON.parse(body);
                    } catch {
                        json = undefined;
                    }
                }

                if (cancelled) return;

                const statusMessage = `Server returned ${response.status} ${response.statusText}`.trim();

                if (json && json.status == "ERROR") {
                    setError(json.reason || statusMessage);
                    return;
                }

                if (!response.ok) {
                    throw new Error(statusMessage);
                }

                if (!body) {
                    throw new Error("Server returned an empty response");
                }

                if (!json) {
                    throw new Error("Server response was not valid JSON");
                }

                // Accept both the Bolt Card Hub uppercase schema (LNURLW, K0..K4) and the
                // legacy lowercase schema (lnurlw_base, k0..k4).
                const lnurlw = json.LNURLW || json.lnurlw_base;
                const k0 = json.K0 || json.k0;
                const k1 = json.K1 || json.k1;
                const k2 = json.K2 || json.k2;
                const k3 = json.K3 || json.k3;
                const k4 = json.K4 || json.k4;

                if (!(lnurlw && k0 && k1 && k2 && k3 && k4)) {
                    setError("The JSON response must contain LNURLW and K0-K4 (or lnurlw_base and k0-k4)");
                    return;
                }

                setlnurlw_base(lnurlw);
                if (json.card_name) setCardName(json.card_name);
                setKeys([k0, k1, k2, k3, k4]);
                setPrivateUID(json.uid_privacy != undefined && json.uid_privacy == "Y");

                setReadyToWrite(true);
            } catch (error: any) {
                console.error(error);
                if (!cancelled) setError(error.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadAuthInfo();

        return () => {
            cancelled = true;
        };
    }, [data]);

    const key0display = keys[0] ? keys[0].substring(0, 4) + "............" + keys[0].substring(28) : "pending...";
    const key1display = keys[1] ? keys[1].substring(0, 4) + "............" + keys[1].substring(28) : "pending...";
    const key2display = keys[2] ? keys[2].substring(0, 4) + "............" + keys[2].substring(28) : "pending...";
    const key3display = keys[3] ? keys[3].substring(0, 4) + "............" + keys[3].substring(28) : "pending...";
    const key4display = keys[4] ? keys[4].substring(0, 4) + "............" + keys[4].substring(28) : "pending...";

    return (
        <>
            {loading ? (
                <StatusRow status="pending" label="Loading auth info…" />
            ) : !error ? (
                <View style={styles.rows}>
                    <MonoField label="lnurl" value={lnurlw_base} />
                    <MonoField label="card_name" value={cardName} />
                    <MonoField label="Key 0" value={key0display} />
                    <MonoField label="Key 1" value={key1display} />
                    <MonoField label="Key 2" value={key2display} />
                    <MonoField label="Key 3" value={key3display} />
                    <MonoField label="Key 4" value={key4display} />
                    <MonoField label="Private UID" value={privateUID ? "Yes" : "No"} />
                    {privateUID && (
                        <StatusRow
                            status="warning"
                            label="Private UID cannot be undone. See the help section for more details."
                        />
                    )}
                </View>
            ) : (
                <View style={styles.rows}>
                    <StatusRow status="error" label={`Error: ${error}`} />
                    <MonoField label="URL" value={data} />
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    rows: {
        gap: spacing.sm,
        alignSelf: "stretch",
    },
});
