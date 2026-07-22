import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Text } from "react-native";

import { Screen } from "@/components/ui";
import { type } from "@/constants/theme";
import ResetBoltcard from "./components/ResetBoltcard";

export default function Reset() {
    const params = useLocalSearchParams();
    const url = params.url ? params.url.toString() : null;

    return (
        <Screen>
            <Text style={type.title}>Reset Bolt Card</Text>
            <ResetBoltcard url={url} />
        </Screen>
    );
}
