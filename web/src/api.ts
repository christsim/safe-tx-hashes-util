// ============================================================================
// Safe Multisig Transaction Hashes - API Client
// ============================================================================
//
// Fetches data from the Safe Transaction Service API.
// CORS is supported (Access-Control-Allow-Origin: *).
// ============================================================================

import { type Network } from "./constants";
import {
  type SafeInfo,
  type TransactionResponse,
  parseSafeInfo,
  parseTransactionResponse,
} from "./parser";

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Perform a fetch request and handle common error cases.
 */
async function apiFetch(url: string): Promise<any> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch (err) {
    throw new ApiError(
      `Network error: could not reach the Safe Transaction Service. ` +
        `Are you online? (${err instanceof Error ? err.message : String(err)})`
    );
  }

  if (response.status === 404) {
    throw new ApiError(
      "Not found (404). Please verify the network and Safe address are correct.",
      404
    );
  }

  if (!response.ok) {
    throw new ApiError(
      `API returned HTTP ${response.status}: ${response.statusText}`,
      response.status
    );
  }

  let json: any;
  try {
    json = await response.json();
  } catch {
    throw new ApiError("Invalid API response: could not parse JSON");
  }

  if (json === null || json === undefined) {
    throw new ApiError("Empty API response");
  }

  return json;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch Safe info (version, threshold, owners, nonce) from the
 * Safe Transaction Service API.
 *
 * Endpoint: GET {apiUrl}/api/v1/safes/{address}/
 */
export async function fetchSafeInfo(
  network: Network,
  address: string
): Promise<SafeInfo> {
  const url = `${network.apiUrl}/api/v1/safes/${address}/`;
  const json = await apiFetch(url);
  return parseSafeInfo(json);
}

/**
 * Fetch multisig transactions for a given Safe address and nonce.
 *
 * Endpoint: GET {apiUrl}/api/v1/safes/{address}/multisig-transactions/?nonce={nonce}
 *
 * If `untrusted` is true, appends `&trusted=false` to include transactions
 * that haven't been confirmed by a delegate or executed yet.
 */
export async function fetchTransactions(
  network: Network,
  address: string,
  nonce: number,
  untrusted: boolean = false
): Promise<TransactionResponse> {
  let url = `${network.apiUrl}/api/v1/safes/${address}/multisig-transactions/?nonce=${nonce}`;

  if (untrusted) {
    url += "&trusted=false";
  }

  const json = await apiFetch(url);
  return parseTransactionResponse(json);
}

/**
 * Fetch pending (non-executed) multisig transactions for a Safe.
 *
 * Endpoint: GET {apiUrl}/api/v1/safes/{address}/multisig-transactions/?executed=false&ordering=nonce
 */
export async function fetchPendingTransactions(
  network: Network,
  address: string,
  untrusted: boolean = false
): Promise<TransactionResponse> {
  let url = `${network.apiUrl}/api/v1/safes/${address}/multisig-transactions/?executed=false&ordering=nonce&limit=100`;

  if (untrusted) {
    url += "&trusted=false";
  }

  const json = await apiFetch(url);
  return parseTransactionResponse(json);
}

/**
 * Fetch the most recently executed multisig transactions for a Safe.
 *
 * Endpoint: GET {apiUrl}/api/v1/safes/{address}/multisig-transactions/?ordering=-nonce&limit={limit}
 */
export async function fetchRecentTransactions(
  network: Network,
  address: string,
  limit: number = 5
): Promise<TransactionResponse> {
  const url = `${network.apiUrl}/api/v1/safes/${address}/multisig-transactions/?executed=true&ordering=-nonce&limit=${limit}`;
  const json = await apiFetch(url);
  return parseTransactionResponse(json);
}
