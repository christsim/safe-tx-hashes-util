// ============================================================================
// Safe TX Hashes - UI Rendering Helpers
// ============================================================================
//
// DOM manipulation functions for rendering transaction data, hashes,
// warnings, and form management. Matches the output format of safe_hashes.sh.
// ============================================================================

import { formatUnits, getAddress } from "ethers";
import { type Network, type Token, NETWORKS, TOKENS, DEFAULT_SAFE_VERSION, ZERO_ADDRESS, getTokensForNetwork, findTokenByAddress } from "./constants";
import { type SafeTransaction, type DecodedData } from "./parser";
import { type Warning } from "./warnings";
import { formatHash } from "./hashes";

// ---------------------------------------------------------------------------
// Element Helpers
// ---------------------------------------------------------------------------

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function el(tag: string, className?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function clear(element: HTMLElement): void {
  element.innerHTML = "";
}

// ---------------------------------------------------------------------------
// Tab Management
// ---------------------------------------------------------------------------

export function initTabs(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".tabs button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Deactivate all tabs
      buttons.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));

      // Activate selected
      btn.classList.add("active");
      const tabId = btn.getAttribute("data-tab");
      if (tabId) {
        $(`tab-${tabId}`).classList.add("active");
      }

      // Clear results when switching tabs
      clearResults();
    });
  });

  // Offline sub-tabs (JSON paste vs manual entry)
  initOfflineSubTabs();
}

function initOfflineSubTabs(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".sub-tabs button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Deactivate all sub-tabs
      buttons.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".offline-tab-content").forEach((t) => t.classList.remove("active"));

      // Activate selected
      btn.classList.add("active");
      const tabId = btn.getAttribute("data-offline-tab");
      if (tabId) {
        $(`offline-${tabId}`).classList.add("active");
      }

      // Clear results when switching sub-tabs
      clearResults();
    });
  });
}

// ---------------------------------------------------------------------------
// Network Dropdown
// ---------------------------------------------------------------------------

function populateSelect(selectId: string): void {
  const select = $(selectId) as HTMLSelectElement;
  NETWORKS.forEach((n) => {
    const option = document.createElement("option");
    option.value = n.id;
    option.textContent = `${n.name} (${n.chainId})`;
    select.appendChild(option);
  });
  select.value = "ethereum";
}

export function populateNetworkDropdown(): void {
  // Online mode
  populateSelect("network");
  // Offline mode (JSON paste)
  populateSelect("offline-json-network");
  // Offline mode (manual entry)
  populateSelect("offline-network");
  // Offline mode (send)
  populateSelect("send-network");
  // Message mode
  populateSelect("message-network");

  // Populate the token dropdown for the default network and wire up changes
  initSendTokenDropdown();
}

export function getSelectedNetwork(): Network | undefined {
  const select = $("network") as HTMLSelectElement;
  return NETWORKS.find((n) => n.id === select.value);
}

export function getSelectedNetworkById(selectId: string): Network | undefined {
  const select = $(selectId) as HTMLSelectElement;
  return NETWORKS.find((n) => n.id === select.value);
}

// ---------------------------------------------------------------------------
// Send Mode: Token Dropdown
// ---------------------------------------------------------------------------

/** Special sentinel value for native ETH in the token dropdown. */
const ETH_TOKEN_VALUE = "__ETH__";

/**
 * Populate the token dropdown filtered to the given network.
 * ETH is always the first option. Previously selected token is preserved
 * if still available on the new network; otherwise falls back to ETH.
 */
export function populateTokenDropdown(networkId: string): void {
  const select = $("send-token") as HTMLSelectElement;
  const previousValue = select.value;

  // Clear existing options
  select.innerHTML = "";

  // Always add ETH
  const ethOption = document.createElement("option");
  ethOption.value = ETH_TOKEN_VALUE;
  ethOption.textContent = "ETH (Native)";
  select.appendChild(ethOption);

  // Add ERC-20 tokens available on this network
  const tokens = getTokensForNetwork(networkId);
  tokens.forEach((token) => {
    const option = document.createElement("option");
    option.value = token.symbol;
    option.textContent = `${token.symbol} (${token.name})`;
    select.appendChild(option);
  });

  // Restore previous selection if still available, otherwise default to ETH
  const options = Array.from(select.options);
  const stillAvailable = options.some((o) => o.value === previousValue);
  select.value = stillAvailable ? previousValue : ETH_TOKEN_VALUE;

  // Update the amount label
  updateAmountLabel();
}

/**
 * Update the amount input label to reflect the selected token symbol.
 */
function updateAmountLabel(): void {
  const select = $("send-token") as HTMLSelectElement;
  const label = $("send-amount-label");
  const symbol = select.value === ETH_TOKEN_VALUE ? "ETH" : select.value;
  label.textContent = `Amount (${symbol})`;
}

/**
 * Initialise the send token dropdown and wire change events.
 */
function initSendTokenDropdown(): void {
  const networkSelect = $("send-network") as HTMLSelectElement;

  // Populate for the default network
  populateTokenDropdown(networkSelect.value);

  // Re-populate when network changes
  networkSelect.addEventListener("change", () => {
    populateTokenDropdown(networkSelect.value);
  });

  // Update amount label when token changes
  ($("send-token") as HTMLSelectElement).addEventListener("change", updateAmountLabel);
}

/**
 * Get the selected token. Returns null for ETH, or the Token object for ERC-20.
 */
export function getSelectedToken(): Token | null {
  const select = $("send-token") as HTMLSelectElement;
  if (select.value === ETH_TOKEN_VALUE) return null;
  return TOKENS.find((t) => t.symbol === select.value) ?? null;
}

// ---------------------------------------------------------------------------
// State Management
// ---------------------------------------------------------------------------

export function showLoading(show: boolean): void {
  const loading = $("loading");
  const btn = $("calculate-btn") as HTMLButtonElement;
  const loadBtn = $("load-tx-btn") as HTMLButtonElement;
  if (show) {
    loading.classList.remove("hidden");
    btn.disabled = true;
    btn.textContent = "Calculating...";
    loadBtn.disabled = true;
  } else {
    loading.classList.add("hidden");
    btn.disabled = false;
    btn.textContent = "Calculate Hashes";
    loadBtn.disabled = false;
    loadBtn.textContent = "Load Transactions";
  }
}

export function showLoadingButton(show: boolean): void {
  const btn = $("load-tx-btn") as HTMLButtonElement;
  if (show) {
    btn.disabled = true;
    btn.textContent = "Loading...";
  } else {
    btn.disabled = false;
    btn.textContent = "Load Transactions";
  }
}

export function showError(message: string): void {
  const errorEl = $("error");
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

export function hideError(): void {
  $("error").classList.add("hidden");
}

export function showAddressWarning(message: string): void {
  const el = $("address-warning");
  el.textContent = message;
  el.classList.remove("hidden");
}

export function hideAddressWarning(): void {
  $("address-warning").classList.add("hidden");
}

export function clearResults(): void {
  $("results").classList.add("hidden");
  clear($("network-config"));
  clear($("tx-selector"));
  clear($("warnings"));
  clear($("tx-data"));
  clear($("decoded-data"));
  clear($("hashes"));
  hideError();
}

export function showResults(): void {
  $("results").classList.remove("hidden");
}

// ---------------------------------------------------------------------------
// Online Mode: Transaction Picker
// ---------------------------------------------------------------------------

/**
 * Format a wei value to a human-readable string, trimming trailing zeros.
 * e.g. "10000000000000" -> "0.00001"
 */
function formatEthValue(weiStr: string): string {
  try {
    const formatted = formatUnits(weiStr, 18);
    // Trim trailing zeros after decimal, but keep at least one decimal
    return formatted.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  } catch {
    return weiStr;
  }
}

/**
 * Format a token amount from smallest unit to human-readable, trimming trailing zeros.
 */
function formatTokenValue(amountStr: string, decimals: number): string {
  try {
    const formatted = formatUnits(amountStr, decimals);
    return formatted.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  } catch {
    return amountStr;
  }
}

/**
 * Shorten an address for display: 0x1234...5678
 */
function shortAddr(addr: string): string {
  if (addr.length <= 14) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

/**
 * Generate a human-readable label for a transaction in the picker dropdown.
 *
 * - ETH transfer:   "Send 0.5 ETH to 0x1234...5678"
 * - ERC-20 transfer: "Send 100 USDT to 0x1234...5678"
 * - Other decoded:   "multiSend (to: 0x40A2...)"
 * - Raw/unknown:     "Raw TX (to: 0xabcd...)"
 */
function txLabel(tx: SafeTransaction, networkId: string): string {
  const isEthTransfer = tx.data === "0x" || tx.data === null || tx.data === "";

  // ETH transfer
  if (isEthTransfer) {
    const amount = formatEthValue(tx.value);
    return `Send ${amount} ETH to ${shortAddr(tx.to)}`;
  }

  // ERC-20 transfer (decoded by API)
  if (tx.dataDecoded?.method === "transfer" && tx.dataDecoded.parameters?.length >= 2) {
    const token = findTokenByAddress(networkId, tx.to);
    const recipientParam = tx.dataDecoded.parameters.find((p) => p.name === "to" || p.name === "_to");
    const amountParam = tx.dataDecoded.parameters.find((p) => p.name === "value" || p.name === "_value" || p.name === "amount");

    if (recipientParam && amountParam) {
      if (token) {
        const amount = formatTokenValue(amountParam.value, token.decimals);
        return `Send ${amount} ${token.symbol} to ${shortAddr(recipientParam.value)}`;
      }
      // Unknown token — show method + contract
      return `transfer on ${shortAddr(tx.to)} to ${shortAddr(recipientParam.value)}`;
    }
  }

  // Other decoded method
  if (tx.dataDecoded?.method) {
    return `${tx.dataDecoded.method} (to: ${shortAddr(tx.to)})`;
  }

  // Raw / undecodable
  return `Raw TX (to: ${shortAddr(tx.to)})`;
}

/**
 * Populate the online transaction picker with pending and recent transactions.
 * Groups them into optgroups for easy scanning.
 *
 * Also wires a change listener that fills in the nonce field when a
 * transaction is selected.
 */
export function populateTransactionPicker(
  pending: SafeTransaction[],
  recent: SafeTransaction[],
  networkId: string
): void {
  const container = $("online-tx-picker");
  const select = $("online-tx-select") as HTMLSelectElement;
  select.innerHTML = "";

  // Build a lookup so the change listener can find the transaction
  const allTxs: SafeTransaction[] = [];

  // Placeholder option
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- Select a transaction --";
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  // Pending transactions
  if (pending.length > 0) {
    const pendingGroup = document.createElement("optgroup");
    pendingGroup.label = `Pending (${pending.length})`;
    pending.forEach((tx, i) => {
      const option = document.createElement("option");
      option.value = `pending:${i}`;
      option.textContent = `Nonce ${tx.nonce}: ${txLabel(tx, networkId)}`;
      pendingGroup.appendChild(option);
      allTxs.push(tx);
    });
    select.appendChild(pendingGroup);
  }

  // Recent executed transactions
  if (recent.length > 0) {
    const recentGroup = document.createElement("optgroup");
    recentGroup.label = `Recent (${recent.length})`;
    recent.forEach((tx, i) => {
      const option = document.createElement("option");
      option.value = `recent:${i}`;
      option.textContent = `Nonce ${tx.nonce}: ${txLabel(tx, networkId)}`;
      recentGroup.appendChild(option);
    });
    select.appendChild(recentGroup);
  }

  if (pending.length === 0 && recent.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No transactions found";
    option.disabled = true;
    select.appendChild(option);
  }

  // Wire change listener: fill nonce field when a transaction is selected
  select.onchange = () => {
    const selection = getSelectedPickerTransaction();
    if (!selection) return;

    const { group, index } = selection;
    const txList = group === "pending" ? pending : recent;
    const tx = txList[index];
    if (tx) {
      ($("nonce") as HTMLInputElement).value = String(tx.nonce);
    }
  };

  container.classList.remove("hidden");
}

/**
 * Get the selected value from the transaction picker.
 * Returns { group: "pending" | "recent", index: number } or null if nothing selected.
 */
export function getSelectedPickerTransaction(): { group: string; index: number } | null {
  const select = $("online-tx-select") as HTMLSelectElement;
  const value = select.value;
  if (!value || value === "") return null;

  const [group, indexStr] = value.split(":");
  return { group, index: Number(indexStr) };
}

export function hideTransactionPicker(): void {
  $("online-tx-picker").classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Render: Network Configuration
// ---------------------------------------------------------------------------

export function renderNetworkConfig(network: Network): void {
  const container = $("network-config");
  clear(container);

  const section = el("div", "section");

  const header = el("div", "section-header", "Selected Network Configurations");
  section.appendChild(header);

  section.appendChild(makeField("Network", network.name));
  section.appendChild(makeField("Chain ID", String(network.chainId)));

  container.appendChild(section);
}

// ---------------------------------------------------------------------------
// Render: Transaction Selector (multiple txs with same nonce)
// ---------------------------------------------------------------------------

export function renderTransactionSelector(
  transactions: SafeTransaction[],
  onSelect: (index: number) => void
): void {
  const container = $("tx-selector");
  clear(container);

  if (transactions.length <= 1) return;

  const wrapper = el("div", "tx-selector");

  const msg = el("p");
  msg.textContent =
    `${transactions.length} transactions found with this nonce. ` +
    `This is normal if you are replacing a transaction, but could indicate ` +
    `irregular activity if unexpected. Select the transaction to verify:`;
  wrapper.appendChild(msg);

  const select = document.createElement("select");
  transactions.forEach((tx, i) => {
    const option = document.createElement("option");
    option.value = String(i);
    const method = tx.dataDecoded?.method ?? (tx.data === "0x" ? "ETH Transfer" : "Unknown");
    option.textContent = `Index ${i}: ${method} (to: ${tx.to.slice(0, 10)}...)`;
    select.appendChild(option);
  });
  wrapper.appendChild(select);

  const btn = document.createElement("button");
  btn.textContent = "Select";
  btn.addEventListener("click", () => {
    onSelect(Number(select.value));
  });
  wrapper.appendChild(btn);

  container.appendChild(wrapper);
}

// ---------------------------------------------------------------------------
// Render: Transaction Data
// ---------------------------------------------------------------------------

export function renderTransactionData(
  address: string,
  tx: SafeTransaction,
  encodedMessage: string
): void {
  const container = $("tx-data");
  clear(container);

  const section = el("div", "section");

  const header = el("div", "section-header", "Transaction Data and Computed Hashes");
  section.appendChild(header);

  const subHeader = el("div", "sub-header", "Transaction Data");
  section.appendChild(subHeader);

  section.appendChild(makeField("Multisig address", address));
  section.appendChild(makeField("To", tx.to));
  section.appendChild(makeField("Value", tx.value));
  section.appendChild(makeField("Data", tx.data));

  // Operation display
  const opField = el("div", "field");
  const opLabel = el("span", "field-label", "Operation");
  opField.appendChild(opLabel);

  const opValue = el("span", "field-value");
  if (tx.operation === 0) {
    opValue.textContent = "Call";
  } else if (tx.operation === 1) {
    opValue.textContent = "Delegatecall";
    opValue.classList.add("operation-delegatecall");
  } else {
    opValue.textContent = "Unknown";
  }
  opField.appendChild(opValue);
  section.appendChild(opField);

  section.appendChild(makeField("Safe Transaction Gas", tx.safeTxGas));
  section.appendChild(makeField("Base Gas", tx.baseGas));
  section.appendChild(makeField("Gas Price", tx.gasPrice));
  section.appendChild(makeField("Gas Token", tx.gasToken));
  section.appendChild(makeField("Refund Receiver", tx.refundReceiver));
  section.appendChild(makeField("Nonce", String(tx.nonce)));
  section.appendChild(makeField("Encoded message", encodedMessage));

  container.appendChild(section);
}

// ---------------------------------------------------------------------------
// Render: Decoded Data
// ---------------------------------------------------------------------------

export function renderDecodedData(dataDecoded: DecodedData | null, data: string): void {
  const container = $("decoded-data");
  clear(container);

  const section = el("div", "section");

  if (!dataDecoded || data === "0x") {
    section.appendChild(makeField("Method", "0x (ETH Transfer)"));
    section.appendChild(makeField("Parameters", "[]"));
  } else {
    section.appendChild(makeField("Method", dataDecoded.method));

    const paramLabel = el("div", "sub-header", "Parameters");
    section.appendChild(paramLabel);

    const paramBlock = el("pre", "decoded-params");
    // Format parameters as JSON matching the bash script output
    const paramsForDisplay = dataDecoded.parameters.map((p) => ({
      name: p.name,
      type: p.type,
      value: p.value,
      ...(p.valueDecoded ? { valueDecoded: p.valueDecoded } : {}),
    }));
    paramBlock.textContent = JSON.stringify(paramsForDisplay, null, 2);
    section.appendChild(paramBlock);
  }

  container.appendChild(section);
}

// ---------------------------------------------------------------------------
// Render: Warnings
// ---------------------------------------------------------------------------

export function renderWarnings(warnings: Warning[]): void {
  const container = $("warnings");
  clear(container);

  if (warnings.length === 0) return;

  warnings.forEach((w) => {
    const div = el("div", `warning warning-${w.level}`, w.message);
    container.appendChild(div);
  });
}

// ---------------------------------------------------------------------------
// Render: Hashes
// ---------------------------------------------------------------------------

/**
 * Convert a hex hash to a Ledger-style binary literal string.
 * e.g., "0x0cb7..." -> "\x0c\xb7..."
 */
function toBinaryLiteral(hash: string): string {
  const hex = hash.startsWith("0x") ? hash.slice(2) : hash;
  let result = "";
  for (let i = 0; i < hex.length; i += 2) {
    result += `\\x${hex.slice(i, i + 2)}`;
  }
  return result;
}

export function renderHashes(
  domainHash: string,
  messageHash: string,
  safeTxHash: string
): void {
  const container = $("hashes");
  clear(container);

  const section = el("div", "section");

  // Legacy Ledger format
  const ledgerHeader = el("div", "sub-header", "Legacy Ledger Format");
  section.appendChild(ledgerHeader);
  section.appendChild(makeHashRow("Binary string literal", toBinaryLiteral(safeTxHash), false));

  // Hashes
  const hashHeader = el("div", "sub-header", "Hashes");
  section.appendChild(hashHeader);
  section.appendChild(makeHashRow("Domain hash", formatHash(domainHash), true));
  section.appendChild(makeHashRow("Message hash", formatHash(messageHash), true));
  section.appendChild(makeHashRow("Safe transaction hash", safeTxHash, true));

  container.appendChild(section);
}

// ---------------------------------------------------------------------------
// Render Helpers
// ---------------------------------------------------------------------------

function makeField(label: string, value: string): HTMLElement {
  const field = el("div", "field");
  const labelEl = el("span", "field-label", label);
  const valueEl = el("span", "field-value", value);
  field.appendChild(labelEl);
  field.appendChild(valueEl);
  return field;
}

function makeHashRow(label: string, value: string, copyable: boolean): HTMLElement {
  const row = el("div", "hash-row");
  const labelEl = el("span", "hash-label", label);
  const valueEl = el("span", "hash-value", value);
  row.appendChild(labelEl);
  row.appendChild(valueEl);

  if (copyable) {
    const btn = el("button", "btn-copy", "copy") as HTMLButtonElement;
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(value).then(() => {
        btn.textContent = "copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = "copy";
          btn.classList.remove("copied");
        }, 1500);
      });
    });
    row.appendChild(btn);
  }

  return row;
}

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------

/**
 * @deprecated Use direct element access in handleOnlineSubmit instead.
 * Kept for backward compatibility but nonce is now optional.
 */
export function getFormValues(): { address: string; nonce: number; untrusted: boolean } | null {
  const address = ($("address") as HTMLInputElement).value.trim();
  const nonceStr = ($("nonce") as HTMLInputElement).value.trim();
  const untrusted = ($("untrusted") as HTMLInputElement).checked;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    showError("Invalid Ethereum address format. Must be 0x followed by 40 hex characters.");
    return null;
  }

  if (!nonceStr || !/^\d+$/.test(nonceStr)) {
    showError("Invalid nonce. Must be a non-negative integer.");
    return null;
  }

  return { address, nonce: Number(nonceStr), untrusted };
}

// ---------------------------------------------------------------------------
// Offline Mode: JSON Paste - Form Values
// ---------------------------------------------------------------------------

export interface OfflineJsonFormValues {
  address: string;
  version: string;
  jsonText: string;
}

export function getOfflineJsonFormValues(): OfflineJsonFormValues | null {
  const address = ($("offline-json-address") as HTMLInputElement).value.trim();
  const version = ($("offline-json-version") as HTMLInputElement).value.trim() || DEFAULT_SAFE_VERSION;
  const jsonText = ($("offline-json-data") as HTMLTextAreaElement).value.trim();

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    showError("Invalid Ethereum address format. Must be 0x followed by 40 hex characters.");
    return null;
  }

  if (!jsonText) {
    showError("Please paste transaction JSON data.");
    return null;
  }

  return { address, version, jsonText };
}

// ---------------------------------------------------------------------------
// Offline Mode: Manual Entry - Form Values
// ---------------------------------------------------------------------------

export interface OfflineManualFormValues {
  address: string;
  version: string;
  to: string;
  value: string;
  data: string;
  operation: number;
  nonce: number;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
}

export function getOfflineManualFormValues(): OfflineManualFormValues | null {
  const address = ($("offline-address") as HTMLInputElement).value.trim();
  const version = ($("offline-version") as HTMLInputElement).value.trim() || DEFAULT_SAFE_VERSION;
  const to = ($("offline-to") as HTMLInputElement).value.trim();
  const value = ($("offline-value") as HTMLInputElement).value.trim() || "0";
  const data = ($("offline-data") as HTMLInputElement).value.trim() || "0x";
  const operation = Number(($("offline-operation") as HTMLSelectElement).value);
  const nonceStr = ($("offline-nonce") as HTMLInputElement).value.trim();
  const safeTxGas = ($("offline-safe-tx-gas") as HTMLInputElement).value.trim() || "0";
  const baseGas = ($("offline-base-gas") as HTMLInputElement).value.trim() || "0";
  const gasPrice = ($("offline-gas-price") as HTMLInputElement).value.trim() || "0";
  const gasToken = ($("offline-gas-token") as HTMLInputElement).value.trim() || ZERO_ADDRESS;
  const refundReceiver = ($("offline-refund-receiver") as HTMLInputElement).value.trim() || ZERO_ADDRESS;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    showError("Invalid Safe address format. Must be 0x followed by 40 hex characters.");
    return null;
  }

  if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) {
    showError("Invalid To address format. Must be 0x followed by 40 hex characters.");
    return null;
  }

  if (!nonceStr || !/^\d+$/.test(nonceStr)) {
    showError("Invalid nonce. Must be a non-negative integer.");
    return null;
  }

  return {
    address,
    version,
    to,
    value,
    data,
    operation,
    nonce: Number(nonceStr),
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
  };
}

// ---------------------------------------------------------------------------
// Message Mode: Form Values
// ---------------------------------------------------------------------------

export interface MessageFormValues {
  address: string;
  version: string;
  message: string;
}

export function getMessageFormValues(): MessageFormValues | null {
  const address = ($("message-address") as HTMLInputElement).value.trim();
  const version = ($("message-version") as HTMLInputElement).value.trim() || DEFAULT_SAFE_VERSION;
  const message = ($("message-text") as HTMLTextAreaElement).value;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    showError("Invalid Ethereum address format. Must be 0x followed by 40 hex characters.");
    return null;
  }

  if (!message) {
    showError("Please enter a message to hash.");
    return null;
  }

  return { address, version, message };
}

// ---------------------------------------------------------------------------
// Render: Message Hashes
// ---------------------------------------------------------------------------

export function renderMessageData(address: string, message: string): void {
  const container = $("tx-data");
  clear(container);

  const section = el("div", "section");

  const header = el("div", "section-header", "Message Data and Computed Hashes");
  section.appendChild(header);

  const subHeader = el("div", "sub-header", "Message Data");
  section.appendChild(subHeader);

  section.appendChild(makeField("Multisig address", address));

  // Show message in a pre block for readability
  const msgLabel = el("div", "field");
  const msgLabelEl = el("span", "field-label", "Message");
  msgLabel.appendChild(msgLabelEl);
  const msgValue = el("pre", "decoded-params");
  msgValue.textContent = message;
  msgLabel.appendChild(msgValue);
  section.appendChild(msgLabel);

  container.appendChild(section);
}

export function renderMessageHashes(
  rawMessageHash: string,
  domainHash: string,
  messageHash: string,
  safeMessageHash: string
): void {
  const container = $("hashes");
  clear(container);

  const section = el("div", "section");

  const hashHeader = el("div", "sub-header", "Hashes");
  section.appendChild(hashHeader);
  section.appendChild(makeHashRow("Raw message hash", rawMessageHash, true));
  section.appendChild(makeHashRow("Domain hash", formatHash(domainHash), true));
  section.appendChild(makeHashRow("Message hash", formatHash(messageHash), true));
  section.appendChild(makeHashRow("Safe message hash", safeMessageHash, true));

  container.appendChild(section);
}

// ---------------------------------------------------------------------------
// Render: Offline Transaction Data (without decoded data, since offline
// mode doesn't have API-decoded info)
// ---------------------------------------------------------------------------

export function renderOfflineTransactionData(
  address: string,
  to: string,
  value: string,
  data: string,
  operation: number,
  safeTxGas: string,
  baseGas: string,
  gasPrice: string,
  gasToken: string,
  refundReceiver: string,
  nonce: number,
  encodedMessage: string
): void {
  const container = $("tx-data");
  clear(container);

  const section = el("div", "section");

  const header = el("div", "section-header", "Transaction Data and Computed Hashes");
  section.appendChild(header);

  const subHeader = el("div", "sub-header", "Transaction Data");
  section.appendChild(subHeader);

  section.appendChild(makeField("Multisig address", address));
  section.appendChild(makeField("To", to));
  section.appendChild(makeField("Value", value));
  section.appendChild(makeField("Data", data));

  // Operation display
  const opField = el("div", "field");
  const opLabel = el("span", "field-label", "Operation");
  opField.appendChild(opLabel);
  const opValue = el("span", "field-value");
  if (operation === 0) {
    opValue.textContent = "Call";
  } else if (operation === 1) {
    opValue.textContent = "Delegatecall";
    opValue.classList.add("operation-delegatecall");
  } else {
    opValue.textContent = "Unknown";
  }
  opField.appendChild(opValue);
  section.appendChild(opField);

  section.appendChild(makeField("Safe Transaction Gas", safeTxGas));
  section.appendChild(makeField("Base Gas", baseGas));
  section.appendChild(makeField("Gas Price", gasPrice));
  section.appendChild(makeField("Gas Token", gasToken));
  section.appendChild(makeField("Refund Receiver", refundReceiver));
  section.appendChild(makeField("Nonce", String(nonce)));
  section.appendChild(makeField("Encoded message", encodedMessage));

  container.appendChild(section);
}

// ---------------------------------------------------------------------------
// Send Mode: Form Values
// ---------------------------------------------------------------------------

export interface SendFormValues {
  address: string;
  version: string;
  token: Token | null; // null = native ETH
  recipient: string;
  amount: string;
  nonce: number;
}

export function getSendFormValues(): SendFormValues | null {
  const address = ($("send-address") as HTMLInputElement).value.trim();
  const version = ($("send-version") as HTMLInputElement).value.trim() || DEFAULT_SAFE_VERSION;
  const recipient = ($("send-recipient") as HTMLInputElement).value.trim();
  const amount = ($("send-amount") as HTMLInputElement).value.trim();
  const nonceStr = ($("send-nonce") as HTMLInputElement).value.trim();
  const token = getSelectedToken();

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    showError("Invalid Safe address format. Must be 0x followed by 40 hex characters.");
    return null;
  }

  if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    showError("Invalid recipient address format. Must be 0x followed by 40 hex characters.");
    return null;
  }

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    showError("Invalid amount. Must be a positive number.");
    return null;
  }

  if (!nonceStr || !/^\d+$/.test(nonceStr)) {
    showError("Invalid nonce. Must be a non-negative integer.");
    return null;
  }

  return {
    address,
    version,
    token,
    recipient,
    amount,
    nonce: Number(nonceStr),
  };
}

// ---------------------------------------------------------------------------
// Render: Send Transaction Data
// ---------------------------------------------------------------------------

export interface SendSummary {
  tokenSymbol: string;
  tokenName: string;
  recipient: string;
  amountDisplay: string;
  amountSmallest: string;
  decimals: number;
  contractAddress: string | null; // null for ETH
}

export function renderSendTransactionData(
  address: string,
  summary: SendSummary,
  to: string,
  value: string,
  data: string,
  nonce: number,
  encodedMessage: string
): void {
  const container = $("tx-data");
  clear(container);

  const section = el("div", "section");

  const header = el("div", "section-header", "Transaction Data and Computed Hashes");
  section.appendChild(header);

  // User-friendly transfer summary
  const summaryHeader = el("div", "sub-header", "Transfer Summary");
  section.appendChild(summaryHeader);

  section.appendChild(makeField("Token", `${summary.tokenSymbol} (${summary.tokenName})`));
  if (summary.contractAddress) {
    section.appendChild(makeField("Token contract", summary.contractAddress));
  }
  section.appendChild(makeField("Recipient", summary.recipient));
  section.appendChild(makeField(`Amount (${summary.tokenSymbol})`, summary.amountDisplay));
  section.appendChild(makeField("Decimals", String(summary.decimals)));
  section.appendChild(makeField("Amount (smallest unit)", summary.amountSmallest));

  // Raw transaction data that will be signed
  const txHeader = el("div", "sub-header", "Transaction Data (Signed)");
  section.appendChild(txHeader);

  section.appendChild(makeField("Multisig address", address));
  section.appendChild(makeField("To", to));
  section.appendChild(makeField("Value", value));
  section.appendChild(makeField("Data", data));
  section.appendChild(makeField("Operation", "Call"));
  section.appendChild(makeField("Safe Transaction Gas", "0"));
  section.appendChild(makeField("Base Gas", "0"));
  section.appendChild(makeField("Gas Price", "0"));
  section.appendChild(makeField("Gas Token", ZERO_ADDRESS));
  section.appendChild(makeField("Refund Receiver", ZERO_ADDRESS));
  section.appendChild(makeField("Nonce", String(nonce)));
  section.appendChild(makeField("Encoded message", encodedMessage));

  container.appendChild(section);
}
