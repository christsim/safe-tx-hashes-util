#!/usr/bin/env bash

set -e

usage() {
  echo "Usage: $0 <network> <address> <nonce> <coin> <to> <value> [--contract-address <address>] [--decimal_places <places>]"
  echo "  <network>           : Network (e.g. ethereum, avalanche, base, etc.)"
  echo "  <address>           : Gnosis Safe address"
  echo "  <nonce>             : Transaction nonce"
  echo "  <coin>              : Coin type (e.g., eth, usdc, usdt)"
  echo "  <to>                : Recipient address"
  echo "  <value>             : Value in human-readable format (e.g., 1.5)"
  echo "  --contract-address  : (Optional) Override coin contract address"
  echo "  --decimals          : (Optional) Override coin decimal places"
}

# Read-only associative array mapping networks to USDC contract addresses.
#https://developers.circle.com/stablecoins/usdc-on-main-networks
declare -A -r usdc_ADDRESSES=(
    ["arbitrum"]="0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    ["avalanche"]="0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"
    ["base"]="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    ["ethereum"]="0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
)

#https://tether.to/ru/supported-protocols/
declare -A -r usdt_ADDRESSES=(
    ["avalanche"]="0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7 "
    ["ethereum"]="0xdac17f958d2ee523a2206206994597c13d831ec7"
)

# Read-only associative array mapping coins to their decimal places.
declare -A -r DECIMALS=(
    ["eth"]="18"
    ["usdc"]="6"
    ["usdt"]="6"
)

# Utility function to ensure all required tools are installed.
check_required_tools() {
    local tools=("bc")
    local missing_tools=()

    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &>/dev/null; then
            missing_tools+=("$tool")
        fi
    done

    if [[ ${#missing_tools[@]} -ne 0 ]]; then
        echo -e "${BOLD}${RED}The following required tools are not installed:${RESET}"
        for tool in "${missing_tools[@]}"; do
            echo -e "${BOLD}${RED}  - $tool${RESET}"
        done
        echo -e "${BOLD}${RED}Please install them to run the script properly.${RESET}"
        exit 1
    fi
}

check_required_tools

# get_coin_contract_address dynamically looks up the contract address.
# For native ETH (coin "eth"), it returns an empty string.
get_coin_contract_address() {
  local network="$1"
  local coin
  coin="$2"
  
  if [ "$coin" = "eth" ]; then
    echo ""
    return
  fi
  
  local array_name="${coin}_ADDRESSES"
  
  # Use a nameref to refer to the correct associative array.
  declare -n coin_addresses="$array_name"
  
  if [ -z "${coin_addresses[$network]}" ]; then
    echo "Error: Contract address for coin '$coin' on network '$network' not found." >&2
    exit 1
  fi
  
  echo "${coin_addresses[$network]}"
}

# get_coin_decimals returns the number of decimals for a given coin.
get_coin_decimals() {
  local coin
  coin=$(echo "$1" | tr '[:upper:]' '[:lower:]')
  if [ -z "${DECIMALS[$coin]}" ]; then
    echo "Error: Decimal places for coin '$coin' not found." >&2
    exit 1
  fi
  echo "${DECIMALS[$coin]}"
}

# convert_to_smallest_unit converts a human-readable value to its smallest unit based on the decimals.
convert_to_smallest_unit() {
  local value="$1"
  local decimals="$2"
  # Calculate multiplier as 10^decimals using bc
  local multiplier
  multiplier=$(echo "10^$decimals" | bc)
  # Multiply the value by the multiplier and output as an integer (rounding down)
  echo $(echo "scale=0; $value * $multiplier / 1" | bc)
}

# Guard: Ensure all required parameters are provided.
if [ "$#" -lt 6 ]; then
  usage
  exit 1
fi

network=$1
address=$2
nonce=$3
coin=$4
to=$5
value_input=$6
shift 6

# Optional parameters defaults.
contract_address=""
decimal_places=""

# Process optional parameters.
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --contract-address) contract_address="$2"; shift 2 ;;
    --decimals) decimal_places="$2"; shift 2 ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

# If no override provided, use the helper functions.
if [ -z "$contract_address" ]; then
  contract_address=$(get_coin_contract_address "$network" "$coin")
fi

if [ -z "$decimal_places" ]; then
  decimal_places=$(get_coin_decimals "$coin")
fi

value_smallest=$(convert_to_smallest_unit "$value_input" "$decimal_places")

echo "------------------------------------------------------"
echo "--- Will calculate the offline $coin Transfer hashes ---"
echo "------------------------------------------------------"
echo "Network                 : $network"
echo "Gnosis Safe Address     : $address"
echo "Coin                    : $coin"
echo "Coin Contract Address   : $contract_address <== coin contract address"
echo "Nonce                   : $nonce"
echo "To                      : $to  <== recipent of funds"
echo "Value (input)           : $value_input"
echo "Decimal Places          : $decimal_places"
echo "Value (smallest unit)   : $value_smallest  <== converted from the input value"
echo "------------------------------------------------------"


encoded_call=$(cast calldata "transfer(address,uint256)" "$to" "$value_smallest")

# Wait for any key press to continue
read -n 1 -s -r -p "Press any key to continue..."
echo

# helper to check offline eth txs
./safe_hashes.sh --offline --network $network --data $encoded_call --address $address --to $contract_address --nonce $nonce --value 0

#Hashes
#Domain hash: 0x5935274FAA269BDE853A2A63C6F355A32B7AD733D195DECD14652651C4AE2AEE
#Message hash: 0x45116FA84F461ADED1BEE1D976A5572D0D7BF1F40B814D3D5EC40B0059DCAEB5
#Safe transaction hash: 0x984df5f0018af30c87ddb931f10e99279c04c403d4255a7569dd908e97ceef81

#Method: transfer
#Parameters: [
#  {
#    "name": "to",
#    "type": "address",
#    "value": "0x1006Dce136Ea998C456f6c6314781a2A2fA4a0a7",
#    "valueDecoded": null
#  },
#  {
#    "name": "value",
#    "type": "uint256",
#    "value": "10000",
#    "valueDecoded": null
#  }
#]

# data 0xa9059cbb0000000000000000000000001006dce136ea998c456f6c6314781a2a2fa4a0a70000000000000000000000000000000000000000000000000000000000002710