/**
 * SDM mirror-offset arithmetic for bolt card personalization.
 *
 * The card file layout is [NLEN:2][NDEF message], and the NDEF URI record
 * payload is [URI-identifier byte][URL bytes] — Ndef.uriRecord compresses
 * well-known URI prefixes (https:// → 0x04, urn:nfc: → 0x23, …) into that
 * single identifier byte, so byte positions in the encoded message differ
 * from positions in the plain URL string by the prefix length. Offsets must
 * therefore be located in the ENCODED bytes, never computed from the plain
 * string. The appended p/c placeholder suffix is the search anchor: it is
 * built here, it is long and mostly zero bytes, and the LAST occurrence is
 * always the one this code appended.
 */

const PICC_PLACEHOLDER_HEX = "0".repeat(32); // 16 mirrored bytes, ASCII-hex on card (SDMOptions ASCII mode)
const MAC_PLACEHOLDER_HEX = "0".repeat(16); // 8 mirrored CMAC bytes, ASCII-hex on card

export function buildSdmUrl(base: string): { ndefMessage: string; suffix: string } {
    const separator = base.includes("?") ? "&" : "?";
    const suffix = `${separator}p=${PICC_PLACEHOLDER_HEX}&c=${MAC_PLACEHOLDER_HEX}`;
    return { ndefMessage: base + suffix, suffix };
}

export function sdmMirrorOffsets(encodedMessage: number[], suffix: string): {
    piccOffset: number;
    macOffset: number;
} {
    const needle = Array.from(suffix, (ch) => ch.charCodeAt(0));
    let start = -1;
    for (let i = encodedMessage.length - needle.length; i >= 0; i--) {
        let match = true;
        for (let j = 0; j < needle.length; j++) {
            if (encodedMessage[i + j] !== needle[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            start = i;
            break;
        }
    }
    if (start < 0) {
        throw new Error("SDM placeholder suffix not found in encoded NDEF message");
    }
    const fileStart = start + 2; // 2-byte NLEN precedes the message in the file
    return {
        piccOffset: fileStart + 3, // skip separator + "p="
        macOffset: fileStart + 3 + PICC_PLACEHOLDER_HEX.length + 3, // skip p-value + "&c="
    };
}
