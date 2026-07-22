import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Text } from "react-native";

import { Screen } from "@/components/ui";
import { type } from "@/constants/theme";
import SetupBoltcard from "./components/SetupBoltcard";

export default function ProgramBoltcardScreen() {
    const params = useLocalSearchParams();
    const url = params.url ? params.url.toString() : null;

    return (
        <Screen>
            <Text style={type.title}>Program Bolt Card</Text>
            <SetupBoltcard url={url} />
        </Screen>
    );
}
