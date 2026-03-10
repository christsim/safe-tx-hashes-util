// ============================================================================
// Safe TX Hashes - Application Entry Point
// ============================================================================
//
// Wires the UI to the API client, hash computation, and warning detection.
// Handles the online mode flow: form submission -> API fetch -> parse ->
// compute hashes -> render results.
// ============================================================================

import "./styles.css";

import { type Network, getNetwork, ZERO_ADDRESS } from "./constants";
import { fetchSafeInfo, fetchTransactions, fetchPendingTransactions, fetchRecentTransactions, ApiError } from "./api";
import { type SafeTransaction, parsePastedJson } from "./parser";
import {
  calculateTransactionHashes,
  calculateOffchainMessageHashes,
  encodeTransferCalldata,
  convertToSmallestUnit,
  type SafeTransactionHashes,
} from "./hashes";
import { analyzeTransaction } from "./warnings";
import {
  initTabs,
  populateNetworkDropdown,
  getSelectedNetwork,
  getSelectedNetworkById,
  getFormValues,
  getOfflineJsonFormValues,
  getOfflineManualFormValues,
  getMessageFormValues,
  getSendFormValues,
  showLoading,
  showLoadingButton,
  showError,
  hideError,
  clearResults,
  showResults,
  renderNetworkConfig,
  renderTransactionSelector,
  renderTransactionData,
  renderDecodedData,
  renderWarnings,
  renderHashes,
  renderMessageData,
  renderMessageHashes,
  renderOfflineTransactionData,
  renderSendTransactionData,
  populateTransactionPicker,
  getSelectedPickerTransaction,
  hideTransactionPicker,
  type SendSummary,
} from "./ui";

// ---------------------------------------------------------------------------
// Online Mode: State
// ---------------------------------------------------------------------------

/** Loaded state from "Load Transactions" — cached so Calculate Hashes can use it. */
let onlineState: {
  network: Network;
  address: string;
  version: string;
  untrusted: boolean;
  pending: SafeTransaction[];
  recent: SafeTransaction[];
} | null = null;

// ---------------------------------------------------------------------------
// Online Mode Handler
// ---------------------------------------------------------------------------

/**
 * Render the full result for a single selected transaction.
 */
function renderTransaction(
  address: string,
  chainId: number,
  version: string,
  tx: SafeTransaction
): void {
  // Compute hashes
  const hashes: SafeTransactionHashes = calculateTransactionHashes({
    chainId,
    address,
    to: tx.to,
    value: tx.value,
    data: tx.data,
    operation: tx.operation,
    safeTxGas: tx.safeTxGas,
    baseGas: tx.baseGas,
    gasPrice: tx.gasPrice,
    gasToken: tx.gasToken,
    refundReceiver: tx.refundReceiver,
    nonce: tx.nonce,
    version,
  });

  // Analyze for warnings
  const warnings = analyzeTransaction(tx);

  // Render everything
  renderWarnings(warnings);
  renderTransactionData(address, tx, hashes.encodedMessage);
  renderDecodedData(tx.dataDecoded, tx.data);
  renderHashes(hashes.domainHash, hashes.messageHash, hashes.safeTxHash);
}

/**
 * Render a set of transactions (with selector if multiple).
 */
function renderTransactions(
  address: string,
  chainId: number,
  version: string,
  transactions: SafeTransaction[]
): void {
  renderNetworkConfig(onlineState!.network);
  showResults();

  if (transactions.length > 1) {
    renderTransactionSelector(transactions, (index) => {
      document.getElementById("warnings")!.innerHTML = "";
      document.getElementById("tx-data")!.innerHTML = "";
      document.getElementById("decoded-data")!.innerHTML = "";
      document.getElementById("hashes")!.innerHTML = "";
      renderTransaction(address, chainId, version, transactions[index]);
    });
    renderTransaction(address, chainId, version, transactions[0]);
  } else if (transactions.length === 1) {
    renderTransaction(address, chainId, version, transactions[0]);
  }
}

/**
 * Handle "Load Transactions" button click.
 * Fetches Safe info, pending transactions, and recent transactions,
 * then populates the transaction picker dropdown.
 */
async function handleLoadTransactions(): Promise<void> {
  hideError();
  clearResults();
  hideTransactionPicker();
  onlineState = null;

  const address = (document.getElementById("address") as HTMLInputElement).value.trim();
  const untrusted = (document.getElementById("untrusted") as HTMLInputElement).checked;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    showError("Invalid Ethereum address format. Must be 0x followed by 40 hex characters.");
    return;
  }

  const network = getSelectedNetwork();
  if (!network) {
    showError("Please select a network.");
    return;
  }

  showLoadingButton(true);

  try {
    // 1. Fetch Safe info to get the version
    let version: string;
    try {
      const safeInfo = await fetchSafeInfo(network, address);
      version = safeInfo.version;

      if (!version) {
        showError(
          "No Safe multisig contract found for the specified network. " +
          "Please ensure that you have selected the correct network."
        );
        return;
      }
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        showError(
          "Safe not found on this network. Please verify the network and address are correct."
        );
        return;
      }
      throw err;
    }

    // 2. Fetch pending and recent transactions sequentially to avoid rate limiting
    const pendingResponse = await fetchPendingTransactions(network, address, untrusted);
    const recentResponse = await fetchRecentTransactions(network, address, 10);

    // 3. Cache the state
    onlineState = {
      network,
      address,
      version,
      untrusted,
      pending: pendingResponse.transactions,
      recent: recentResponse.transactions,
    };

    // 4. Populate the picker dropdown
    populateTransactionPicker(
      pendingResponse.transactions,
      recentResponse.transactions,
      network.id
    );
  } catch (err) {
    if (err instanceof ApiError) {
      showError(err.message);
    } else if (err instanceof Error) {
      showError(`Unexpected error: ${err.message}`);
    } else {
      showError("An unexpected error occurred.");
    }
    console.error(err);
  } finally {
    showLoadingButton(false);
  }
}

/**
 * Handle the online form submission (Calculate Hashes).
 *
 * Two paths:
 *   1. A transaction is selected from the picker dropdown -> use it directly
 *   2. A nonce is typed manually -> fetch by nonce from API
 */
async function handleOnlineSubmit(e: Event): Promise<void> {
  e.preventDefault();
  hideError();
  clearResults();

  const address = (document.getElementById("address") as HTMLInputElement).value.trim();
  const nonceStr = (document.getElementById("nonce") as HTMLInputElement).value.trim();
  const untrusted = (document.getElementById("untrusted") as HTMLInputElement).checked;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    showError("Invalid Ethereum address format. Must be 0x followed by 40 hex characters.");
    return;
  }

  const network = getSelectedNetwork();
  if (!network) {
    showError("Please select a network.");
    return;
  }

  // Path 1: Transaction selected from picker
  const pickerSelection = getSelectedPickerTransaction();
  if (pickerSelection && onlineState) {
    const { group, index } = pickerSelection;
    const txList = group === "pending" ? onlineState.pending : onlineState.recent;
    const tx = txList[index];

    if (tx) {
      renderTransactions(
        onlineState.address,
        onlineState.network.chainId,
        onlineState.version,
        [tx]
      );
      return;
    }
  }

  // Path 2: Manual nonce entry
  if (!nonceStr || !/^\d+$/.test(nonceStr)) {
    showError("Please select a transaction from the list, or enter a nonce manually.");
    return;
  }

  const nonce = Number(nonceStr);
  showLoading(true);

  try {
    // Fetch version — reuse from onlineState if same address, otherwise fetch fresh
    let version: string;
    if (onlineState && onlineState.address.toLowerCase() === address.toLowerCase() && onlineState.network.id === network.id) {
      version = onlineState.version;
    } else {
      try {
        const safeInfo = await fetchSafeInfo(network, address);
        version = safeInfo.version;

        if (!version) {
          showError(
            "No Safe multisig contract found for the specified network. " +
            "Please ensure that you have selected the correct network."
          );
          showLoading(false);
          return;
        }
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 404) {
          showError(
            "Safe not found on this network. Please verify the network and address are correct."
          );
          showLoading(false);
          return;
        }
        throw err;
      }
    }

    // Fetch transactions for the nonce
    const txResponse = await fetchTransactions(network, address, nonce, untrusted);

    if (txResponse.count === 0) {
      showError("No transaction is available for this nonce.");
      showLoading(false);
      return;
    }

    renderNetworkConfig(network);
    showResults();

    if (txResponse.count > 1) {
      renderTransactionSelector(txResponse.transactions, (index) => {
        document.getElementById("warnings")!.innerHTML = "";
        document.getElementById("tx-data")!.innerHTML = "";
        document.getElementById("decoded-data")!.innerHTML = "";
        document.getElementById("hashes")!.innerHTML = "";
        renderTransaction(address, network.chainId, version, txResponse.transactions[index]);
      });
      renderTransaction(address, network.chainId, version, txResponse.transactions[0]);
    } else {
      renderTransaction(address, network.chainId, version, txResponse.transactions[0]);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      showError(err.message);
    } else if (err instanceof Error) {
      showError(`Unexpected error: ${err.message}`);
    } else {
      showError("An unexpected error occurred.");
    }
    console.error(err);
  } finally {
    showLoading(false);
  }
}

// ---------------------------------------------------------------------------
// Offline Mode: JSON Paste Handler
// ---------------------------------------------------------------------------

function handleOfflineJsonSubmit(e: Event): void {
  e.preventDefault();
  hideError();
  clearResults();

  const formValues = getOfflineJsonFormValues();
  if (!formValues) return;

  const { address, version, jsonText } = formValues;

  const network = getSelectedNetworkById("offline-json-network");
  if (!network) {
    showError("Please select a network.");
    return;
  }

  try {
    const txResponse = parsePastedJson(jsonText);

    if (txResponse.count === 0) {
      showError("No transactions found in the pasted JSON.");
      return;
    }

    // Show network config
    renderNetworkConfig(network);
    showResults();

    // Render function for a single transaction from pasted JSON
    const renderParsedTransaction = (tx: SafeTransaction) => {
      const hashes: SafeTransactionHashes = calculateTransactionHashes({
        chainId: network.chainId,
        address,
        to: tx.to,
        value: tx.value,
        data: tx.data,
        operation: tx.operation,
        safeTxGas: tx.safeTxGas,
        baseGas: tx.baseGas,
        gasPrice: tx.gasPrice,
        gasToken: tx.gasToken,
        refundReceiver: tx.refundReceiver,
        nonce: tx.nonce,
        version,
      });

      const warnings = analyzeTransaction(tx);

      renderWarnings(warnings);
      renderTransactionData(address, tx, hashes.encodedMessage);
      renderDecodedData(tx.dataDecoded, tx.data);
      renderHashes(hashes.domainHash, hashes.messageHash, hashes.safeTxHash);
    };

    if (txResponse.count > 1) {
      renderTransactionSelector(txResponse.transactions, (index) => {
        document.getElementById("warnings")!.innerHTML = "";
        document.getElementById("tx-data")!.innerHTML = "";
        document.getElementById("decoded-data")!.innerHTML = "";
        document.getElementById("hashes")!.innerHTML = "";
        renderParsedTransaction(txResponse.transactions[index]);
      });
      renderParsedTransaction(txResponse.transactions[0]);
    } else {
      renderParsedTransaction(txResponse.transactions[0]);
    }
  } catch (err) {
    if (err instanceof Error) {
      showError(err.message);
    } else {
      showError("An unexpected error occurred while parsing the JSON.");
    }
    console.error(err);
  }
}

// ---------------------------------------------------------------------------
// Offline Mode: Manual Entry Handler
// ---------------------------------------------------------------------------

function handleOfflineManualSubmit(e: Event): void {
  e.preventDefault();
  hideError();
  clearResults();

  const formValues = getOfflineManualFormValues();
  if (!formValues) return;

  const network = getSelectedNetworkById("offline-network");
  if (!network) {
    showError("Please select a network.");
    return;
  }

  try {
    const hashes: SafeTransactionHashes = calculateTransactionHashes({
      chainId: network.chainId,
      address: formValues.address,
      to: formValues.to,
      value: formValues.value,
      data: formValues.data,
      operation: formValues.operation,
      safeTxGas: formValues.safeTxGas,
      baseGas: formValues.baseGas,
      gasPrice: formValues.gasPrice,
      gasToken: formValues.gasToken,
      refundReceiver: formValues.refundReceiver,
      nonce: formValues.nonce,
      version: formValues.version,
    });

    // Show network config
    renderNetworkConfig(network);
    showResults();

    // Render transaction data (no decoded data in manual mode)
    renderOfflineTransactionData(
      formValues.address,
      formValues.to,
      formValues.value,
      formValues.data,
      formValues.operation,
      formValues.safeTxGas,
      formValues.baseGas,
      formValues.gasPrice,
      formValues.gasToken,
      formValues.refundReceiver,
      formValues.nonce,
      hashes.encodedMessage
    );

    renderHashes(hashes.domainHash, hashes.messageHash, hashes.safeTxHash);
  } catch (err) {
    if (err instanceof Error) {
      showError(`Error computing hashes: ${err.message}`);
    } else {
      showError("An unexpected error occurred.");
    }
    console.error(err);
  }
}

// ---------------------------------------------------------------------------
// Message Mode Handler
// ---------------------------------------------------------------------------

function handleMessageSubmit(e: Event): void {
  e.preventDefault();
  hideError();
  clearResults();

  const formValues = getMessageFormValues();
  if (!formValues) return;

  const network = getSelectedNetworkById("message-network");
  if (!network) {
    showError("Please select a network.");
    return;
  }

  try {
    const hashes = calculateOffchainMessageHashes(
      network.chainId,
      formValues.address,
      formValues.version,
      formValues.message
    );

    // Show network config
    renderNetworkConfig(network);
    showResults();

    // Render message data
    renderMessageData(formValues.address, formValues.message);
    renderMessageHashes(
      hashes.rawMessageHash,
      hashes.domainHash,
      hashes.messageHash,
      hashes.safeMessageHash
    );
  } catch (err) {
    if (err instanceof Error) {
      showError(`Error computing message hashes: ${err.message}`);
    } else {
      showError("An unexpected error occurred.");
    }
    console.error(err);
  }
}

// ---------------------------------------------------------------------------
// Offline Mode: Send Handler
// ---------------------------------------------------------------------------

function handleSendSubmit(e: Event): void {
  e.preventDefault();
  hideError();
  clearResults();

  const formValues = getSendFormValues();
  if (!formValues) return;

  const network = getSelectedNetworkById("send-network");
  if (!network) {
    showError("Please select a network.");
    return;
  }

  try {
    let to: string;
    let value: string;
    let data: string;
    let summary: SendSummary;

    if (formValues.token === null) {
      // Native ETH transfer
      const amountWei = convertToSmallestUnit(formValues.amount, 18);

      to = formValues.recipient;
      value = amountWei.toString();
      data = "0x";

      summary = {
        tokenSymbol: "ETH",
        tokenName: "Ether",
        recipient: formValues.recipient,
        amountDisplay: formValues.amount,
        amountSmallest: amountWei.toString(),
        decimals: 18,
        contractAddress: null,
      };
    } else {
      // ERC-20 transfer
      const token = formValues.token;
      const contractAddress = token.addresses[network.id];

      if (!contractAddress) {
        showError(
          `${token.symbol} is not available on ${network.name}. ` +
          `Please select a different token or network.`
        );
        return;
      }

      const amountSmallest = convertToSmallestUnit(formValues.amount, token.decimals);

      to = contractAddress;
      value = "0";
      data = encodeTransferCalldata(formValues.recipient, amountSmallest);

      summary = {
        tokenSymbol: token.symbol,
        tokenName: token.name,
        recipient: formValues.recipient,
        amountDisplay: formValues.amount,
        amountSmallest: amountSmallest.toString(),
        decimals: token.decimals,
        contractAddress,
      };
    }

    const hashes: SafeTransactionHashes = calculateTransactionHashes({
      chainId: network.chainId,
      address: formValues.address,
      to,
      value,
      data,
      operation: 0,
      safeTxGas: "0",
      baseGas: "0",
      gasPrice: "0",
      gasToken: ZERO_ADDRESS,
      refundReceiver: ZERO_ADDRESS,
      nonce: formValues.nonce,
      version: formValues.version,
    });

    // Show network config
    renderNetworkConfig(network);
    showResults();

    // Render send transaction data with summary
    renderSendTransactionData(
      formValues.address,
      summary,
      to,
      value,
      data,
      formValues.nonce,
      hashes.encodedMessage
    );

    renderHashes(hashes.domainHash, hashes.messageHash, hashes.safeTxHash);
  } catch (err) {
    if (err instanceof Error) {
      showError(`Error computing hashes: ${err.message}`);
    } else {
      showError("An unexpected error occurred.");
    }
    console.error(err);
  }
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

function init(): void {
  // Display version
  const version = import.meta.env.VITE_APP_VERSION || "dev";
  document.getElementById("app-version")!.textContent = version;

  populateNetworkDropdown();
  initTabs();

  // Online form handlers
  document.getElementById("online-form")!.addEventListener("submit", handleOnlineSubmit);
  document.getElementById("load-tx-btn")!.addEventListener("click", handleLoadTransactions);

  // Offline form handlers
  document.getElementById("offline-json-form")!.addEventListener("submit", handleOfflineJsonSubmit);
  document.getElementById("offline-manual-form")!.addEventListener("submit", handleOfflineManualSubmit);
  document.getElementById("offline-send-form")!.addEventListener("submit", handleSendSubmit);

  // Message form handler
  document.getElementById("message-form")!.addEventListener("submit", handleMessageSubmit);
}

// Run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
