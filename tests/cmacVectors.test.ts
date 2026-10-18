import vectorsDoc from "./conformance/ntag424-vectors/vectors.json";
import CmacModule from "../app/utils/Cmac";

interface WordArray {
  toString(encoder: { stringify(wa: WordArray): string }): string;
}

interface CryptoJsExt {
  CMAC: (key: WordArray, message: WordArray | string) => WordArray;
  enc: {
    Hex: {
      parse(hex: string): WordArray;
      stringify(wa: WordArray): string;
    };
  };
}

const C = CmacModule as unknown as CryptoJsExt;

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

const vectors = (vectorsDoc as { vectors: Vector[] }).vectors;

// The programmer's vendored AES-CMAC (app/utils/Cmac.tsx, MIT artjomb) is the
// one SUN-read-path primitive this app computes host-side (key handling +
// changeKey encoding depend on it). The suite's other ops (sdm/derivation)
// live server-side and are consumed by the boltty-rs / worker harnesses.
const cmacVectors = vectors.filter((v) => v.input.op === "aes_cmac");

describe("ntag424-vectors: vendored AES-CMAC vs canonical oracles", () => {
  it("suite parsed with the vendored generation size", () => {
    expect(vectors.length).toBe(46);
  });

  it("5 aes_cmac vectors apply to this app's public crypto surface (46 - 41 skipped)", () => {
    expect(cmacVectors.length).toBe(5);
  });

  for (const v of cmacVectors) {
    it(`${v.id} (aes_cmac)`, () => {
      const { input, expected } = v;
      const key = C.enc.Hex.parse(input.key as string);
      const message = C.enc.Hex.parse(input.message as string);
      const mac = C.CMAC(key, message);
      expect(mac.toString(C.enc.Hex)).toBe(expected.cmac);
    });
  }
});
