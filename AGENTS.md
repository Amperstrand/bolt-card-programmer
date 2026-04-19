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

## Card State Detection Model

Before any destructive operation, the app probes the card's actual state. This is the
central safety mechanism. There are three screens/flows that interact with cards:

### Read tab (`read.tsx`)
Diagnostic only. Reads key versions, NDEF, UID, card type. No writes.
Key versions are displayed as human-readable: `"00 — key is all-zeros (factory default)"`
vs `"01 — key has been changed"`. Use this to inspect card state before wiping.

### Reset tab (`reset.tsx`) — handles ANY card state
The manual wipe flow. User provides keys via QR scan, JSON paste, or manual entry.
Then:
1. Connect to card, select NDEF application
2. Probe all 5 key versions via `getKeyVersion` (plain APDU, no auth, no side effects)
3. Build actual old-keys array: version `"00"` → use zeros, otherwise → use provided key
4. Authenticate with key 0's probed value (zeros if factory, config if changed)
5. For non-zero keys: `changeKey` each one to zeros (1→2→3→4→0), per-key try/catch
6. For zero keys: skip (already at target state)
7. Re-auth with zeros, clear NDEF
8. If ALL keys are factory: still auth with zeros and clear NDEF for a clean state

This flow recovers cards from ANY partial-wipe state because it probes before acting.

### URL-driven reset (`ResetBoltcard.tsx`) — server-driven wipe
The URL flow fetches keys from a server endpoint. It now also probes key versions
and adapts old keys, same as the manual tab. Previously had a guard that aborted if
key 1 was factory — this was removed because the probing loop handles it better.

### Create tab / SetupBoltcard — expects FACTORY-FRESH card only
The create flow checks that key 1 version is `"00"` and refuses to proceed otherwise.
This is correct: you can only CREATE on a factory card. If key 1 has been changed,
the card must be wiped first (using the Reset tab).

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

## Future Improvements (from cross-implementation comparison)

These improvements were identified from a three-way comparison against BTCPayServer.BoltCardTools
(C#) and Bolty (ESP32/Arduino). They are NOT yet implemented. Priority ordering:

### High-value robustness (safety-critical)

1. **Post-wipe verification** — After wiping all keys and clearing NDEF, re-authenticate with
   all-zeros and probe all 5 key versions again. Confirm every version is `"00"`. Right now the
   wipe flow assumes success if no changeKey call threw an exception. A verification step would
   catch silent failures or partial wipes that the per-key try/catch didn't detect.
   Source: Bolty's post-burn verification pattern.

2. **Auth retry with card re-activation** — If `AuthEv2First` fails (especially `91ad`
   AUTHENTICATION_DELAY from a previous failed attempt), deactivate the NFC tag and re-activate
   it before retrying. Real-world NFC connections are unreliable; cards drop off the reader
   mid-operation. This is especially important during multi-key wipe sequences.
   Source: Bolty's auth retry logic in burn/wipe paths.

3. **Card type validation** — Before attempting any NTAG424-specific commands, verify the card
   is actually an NTAG424 DNA. Check the card type/UID response. This prevents confusing
   6a82 errors when a user taps the wrong card type (MIFARE Classic, NTAG213, etc.).
   Source: Bolty's `ntag424_isNTAG424()` guard.

### Architectural improvements (nice-to-have)

4. **Structured key model** — Replace the 5 loose string variables (`k0`–`k4`) with a named
   `BoltcardKeys` object containing `masterKey`, `authKey`, `encryptionKey`, `macReadKey`,
   `macWriteKey` (or similar semantic names). Add a `createFromJson()` factory with the k3/k4
   fallback logic built in. Source: BTCPayServer's `BoltcardKeys` class.

5. **Transport abstraction** — Extract an `IAPDUTransport` interface from NTag424.tsx so the
   command layer is decoupled from NFC hardware. This enables unit testing the protocol logic
   without a physical card. Source: BTCPayServer's `IAPDUTransport` + `PCSCAPDUTransport`.

6. **Deterministic key derivation** — Support deriving all 5 card keys from a single issuer
   master key + card UID, using the NXP key derivation protocol. This is how BTCPayServer
   provisions cards — one secret per issuer, not per card. Source: BTCPayServer's
   `IssuerKey → CardKey → DeriveBoltcardKeys()` chain.

7. **PICC data module** — Implement proper decryption and parsing of the `p=` URL parameter
   (PICC data: UID, card counter, SDM read counter) and `c=` parameter (CMAC verification).
   This enables the app to verify a card's authentic response without needing a server round-trip.
   Source: BTCPayServer's `PICCData` class and CMAC validation.

### Reference implementations for comparison

- **BTCPayServer.BoltCardTools**: `/tmp/btcpay-boltcard-tools/` on this machine
  - `src/BTCPayServer.NTag424/Ntag424.cs` — Core NTAG424 protocol (C#)
  - `src/BTCPayServer.NTag424/BoltcardKeys.cs` — Structured key model
  - `src/BTCPayServer.NTag424/IssuerKey.cs` + `CardKey.cs` — Deterministic key derivation
  - `src/BTCPayServer.NTag424/PICCData.cs` — PICC data parsing
  - `src/BTCPayServer.NTag424/FileSettings.cs` — File settings model
  - `src/BTCPayServer.NTag424/IAPDUTransport.cs` — Transport abstraction

- **Bolty**: `/tmp/bolty/` on this machine
  - `src/bolt.h` — All NFC/card logic in a single header (721 lines)
  - `src/bolty.ino` — Main Arduino sketch
  - `src/gui.h` — Display/UI layer
  - `src/hardware_config.h` — Pin definitions and board selection
