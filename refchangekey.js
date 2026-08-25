// Reference-vector generator: byte-exact port of the bolt-card-programmer
// NTag424.tsx changeKey/changeFileSettings/calcMac/encData with FIXED SYNTHETIC
// session inputs and SYNTHETIC card keys. Used to pin cross-implementation
// ports (e.g. ccid-firmware-rs/host-tools/boltwipe.py selftest) — lesson B8:
// port wire-format crypto byte-for-byte, then pin with vectors from the
// original implementation.
//
// Regenerate: node refchangekey.js   (needs ./Cmacref.js + crypto-es + crc
// from the app's node_modules; see README note in Cmacref.js header)
var CryptoJS = require("./Cmacref");
var crc = require("crc");
const { AES } = require("crypto-es");

const sesAuthEncKey = "1234567890abcdef1234567890abcdef";
const sesAuthMacKey = "fedcba0987654321fedcba0987654321";
const ti = "AABBCCDD";
let cmdCtrDec = 3;

function hexToBytes(hex) { let b = []; for (let c = 0; c < hex.length; c += 2) b.push(parseInt(hex.substr(c, 2), 16)); return b; }
function bytesToHex(bytes) { let h = []; for (let i = 0; i < bytes.length; i++) { let c = bytes[i] < 0 ? bytes[i] + 256 : bytes[i]; h.push((c >>> 4).toString(16)); h.push((c & 0xf).toString(16)); } return h.join(""); }
function decToHexLsbFirst(dec, bytes) { return dec.toString(16).padStart(2, "0").padEnd(bytes * 2, "0"); }
function padForEnc(data, byteLen) { let p = data; if (p.length < byteLen * 2) { p += "80"; p = p.padEnd(byteLen * 2, "0"); } return p; }
function ivEncryption(t, cmdCtr, key) { const d = AES.encrypt(CryptoJS.enc.Hex.parse("A55A" + t + cmdCtr + "0000000000000000"), CryptoJS.enc.Hex.parse(key), { mode: CryptoJS.mode.ECB, keySize: 128 / 8, padding: CryptoJS.pad.NoPadding }); return d.ciphertext.toString(CryptoJS.enc.Hex); }
function encData(padded, cmdCtr) { const iv = CryptoJS.enc.Hex.parse(ivEncryption(ti, cmdCtr, sesAuthEncKey)); return AES.encrypt(CryptoJS.enc.Hex.parse(padded), CryptoJS.enc.Hex.parse(sesAuthEncKey), { mode: CryptoJS.mode.CBC, iv, keySize: 128 / 8, padding: CryptoJS.pad.NoPadding }).ciphertext.toString(CryptoJS.enc.Hex); }
function calcMac(cmdData) { const m = CryptoJS.CMAC(CryptoJS.enc.Hex.parse(sesAuthMacKey), CryptoJS.enc.Hex.parse(cmdData)).toString(); const t = hexToBytes(m).filter(function (e, i) { return (i + 1) % 2 === 0; }); return bytesToHex(t); }

function changeKeyAPDU(keyNo, key, newKey, keyVersion) {
  const cmdCtr = decToHexLsbFirst(cmdCtrDec++, 2);
  let keyData = "";
  if (keyNo == "00") { keyData = padForEnc(newKey + keyVersion, 32); }
  else {
    const WA = CryptoJS.lib.WordArray;
    const x = CryptoJS.ext.xor(new WA.init(hexToBytes(key)), new WA.init(hexToBytes(newKey))).words;
    const oldNewXor = bytesToHex(x);
    const crc32Reversed = crc.crcjam(hexToBytes(newKey)).toString(16).padStart(8, "0");
    const crc32 = bytesToHex(hexToBytes(crc32Reversed).reverse());
    keyData = padForEnc(oldNewXor + keyVersion + crc32, 32);
  }
  const encKeyData = encData(keyData, cmdCtr);
  const truncatedMac = calcMac("C4" + cmdCtr + ti + keyNo + encKeyData);
  const lc = ((encKeyData.length + truncatedMac.length) / 2 + 1).toString(16);
  return "90C40000" + lc + keyNo + encKeyData + truncatedMac + "00";
}
function changeFileSettingsAPDU() {
  const cmdCtr = decToHexLsbFirst(cmdCtrDec++, 2);
  const cmdData = "40E0EE01FFFF";
  const padded = padForEnc(cmdData, 16);
  const encKeyData = encData(padded, cmdCtr);
  const truncatedMac = calcMac("5F" + cmdCtr + ti + "02" + encKeyData);
  const lc = ((encKeyData.length + truncatedMac.length) / 2 + 1).toString(16);
  return "905F0000" + lc + "02" + encKeyData + truncatedMac + "00";
}

const Z = "00000000000000000000000000000000";
const K0 = "55555555555555555555555555555555";
const K1 = "11111111111111111111111111111111";
const K2 = "22222222222222222222222222222222";
const K3 = "33333333333333333333333333333333";
const K4 = "44444444444444444444444444444444";
console.log("FS_RESET:", changeFileSettingsAPDU());
console.log("K1:", changeKeyAPDU("01", K1, Z, "00"));
console.log("K2:", changeKeyAPDU("02", K2, Z, "00"));
console.log("K3:", changeKeyAPDU("03", K3, Z, "00"));
console.log("K4:", changeKeyAPDU("04", K4, Z, "00"));
console.log("K0:", changeKeyAPDU("00", K0, Z, "00"));
