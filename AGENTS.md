# Bolt Card Programmer — Agent Notes

## Architecture Overview

React Native / Expo app for programming NTAG424 DNA NFC cards as Bolt Cards.
Tab-based navigation using expo-router (`app/(tabs)/`).

### Key files

| Path | Purpose |
|------|---------|
| `app/(tabs)/create.tsx` | Create new bolt card — fetch keys from auth URL, write to card |
| `app/(tabs)/reset.tsx` | Wipe card — reset keys to factory zeros, clear NDEF |
| `app/(tabs)/read.tsx` | Read card info — UID, key versions, NDEF, card type |
| `app/(tabs)/test.tsx` | Dev test buttons — raw NFC operations |
| `app/components/SetupBoltcard.tsx` | URL-driven create flow (server fetches keys) |
| `app/components/ResetBoltcard.tsx` | URL-driven wipe flow (server fetches keys) |
| `app/class/NTag424.tsx` | NTAG424 DNA command layer — auth, changeKey, file settings, NDEF |
| `app/utils/Cmac.tsx` | Vendored AES-CMAC (MIT, crypto-es based) — do not modify lightly |
| `app/constants/ErrorCodes.tsx` | APDU error code maps |
| `app/scan/index.tsx` | QR code scanner screen |

## NTAG424 Key Model

5 key slots (0-4). Each is 16 bytes (32 hex chars).

- **Key 0**: Application master key. Used for AuthEV2First. Controls access to change other keys.
- **Keys 1-4**: Application keys. Used for file access (read/write NDEF, SDM config).
- **Key version**: 1-byte counter per slot. `0x00` = factory default (all-zeros key). Non-zero = key has been changed.

### Key version probing

`Ntag424.getKeyVersion(keyNo)` sends a plain APDU (no auth required). Returns `"00"` for factory keys.
This is the critical diagnostic for detecting partial-wipe state.

### changeKey protocol (keys 1-4)

```
changeKey(keyNo, oldKey, newKey, keyVersion)
  → Enc(oldKey XOR newKey || keyVersion || CRC32(newKey))
```

The card XORs its stored key with the received XOR value, checks CRC of the result.
If the old key you send doesn't match what's on the card → **911e INTEGRITY_ERROR**.

For key 0: `Enc(newKey || keyVersion)` — no XOR, just new key + version.

## Critical Lessons Learned

### 1. Never assume card state matches config

The wipe logic used to blindly send configured keys as "old keys" to changeKey.
If a previous wipe attempt partially completed (some keys zeroed, some not), the next attempt
would fail with 911e on the already-zeroed keys because the old key didn't match.

**Fix**: Always probe key versions before wiping. If version is `0x00`, that key is already
at factory defaults — use zeros as old key, or skip entirely.

### 2. Partial reset: some keys may already be 0000...0000

A card that has been through a failed or interrupted wipe can have **any combination** of
keys still set to their original values or already reset to all-zeros. For example:

- Keys 1 and 2 zeroed (they were changed first), keys 3, 4, and 0 still have original values
- Only key 3 failed (wrong old key), everything else was wiped
- Key 0 was changed but the card was removed before NDEF clearing

**Detection**: `getKeyVersion(keyNo)` returns `"00"` when the key value is `00000000000000000000000000000000`.
This is a plain APDU — no authentication required, no side effects, does NOT count as a
destructive operation, does NOT trigger authentication delays.

**Important**: Failed *authentication* attempts DO trigger 91ad AUTHENTICATION_DELAY on the card.
getKeyVersion is safe because it skips auth entirely. The wipe flow probes all versions first,
then authenticates once with the correct key 0 (zeros or config depending on version).

**Recovery**: The reset flow handles this automatically:
1. Probe all 5 key versions
2. For version `"00"`: old key is zeros, skip changeKey (already at target state)
3. For non-zero version: use the provided/configured key as old key
4. Authenticate with key 0's actual value (zeros if already factory)
5. Only attempt changeKey for keys that still need changing

### 3. LNbits k3/k4 often equals k1

LNbits boltcard extension commonly sets keys 3 and 4 to the same value as key 1.
But some setups don't, and the wipe JSON may omit k3/k4 entirely.
The k1 fallback is a heuristic, not a guarantee.

### 4. Operator precedence: `!"p" in params`

```javascript
if (!"p" in params)  // BUG: evaluates as if ("false" in params)
if (!("p" in params)) // CORRECT
```

This was in create.tsx and caused the p/c validation after card write to be silently skipped.

### 5. expo-router vs react-navigation

This app uses expo-router (file-based routing). `useNavigation()` from `@react-navigation/native`
is NOT available by default. Use `router.push()` / `router.replace()` from `expo-router` instead.

The reset tab crash was caused by calling undefined `navigation.navigate()`. The create tab
had the correct `router.replace()` pattern.

### 6. Per-key error handling for destructive operations

Key changes are destructive and non-atomic. If key 3 fails, keys 1 and 2 are already changed.
The wipe MUST continue attempting remaining keys rather than stopping at first failure.
Each key change gets its own try/catch.

### 7. wipe JSON format

```json
{
  "version": 1,
  "action": "wipe",
  "k0": "...", "k1": "...", "k2": "...", "k3": "...", "k4": "..."
}
```

Keys are lowercase `k0`-`k4`. The code also accepts uppercase (`K0`-`K4`).
Only k0/k1/k2 are strictly required. k3/k4 fall back to k1.

## Bolty comparison

Bolty (https://github.com/Amperstrand/bolty) is an ESP32-based card provisioner.
Key differences:
- Has `getKeyVersion` guard checks but **aborts** on already-factory cards instead of adapting
- Stops on first changeKey failure (no per-key error handling)
- Has `recoverkey` command for manual single-key recovery
- Has authentication retry logic (re-activate card on auth failure)

Bolty does NOT solve the partial-wipe recovery problem better than this app.

## NFC operation ordering

Standard NTAG424 wipe sequence:
1. `requestTechnology(IsoDep)` — connect to card
2. `isoSelectFileApplication()` — select NDEF application
3. `getKeyVersion("00"-"04")` — probe actual card state (plain, no auth)
4. `AuthEv2First("00", authKey)` — authenticate with key 0 (adapt based on version)
5. `resetFileSettings()` — disable SDM mirroring
6. `changeKey(01-04, oldKey, zeros, "00")` — wipe keys 1-4 (use probed old keys)
7. `changeKey(00, oldKey, zeros, "00")` — wipe key 0 last
8. `AuthEv2First("00", zeros)` — re-auth with zeros for NDEF write
9. `setNdefMessage(empty)` — clear NDEF record

Key 0 is changed last because it's the authentication key. Once changed, you must
re-authenticate with the new key (zeros) before doing anything else.
