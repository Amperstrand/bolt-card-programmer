import React, { type ReactNode } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

import { type } from "@/constants/theme";

type SectionTitleProps = {
    children: ReactNode;
    style?: StyleProp<TextStyle>;
};

export function SectionTitle({ children, style }: SectionTitleProps) {
    return (
        <Text selectable style={[type.heading, style]}>
            {children}
        </Text>
    );
}
