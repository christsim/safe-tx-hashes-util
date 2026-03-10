// ============================================================================
// Safe Multisig Transaction Hashes - Security Warning Detection
// ============================================================================
//
// Analyzes Safe transactions for potential security concerns.
// Replicates the warning checks from safe_hashes.sh:
//   - Delegate call detection (warn_if_delegate_call)
//   - Sensitive method detection (addOwnerWithThreshold, etc.)
//   - Nested sensitive methods in multiSend (valueDecoded scanning)
//   - Gas token attack patterns (check_gas_token_attack)
// ============================================================================

import { ZERO_ADDRESS } from "./constants";
import type { SafeTransaction } from "./parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WarningLevel = "critical" | "caution" | "info";

export interface Warning {
  level: WarningLevel;
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Methods that modify Safe ownership or threshold. */
const SENSITIVE_METHODS = new Set([
  "addOwnerWithThreshold",
  "removeOwner",
  "swapOwner",
  "changeThreshold",
]);

/**
 * Known trusted delegate call targets.
 * These are official Safe contracts that are expected to receive delegate calls.
 */
const TRUSTED_DELEGATE_CALL_TARGETS = new Set([
  // Safe MultiSendCallOnly (v1.3.0) - multiple deployments across chains
  "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D".toLowerCase(),
  "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B".toLowerCase(),
  // Safe MultiSend (v1.3.0)
  "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761".toLowerCase(),
  "0x998739BFdAAdde7C933B942a68053933098f9EDa".toLowerCase(),
  // Safe SignMessageLib
  "0xd53cd0aB83D845Ac265BE939c57F53AD838012c9".toLowerCase(),
  "0xA65387F16B013cf2Af4605Ad8aA5ec25a2cbA3a2".toLowerCase(),
]);

// ---------------------------------------------------------------------------
// Warning Checks
// ---------------------------------------------------------------------------

/**
 * Check if the transaction includes a delegate call.
 * operation === 1 means delegatecall.
 */
function checkDelegateCall(tx: SafeTransaction): Warning[] {
  if (tx.operation !== 1) return [];

  const isTrusted = TRUSTED_DELEGATE_CALL_TARGETS.has(tx.to.toLowerCase());

  if (isTrusted) {
    return [
      {
        level: "info",
        message: `Transaction uses a delegate call to a known trusted target (${tx.to}).`,
      },
    ];
  }

  return [
    {
      level: "critical",
      message:
        `WARNING: The transaction includes an untrusted delegate call to address ${tx.to}! ` +
        `This may lead to unexpected behaviour or vulnerabilities. Please review it carefully before you sign!`,
    },
  ];
}

/**
 * Check if the decoded method is a sensitive Safe management function.
 */
function checkSensitiveMethod(tx: SafeTransaction): Warning[] {
  const warnings: Warning[] = [];

  if (!tx.dataDecoded) return warnings;

  // Check the top-level method
  if (SENSITIVE_METHODS.has(tx.dataDecoded.method)) {
    warnings.push({
      level: "critical",
      message:
        `WARNING: The "${tx.dataDecoded.method}" function modifies the owners or threshold of the Safe. ` +
        `Proceed with caution!`,
    });
  }

  // Check nested transactions (e.g., inside multiSend)
  if (tx.dataDecoded.parameters) {
    for (const param of tx.dataDecoded.parameters) {
      if (!param.valueDecoded) continue;

      for (const nested of param.valueDecoded) {
        if (!nested.dataDecoded) continue;

        if (SENSITIVE_METHODS.has(nested.dataDecoded.method)) {
          warnings.push({
            level: "critical",
            message:
              `WARNING: A nested transaction calls "${nested.dataDecoded.method}" which modifies ` +
              `the owners or threshold of the Safe! Proceed with caution!`,
          });
        }
      }
    }
  }

  return warnings;
}

/**
 * Check for potential gas token attack patterns.
 * Matches the bash script's check_gas_token_attack() function.
 */
function checkGasTokenAttack(tx: SafeTransaction): Warning[] {
  const warnings: Warning[] = [];
  const hasCustomGasToken = tx.gasToken !== ZERO_ADDRESS;
  const hasCustomRefundReceiver = tx.refundReceiver !== ZERO_ADDRESS;

  if (hasCustomGasToken && hasCustomRefundReceiver) {
    warnings.push({
      level: "critical",
      message:
        `WARNING: This transaction uses a custom gas token and a custom refund receiver. ` +
        `This combination can be used to hide a rerouting of funds through gas refunds.`,
    });

    if (tx.gasPrice !== "0") {
      warnings.push({
        level: "critical",
        message:
          `Furthermore, the gas price is non-zero, which increases the potential for hidden value transfers.`,
      });
    }
  } else if (hasCustomGasToken) {
    warnings.push({
      level: "caution",
      message:
        `WARNING: This transaction uses a custom gas token (${tx.gasToken}). Please verify that this is intended.`,
    });
  } else if (hasCustomRefundReceiver) {
    warnings.push({
      level: "caution",
      message:
        `WARNING: This transaction uses a custom refund receiver (${tx.refundReceiver}). Please verify that this is intended.`,
    });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze a Safe transaction for all known security warnings.
 * Returns an array of warnings sorted by severity (critical first).
 */
export function analyzeTransaction(tx: SafeTransaction): Warning[] {
  const warnings: Warning[] = [
    ...checkDelegateCall(tx),
    ...checkSensitiveMethod(tx),
    ...checkGasTokenAttack(tx),
  ];

  // Sort: critical first, then caution, then info
  const order: Record<WarningLevel, number> = {
    critical: 0,
    caution: 1,
    info: 2,
  };

  warnings.sort((a, b) => order[a.level] - order[b.level]);

  return warnings;
}
