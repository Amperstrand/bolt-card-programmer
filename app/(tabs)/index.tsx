import Constants from "expo-constants";
import React from "react";
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Button, Card, Screen } from "@/components/ui";
import { colors, radius, spacing, type } from "@/constants/theme";

const appVersion = Constants.expoConfig?.version ?? "unknown";

type GetStartedStep = {
    name: string;
    badge?: string;
    copy: string;
    linkLabel: string;
    icon: React.ComponentProps<typeof Button>["icon"];
    url: string;
};

const getStartedSteps: GetStartedStep[] = [
    {
        name: "Bolt Card Hub Launcher",
        badge: "Easiest",
        copy: "Launch a hosted Bolt Card Hub in one click, then scan its QR code in the Create tab.",
        linkLabel: "Open Hub Launcher",
        icon: "rocket-outline",
        url: "https://bolt-card-hub-launcher.vercel.app/",
    },
    {
        name: "BTCPay Server",
        copy: "Issue and top up Bolt Cards from your own BTCPay Server store using Pull Payments.",
        linkLabel: "BTCPay Server setup guide",
        icon: "server-outline",
        url: "https://blog.btcpayserver.org/btcpay-server-1-12-0/",
    },
    {
        name: "LNbits",
        copy: "Run the boltcards extension on your LNbits instance and create cards from a wallet.",
        linkLabel: "LNbits extension docs",
        icon: "flash-outline",
        url: "https://github.com/lnbits/boltcards",
    },
];

function LinkButton({
    title,
    icon,
    url,
}: {
    title: string;
    icon: React.ComponentProps<typeof Button>["icon"];
    url: string;
}) {
    return (
        <Button
            variant="secondary"
            title={title}
            icon={icon}
            onPress={() => Linking.openURL(url)}
            style={styles.linkButton}
        />
    );
}

export default function HelpScreen() {
    return (
        <Screen>
            <Card>
                <Text selectable style={type.title}>
                    Bolt Card Programmer
                </Text>
                <Text selectable style={type.caption}>
                    Version {appVersion}
                </Text>
            </Card>
            <Card title="Get started">
                <Text style={type.caption}>
                    Your card needs a Bolt Card service to point at. Pick one of these, easiest first:
                </Text>
                {getStartedSteps.map((step) => (
                    <View key={step.name} style={styles.step}>
                        <View style={styles.stepHeader}>
                            <Text style={type.heading}>{step.name}</Text>
                            {step.badge ? (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{step.badge}</Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={type.caption}>{step.copy}</Text>
                        <LinkButton title={step.linkLabel} icon={step.icon} url={step.url} />
                    </View>
                ))}
            </Card>
            <Card title="Instructions">
                <LinkButton
                    title="LNbits setup tutorial"
                    icon="flash-outline"
                    url="https://lasereyes.cards/how-to-use/lnbits-bolt-card-setup-instructions/"
                />
                <LinkButton
                    title="Bolt Card service setup"
                    icon="logo-github"
                    url="https://github.com/boltcard/boltcard/blob/main/docs/INSTALL.md"
                />
                <LinkButton
                    title="Card programming errors"
                    icon="logo-github"
                    url="https://github.com/boltcard/bolt-nfc-android-app/blob/master/card-programming-errors.md"
                />
            </Card>
            <Card title="Links">
                <LinkButton title="Bolt Card Telegram help" icon="paper-plane-outline" url="https://t.me/bolt_card" />
                <LinkButton title="Bolt Card GitHub" icon="logo-github" url="https://github.com/boltcard" />
                <LinkButton title="LNbits.com" icon="flash-outline" url="https://lnbits.com" />
                <LinkButton title="LNbits Telegram help" icon="paper-plane-outline" url="https://t.me/lnbits" />
                <LinkButton title="BoltCardWallet.com" icon="link-outline" url="https://boltcardwallet.com" />
            </Card>
            <Card title="Built By">
                <View style={styles.logoRow}>
                    <TouchableOpacity style={styles.logoChip} onPress={() => Linking.openURL("https://onesandzeros.nz")}>
                        <Image style={{ width: 120, height: 50 }} source={require("../../image/OAZ-Logo.png")} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.logoChip}
                        onPress={() => Linking.openURL("https://www.whitewolftech.com")}
                    >
                        <Image style={{ width: 170, height: 50 }} source={require("../../image/wwt-on-white-sample.png")} />
                    </TouchableOpacity>
                </View>
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    linkButton: {
        alignSelf: "stretch",
        justifyContent: "flex-start",
    },
    step: {
        gap: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    stepHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    badge: {
        borderWidth: 1,
        borderColor: colors.accent,
        borderRadius: 999,
        paddingHorizontal: spacing.sm,
        paddingVertical: 1,
    },
    badgeText: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: "600",
    },
    logoRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.md,
    },
    logoChip: {
        backgroundColor: "#FFFFFF",
        borderRadius: radius.input,
        padding: spacing.sm,
    },
});
