import { createHash } from "node:crypto";
import vectorsRaw from "./conformance/ntag424-vectors/vectors.json?raw";
import vectorsDoc from "./conformance/ntag424-vectors/vectors.json";
import CmacModule from "../app/utils/Cmac";
import { buildSv2, decryptPicc, sunMacChain, verifySun } from "../app/utils/sunVerify";

// Reference-lock (line canon, ntag424-vectors rule 4): the vendored file must
// be byte-identical to the canonical Amperstrand/ntag424-vectors copy recorded
// in the LOCK file. `npm run vectors:check` enforces the same off-test.
const VECTORS_SHA256 = "522cab963c3f7db1ab9249c0d4e207b43abc0b4061323fd5c55755959a4ff65f";

interface VectorInput {
    op: string;
    [field: string]: unknown;
}

interface Vector {
    id: string;
    category: string;
    negative?: boolean;
    input: VectorInput;
    expected: { [field: string]: unknown };
}

const CryptoJS: any = CmacModule as any;
const vectors = (vectorsDoc as { vectors: Vector[] }).vectors;
const str = (src: { [k: string]: unknown }, key: string): string => src[key] as string;
const byOp = (op: string): Vector[] => vectors.filter((v) => v.input.op === op);

// derive_keys is the one inexpressible category: K0–K4 arrive from the auth
// server (SetupBoltcard.tsx reads json.K0..K4), the app never derives keys.
// Skipped aloud per the line canon — a silent partial pass is a failure.
const SKIP_OPS = new Set(["derive_keys"]);
const consumed = vectors.filter((v) => !SKIP_OPS.has(v.input.op));

describe("ntag424-vectors cross-language conformance suite", () => {
    it("vendored vectors.json is reference-locked (sha256)", () => {
        const digest = createHash("sha256").update(vectorsRaw as string).digest("hex");
        expect(digest).toBe(VECTORS_SHA256);
    });

    it("suite size matches the vendored generation", () => {
        expect(vectors.length).toBe(46);
    });

    it("coverage accounting: 20 expressible vectors consumed, 26 derive_keys skipped aloud", () => {
        expect(consumed.length).toBe(20);
        expect(byOp("aes_cmac").length).toBe(5);
        expect(byOp("sv2_build").length).toBe(2);
        expect(byOp("picc_decrypt").length).toBe(1);
        expect(byOp("sun_mac").length).toBe(1);
        expect(byOp("sdm_full").length).toBe(11);
        expect(byOp("derive_keys").length).toBe(26);
    });

    for (const v of byOp("aes_cmac")) {
        it(`${v.id} (aes_cmac)`, () => {
            const mac = CryptoJS.CMAC(
                CryptoJS.enc.Hex.parse(str(v.input, "key")),
                CryptoJS.enc.Hex.parse(str(v.input, "message")),
            );
            expect(mac.toString()).toBe(str(v.expected, "cmac"));
        });
    }

    for (const v of byOp("sv2_build")) {
        it(`${v.id} (sv2_build)`, () => {
            expect(buildSv2(str(v.input, "uid"), str(v.input, "counter_bytes"))).toBe(str(v.expected, "sv2"));
        });
    }

    for (const v of byOp("picc_decrypt")) {
        it(`${v.id} (picc_decrypt)`, () => {
            const decrypted = decryptPicc(str(v.input, "picc_enc_data"), str(v.input, "key"));
            expect(decrypted).toBe(str(v.expected, "decrypted"));
            expect(decrypted.slice(2, 16)).toBe(str(v.expected, "uid"));
            expect(decrypted.slice(16, 22)).toBe(str(v.expected, "counter_bytes"));
        });
    }

    for (const v of byOp("sun_mac")) {
        it(`${v.id} (sun_mac)`, () => {
            const sv2 = buildSv2(str(v.input, "uid"), str(v.input, "counter_bytes"));
            const { derivedMacKey, truncatedMac } = sunMacChain(str(v.input, "key"), sv2);
            expect(truncatedMac).toBe(str(v.expected, "cmac_truncated"));
            expect(derivedMacKey.length).toBe(32);
        });
    }

    for (const v of byOp("sdm_full")) {
        const uid = v.expected.uid ? str(v.expected, "uid") : str(v.expected, "decrypted_p").slice(2, 16);
        it(`${v.id} (sdm_full${v.negative ? ", negative" : ""})`, () => {
            const res = verifySun(str(v.input, "p"), str(v.input, "c"), uid, str(v.input, "k1"), str(v.input, "k2"));
            if (v.negative) {
                expect(res.pTest && res.cTest).toBe(false);
                return;
            }
            expect(res.pTest).toBe(true);
            expect(res.cTest).toBe(true);
            expect(res.decryptedPiccData).toBe(str(v.expected, "decrypted_p"));
            expect(res.sv2).toBe(str(v.expected, "sv2"));
            expect(res.derivedMacKey).toBe(str(v.expected, "derived_mac_key"));
            expect(res.fullCmac).toBe(str(v.expected, "full_cmac"));
        });
    }
});
