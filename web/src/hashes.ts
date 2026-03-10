// ============================================================================
// Safe Multisig Transaction Hashes - Core Hash Computation
// ============================================================================
//
// Pure functions that replicate the hash calculations from safe_hashes.sh
// using ethers.js v6 instead of Foundry's cast/chisel.
//
// Key version-dependent logic:
//   - Domain hash: versions <= 1.2.0 use old typehash (no chainId)
//   - SafeTx typehash: versions < 1.0.0 use old typehash (dataGas vs baseGas)
// ============================================================================

import { AbiCoder, keccak256, solidityPacked, hashMessage, Interface, parseUnits } from "ethers";

import {
  DOMAIN_SEPARATOR_TYPEHASH,
  DOMAIN_SEPARATOR_TYPEHASH_OLD,
  SAFE_TX_TYPEHASH,
  SAFE_TX_TYPEHASH_OLD,
  SAFE_MSG_TYPEHASH,
  ZERO_ADDRESS,
} from "./constants";

// ---------------------------------------------------------------------------
// Version Utilities
// ---------------------------------------------------------------------------

/**
 * Strip any suffix after '+' from the Safe version string.
 * e.g. "1.3.0+L2" -> "1.3.0"
 */
export function getCleanVersion(version: string): string {
  return version.split("+")[0];
}

/**
 * Parse a semver string into numeric parts.
 */
function parseSemver(version: string): [number, number, number] {
  const parts = getCleanVersion(version).split(".").map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/**
 * Compare two semver version strings.
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const [aMajor, aMinor, aPatch] = parseSemver(a);
  const [bMajor, bMinor, bPatch] = parseSemver(b);

  if (aMajor !== bMajor) return aMajor < bMajor ? -1 : 1;
  if (aMinor !== bMinor) return aMinor < bMinor ? -1 : 1;
  if (aPatch !== bPatch) return aPatch < bPatch ? -1 : 1;
  return 0;
}

/**
 * Check if version a is less than or equal to version b.
 */
export function isVersionLte(a: string, b: string): boolean {
  return compareVersions(a, b) <= 0;
}

/**
 * Check if version a is strictly less than version b.
 */
export function isVersionLt(a: string, b: string): boolean {
  return compareVersions(a, b) < 0;
}

// ---------------------------------------------------------------------------
// Domain Hash
// ---------------------------------------------------------------------------

const coder = AbiCoder.defaultAbiCoder();

/**
 * Calculate the EIP-712 domain separator hash for a Safe multisig.
 *
 * - Versions <= 1.2.0: keccak256(abi.encode(DOMAIN_SEPARATOR_TYPEHASH_OLD, address))
 * - Versions >= 1.3.0: keccak256(abi.encode(DOMAIN_SEPARATOR_TYPEHASH, chainId, address))
 */
export function calculateDomainHash(
  chainId: number,
  address: string,
  version: string
): string {
  const cleanVersion = getCleanVersion(version);

  if (isVersionLte(cleanVersion, "1.2.0")) {
    // Legacy domain separator: no chainId
    const encoded = coder.encode(
      ["bytes32", "address"],
      [DOMAIN_SEPARATOR_TYPEHASH_OLD, address]
    );
    return keccak256(encoded);
  }

  // Modern domain separator: with chainId
  const encoded = coder.encode(
    ["bytes32", "uint256", "address"],
    [DOMAIN_SEPARATOR_TYPEHASH, chainId, address]
  );
  return keccak256(encoded);
}

// ---------------------------------------------------------------------------
// Transaction Hash
// ---------------------------------------------------------------------------

export interface SafeTransactionParams {
  chainId: number;
  address: string;
  to: string;
  value: string;
  data: string;
  operation: number;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: number;
  version: string;
}

export interface SafeTransactionHashes {
  domainHash: string;
  messageHash: string;
  safeTxHash: string;
  /** The ABI-encoded message (before hashing) */
  encodedMessage: string;
}

/**
 * Calculate all Safe transaction hashes.
 *
 * Replicates the calculate_hashes() function from safe_hashes.sh:
 * 1. Calculate domain hash (version-dependent)
 * 2. keccak256 the transaction data field
 * 3. ABI-encode the SafeTx struct with the appropriate typehash
 * 4. keccak256 the encoded struct -> message hash
 * 5. EIP-712 final hash: keccak256(0x19 || 0x01 || domainHash || messageHash)
 */
export function calculateTransactionHashes(
  params: SafeTransactionParams
): SafeTransactionHashes {
  const {
    chainId,
    address,
    to,
    value,
    data,
    operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    nonce,
    version,
  } = params;

  const cleanVersion = getCleanVersion(version);

  // 1. Domain hash
  const domainHash = calculateDomainHash(chainId, address, version);

  // 2. Hash the data field (dynamic bytes -> keccak256 per EIP-712)
  const dataHashed = keccak256(data);

  // 3. Select the correct SafeTx typehash
  // Versions < 1.0.0 used "dataGas" instead of "baseGas"
  const safeTxTypehash = isVersionLt(cleanVersion, "1.0.0")
    ? SAFE_TX_TYPEHASH_OLD
    : SAFE_TX_TYPEHASH;

  // 4. ABI-encode the SafeTx struct
  const encodedMessage = coder.encode(
    [
      "bytes32",  // typehash
      "address",  // to
      "uint256",  // value
      "bytes32",  // data (hashed)
      "uint8",    // operation
      "uint256",  // safeTxGas
      "uint256",  // baseGas
      "uint256",  // gasPrice
      "address",  // gasToken
      "address",  // refundReceiver
      "uint256",  // nonce
    ],
    [
      safeTxTypehash,
      to,
      value,
      dataHashed,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      nonce,
    ]
  );

  // 5. Message hash
  const messageHash = keccak256(encodedMessage);

  // 6. Final EIP-712 hash
  const safeTxHash = keccak256(
    solidityPacked(
      ["bytes1", "bytes1", "bytes32", "bytes32"],
      ["0x19", "0x01", domainHash, messageHash]
    )
  );

  return {
    domainHash,
    messageHash,
    safeTxHash,
    encodedMessage,
  };
}

// ---------------------------------------------------------------------------
// Off-chain Message Hash
// ---------------------------------------------------------------------------

export interface SafeMessageHashes {
  rawMessageHash: string;
  domainHash: string;
  messageHash: string;
  safeMessageHash: string;
}

/**
 * Calculate Safe message hashes for off-chain message signing.
 *
 * Replicates calculate_offchain_message_hashes() from safe_hashes.sh:
 * 1. Hash the raw message with EIP-191 (hashMessage)
 * 2. Calculate domain hash
 * 3. Message hash: keccak256(abi.encode(SAFE_MSG_TYPEHASH, keccak256(abi.encode(hashedMessage))))
 * 4. Safe message hash: keccak256(0x19 || 0x01 || domainHash || messageHash)
 */
export function calculateOffchainMessageHashes(
  chainId: number,
  address: string,
  version: string,
  rawMessage: string
): SafeMessageHashes {
  // 1. EIP-191 hash the raw message
  // Normalise line endings to LF (matching bash script behaviour)
  const normalisedMessage = rawMessage.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawMessageHash = hashMessage(normalisedMessage);

  // 2. Domain hash
  const domainHash = calculateDomainHash(chainId, address, version);

  // 3. Inner hash: keccak256(abi.encode(bytes32(hashedMessage)))
  const innerHash = keccak256(
    coder.encode(["bytes32"], [rawMessageHash])
  );

  // 4. Message hash: keccak256(abi.encode(SAFE_MSG_TYPEHASH, innerHash))
  const messageHash = keccak256(
    coder.encode(["bytes32", "bytes32"], [SAFE_MSG_TYPEHASH, innerHash])
  );

  // 5. Safe message hash (EIP-712)
  const safeMessageHash = keccak256(
    solidityPacked(
      ["bytes1", "bytes1", "bytes32", "bytes32"],
      ["0x19", "0x01", domainHash, messageHash]
    )
  );

  return {
    rawMessageHash,
    domainHash,
    messageHash,
    safeMessageHash,
  };
}

// ---------------------------------------------------------------------------
// Calldata Encoding Helpers
// ---------------------------------------------------------------------------

const erc20Interface = new Interface(["function transfer(address to, uint256 amount)"]);

const safeInterface = new Interface([
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures)",
]);

/**
 * Encode an ERC-20 transfer(address, uint256) call.
 */
export function encodeTransferCalldata(to: string, amount: bigint): string {
  return erc20Interface.encodeFunctionData("transfer", [to, amount]);
}

/**
 * Encode the full execTransaction calldata for a Safe multisig.
 */
export function encodeExecTransactionCalldata(
  to: string,
  value: string,
  data: string,
  operation: number,
  safeTxGas: string,
  baseGas: string,
  gasPrice: string,
  gasToken: string,
  refundReceiver: string,
  signatures: string
): string {
  return safeInterface.encodeFunctionData("execTransaction", [
    to,
    value,
    data,
    operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    signatures,
  ]);
}

/**
 * Convert a human-readable token amount to its smallest unit.
 * e.g. convertToSmallestUnit("1.5", 6) => 1500000n
 */
export function convertToSmallestUnit(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

// ---------------------------------------------------------------------------
// Hash Formatting
// ---------------------------------------------------------------------------

/**
 * Format a hash for display: keep "0x" prefix lowercase, rest uppercase.
 * Matches the bash script's format_hash() function.
 */
export function formatHash(hash: string): string {
  const prefix = hash.slice(0, 2).toLowerCase();
  const rest = hash.slice(2).toUpperCase();
  return prefix + rest;
}
