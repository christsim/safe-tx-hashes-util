// ============================================================================
// Safe Multisig Transaction Hashes - Data Parsing
// ============================================================================
//
// Types and parsing functions for Safe Transaction Service API responses.
// Also handles user-pasted JSON for offline verification.
// ============================================================================

import { ZERO_ADDRESS } from "./constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SafeInfo {
  address: string;
  version: string;
  nonce: number;
  threshold: number;
  owners: string[];
}

export interface Confirmation {
  owner: string;
  signature: string;
  signatureType: string;
  submissionDate: string;
}

export interface DecodedParameter {
  name: string;
  type: string;
  value: string;
  valueDecoded?: ValueDecoded[] | null;
}

export interface DecodedData {
  method: string;
  parameters: DecodedParameter[];
}

export interface ValueDecoded {
  operation: number;
  to: string;
  value: string;
  data: string;
  dataDecoded: DecodedData | null;
}

export interface SafeTransaction {
  // Core fields for hash computation
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

  // Decoded data (from API)
  dataDecoded: DecodedData | null;

  // Confirmation/signature info
  confirmationsRequired: number;
  confirmations: Confirmation[];
  signatures: string;

  // Metadata
  safeTxHash: string;
  isExecuted: boolean;
  executionDate: string | null;
}

export interface TransactionResponse {
  count: number;
  transactions: SafeTransaction[];
}

// ---------------------------------------------------------------------------
// Parsing Functions
// ---------------------------------------------------------------------------

/**
 * Parse a single transaction result object from the API response.
 * Applies null-safe defaults matching the bash script's jq defaults.
 */
function parseTransactionResult(result: any): SafeTransaction {
  return {
    to: result.to ?? ZERO_ADDRESS,
    value: String(result.value ?? "0"),
    data: result.data ?? "0x",
    operation: Number(result.operation ?? 0),
    safeTxGas: String(result.safeTxGas ?? "0"),
    baseGas: String(result.baseGas ?? "0"),
    gasPrice: String(result.gasPrice ?? "0"),
    gasToken: result.gasToken ?? ZERO_ADDRESS,
    refundReceiver: result.refundReceiver ?? ZERO_ADDRESS,
    nonce: Number(result.nonce ?? 0),
    dataDecoded: parseDecodedData(result.dataDecoded),
    confirmationsRequired: Number(result.confirmationsRequired ?? 0),
    confirmations: parseConfirmations(result.confirmations),
    signatures: result.signatures ?? extractSignatures(parseConfirmations(result.confirmations)),
    safeTxHash: result.safeTxHash ?? "",
    isExecuted: Boolean(result.isExecuted),
    executionDate: result.executionDate ?? null,
  };
}

/**
 * Parse the dataDecoded field from the API response.
 */
function parseDecodedData(decoded: any): DecodedData | null {
  if (!decoded || typeof decoded !== "object") {
    return null;
  }

  return {
    method: decoded.method ?? "",
    parameters: Array.isArray(decoded.parameters)
      ? decoded.parameters.map((p: any) => ({
          name: p.name ?? "",
          type: p.type ?? "",
          value: String(p.value ?? ""),
          valueDecoded: parseValueDecoded(p.valueDecoded),
        }))
      : [],
  };
}

/**
 * Parse the valueDecoded array from a parameter (used in multiSend).
 */
function parseValueDecoded(valueDecoded: any): ValueDecoded[] | null {
  if (!Array.isArray(valueDecoded)) {
    return null;
  }

  return valueDecoded.map((v: any) => ({
    operation: Number(v.operation ?? 0),
    to: v.to ?? ZERO_ADDRESS,
    value: String(v.value ?? "0"),
    data: v.data ?? "0x",
    dataDecoded: parseDecodedData(v.dataDecoded),
  }));
}

/**
 * Parse the confirmations array from the API response.
 */
function parseConfirmations(confirmations: any): Confirmation[] {
  if (!Array.isArray(confirmations)) {
    return [];
  }

  return confirmations.map((c: any) => ({
    owner: c.owner ?? "",
    signature: c.signature ?? "",
    signatureType: c.signatureType ?? "",
    submissionDate: c.submissionDate ?? "",
  }));
}

/**
 * Extract concatenated signatures from confirmations array.
 * Matches the bash script's behavior:
 *   - Reverse the confirmations order
 *   - Take each signature, strip 0x prefix on all but the first
 *   - Concatenate into a single hex string
 */
export function extractSignatures(confirmations: Confirmation[]): string {
  if (confirmations.length === 0) {
    return "0x";
  }

  const reversed = [...confirmations].reverse();
  let result = "";

  for (let i = 0; i < reversed.length; i++) {
    const sig = reversed[i].signature;
    if (!sig) continue;

    if (i === 0) {
      // Keep the first signature's 0x prefix
      result += sig.startsWith("0x") ? sig : `0x${sig}`;
    } else {
      // Strip 0x prefix on subsequent signatures
      result += sig.startsWith("0x") ? sig.slice(2) : sig;
    }
  }

  return result || "0x";
}

/**
 * Parse a full API response (from the multisig-transactions endpoint)
 * into a typed TransactionResponse.
 */
export function parseTransactionResponse(json: any): TransactionResponse {
  if (!json || typeof json !== "object") {
    throw new Error("Invalid API response: expected a JSON object");
  }

  const count = Number(json.count ?? 0);
  const results = Array.isArray(json.results) ? json.results : [];

  return {
    count,
    transactions: results.map(parseTransactionResult),
  };
}

/**
 * Parse user-pasted JSON text into a TransactionResponse.
 * Accepts either:
 *   - The full API response format: { count, results: [...] }
 *   - A single transaction object: { to, value, data, ... }
 *   - An array of transaction objects: [{ to, value, data, ... }, ...]
 */
export function parsePastedJson(text: string): TransactionResponse {
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON: could not parse the pasted text");
  }

  // Full API response format
  if (json.results !== undefined) {
    return parseTransactionResponse(json);
  }

  // Array of transaction objects
  if (Array.isArray(json)) {
    return {
      count: json.length,
      transactions: json.map(parseTransactionResult),
    };
  }

  // Single transaction object
  if (typeof json === "object" && json !== null) {
    return {
      count: 1,
      transactions: [parseTransactionResult(json)],
    };
  }

  throw new Error("Invalid JSON format: expected an API response, transaction object, or array of transactions");
}

/**
 * Parse the Safe info API response.
 */
export function parseSafeInfo(json: any): SafeInfo {
  if (!json || typeof json !== "object") {
    throw new Error("Invalid Safe info response: expected a JSON object");
  }

  return {
    address: json.address ?? "",
    version: json.version ?? "",
    nonce: Number(json.nonce ?? 0),
    threshold: Number(json.threshold ?? 0),
    owners: Array.isArray(json.owners) ? json.owners : [],
  };
}
