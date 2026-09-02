/**
 * Byte-parity test for sdm.ts. Run: node --experimental-strip-types app/class/sdm.test.ts
 *
 * Encoded-message fixtures below are REAL react-native-nfc-manager ndef-lib
 * (Ndef.uriRecord + Ndef.encodeMessage) outputs, recorded verbatim — they pin
 * the prefix-compression behavior (https:// → URI identifier 0x04, urn:nfc: →
 * 0x23) that plain-string offset arithmetic cannot survive.
 *
 * Expected offsets for cases 1-4 are cross-stack ground truth (independently
 * computed by the bolty-rs NTAG424 personalization stack and datasheet
 * worked examples): picc/mac offsets for the identical URL and byte layout.
 */
import assert from "node:assert/strict";
import { buildSdmUrl, sdmMirrorOffsets } from "./sdm.ts";

const FIXTURES: Array<{
    name: string;
    base: string;
    encodedHex: string;
    expect?: { piccOffset: number; macOffset: number };
}> = [
    {
        name: "lnurlw canonical (spec base)",
        base: "lnurlw://card.yourdomain.com",
        encodedHex:
            "d1015355006c6e75726c773a2f2f636172642e796f7572646f6d61696e2e636f6d3f703d303030303030303030303030303030303030303030303030303030303030303026633d30303030303030303030303030303030",
        expect: { piccOffset: 38, macOffset: 73 },
    },
    {
        name: "https base (URI prefix compressed to 0x04 — the bug-1 case)",
        base: "https://boltcardpoc.psbt.me/",
        encodedHex:
            "d1014b5504626f6c7463617264706f632e707362742e6d652f3f703d303030303030303030303030303030303030303030303030303030303030303026633d30303030303030303030303030303030",
        expect: { piccOffset: 30, macOffset: 65 },
    },
    {
        name: "base with existing query",
        base: "lnurlw://card.yourdomain.com/ln?x=9",
        encodedHex:
            "d1015a55006c6e75726c773a2f2f636172642e796f7572646f6d61696e2e636f6d2f6c6e3f783d3926703d303030303030303030303030303030303030303030303030303030303030303026633d30303030303030303030303030303030",
        expect: { piccOffset: 45, macOffset: 80 },
    },
    {
        name: "query containing p= substring (the bug-2 case: ?exp=3600)",
        base: "lnurlw://card.yourdomain.com/ln?exp=3600",
        encodedHex:
            "d1015f55006c6e75726c773a2f2f636172642e796f7572646f6d61696e2e636f6d2f6c6e3f6578703d3336303026703d303030303030303030303030303030303030303030303030303030303030303026633d30303030303030303030303030303030",
        expect: { piccOffset: 50, macOffset: 85 },
    },
    {
        name: "urn:nfc base (ndef-lib picks 0x23; offsets follow the bytes written)",
        base: "urn:nfc:card.yourdomain.com",
        encodedHex:
            "d1014a5523636172642e796f7572646f6d61696e2e636f6d3f703d303030303030303030303030303030303030303030303030303030303030303026633d30303030303030303030303030303030",
    },
];

function hexToBytes(hex: string): number[] {
    const out: number[] = [];
    for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16));
    return out;
}

for (const f of FIXTURES) {
    const { ndefMessage, suffix } = buildSdmUrl(f.base);
    const encoded = hexToBytes(f.encodedHex);
    const offsets = sdmMirrorOffsets(encoded, suffix);

    if (f.expect) {
        assert.deepEqual(
            offsets,
            f.expect,
            `${f.name}: expected cross-stack ground truth ${JSON.stringify(f.expect)}, got ${JSON.stringify(offsets)}`,
        );
    }

    // Self-consistency for every case: in the file ([NLEN:2][message]) the
    // placeholder values must sit exactly at the computed offsets.
    const file = [0x00, 0x00, ...encoded];
    const piccSlice = file.slice(offsets.piccOffset, offsets.piccOffset + 32).map((b) => String.fromCharCode(b)).join("");
    const macSlice = file.slice(offsets.macOffset, offsets.macOffset + 16).map((b) => String.fromCharCode(b)).join("");
    assert.equal(piccSlice, "0".repeat(32), `${f.name}: picc placeholder not at piccOffset`);
    assert.equal(macSlice, "0".repeat(16), `${f.name}: mac placeholder not at macOffset`);
    assert.ok(ndefMessage.endsWith(suffix));
    console.log(`ok  ${f.name}  picc=${offsets.piccOffset} mac=${offsets.macOffset}`);
}

console.log("all sdm offset tests passed");
