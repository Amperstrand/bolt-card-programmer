import { AES } from "crypto-es";
import CmacModule from "./Cmac";

// crypto-js (via the vendored CMAC extension) — WordArray kept structurally
// loose, matching the app's existing NTag424.tsx usage.
const CryptoJS: any = CmacModule as any;

const hexToBytes = (hex: string): number[] => {
    let bytes: number[] = [];
    for (let c = 0; c < hex.length; c += 2) bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
};

const bytesToHex = (bytes: number[]): string => {
    let hex: string[] = [];
    for (let i = 0; i < bytes.length; i++) {
        let current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
        hex.push((current >>> 4).toString(16));
        hex.push((current & 0xf).toString(16));
    }
    return hex.join("");
};

export interface SunVerifyResult {
    pTest: boolean;
    cTest: boolean;
    decryptedPiccData: string;
    sv2: string;
    derivedMacKey: string;
    fullCmac: string;
    truncatedMac: string;
}

export function decryptPicc(pVal: string, piccKey: string): string {
    const decPiccData = AES.decrypt({ ciphertext: CryptoJS.enc.Hex.parse(pVal) }, CryptoJS.enc.Hex.parse(piccKey), {
        padding: CryptoJS.pad.NoPadding,
        mode: CryptoJS.mode.CBC,
        iv: CryptoJS.enc.Hex.parse("00000000000000000000000000000000"),
        keySize: 128 / 8,
    });
    return CryptoJS.enc.Hex.stringify(decPiccData);
}

export function buildSv2(uid: string, sdmReadCtr: string): string {
    return "3cc300010080" + uid + sdmReadCtr;
}

export function sunMacChain(macKey: string, sv2: string): { derivedMacKey: string; fullCmac: string; truncatedMac: string } {
    const sesSdmFileReadMAC = CryptoJS.CMAC(CryptoJS.enc.Hex.parse(macKey), CryptoJS.enc.Hex.parse(sv2));
    const sesSdmFileReadMACHex = sesSdmFileReadMAC.toString();
    const sdmMac = CryptoJS.CMAC(CryptoJS.enc.Hex.parse(sesSdmFileReadMACHex));
    const sdmMacHex = sdmMac.toString();

    const truncatedMacBytes = hexToBytes(sdmMacHex).filter(function (element, index) {
        return (index + 1) % 2 === 0;
    });
    return {
        derivedMacKey: sesSdmFileReadMACHex,
        fullCmac: sdmMacHex,
        truncatedMac: bytesToHex(truncatedMacBytes),
    };
}

export function verifySun(pVal: string, cVal: string, uid: string, piccKey: string, macKey: string): SunVerifyResult {
    const decryptedPiccData = decryptPicc(pVal, piccKey);
    const pTest = decryptedPiccData.startsWith("c7" + uid);

    const sdmReadCtr = decryptedPiccData.slice(16, 22);
    const sv2 = buildSv2(uid, sdmReadCtr);
    const chain = sunMacChain(macKey, sv2);
    const cTest = chain.truncatedMac === cVal.toLowerCase();

    return { pTest, cTest, decryptedPiccData, sv2, ...chain };
}

export default { decryptPicc, buildSv2, sunMacChain, verifySun };
