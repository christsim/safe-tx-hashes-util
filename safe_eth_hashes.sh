#!/usr/bin/env bash

set -e

# Guard: Ensure all required parameters are provided
if [ "$#" -lt 5 ]; then
  echo "Usage: $0 <network> <address> <nonce> <to> <value_eth>"
  exit 1
fi

network=$1
address=$2
nonce=$3
to=$4
value_eth=$5

# Convert ETH to WEI
value_wei=$(cast to-wei "$value_eth")

echo "------------------------------------------------------"
echo "--- Will calculate the offline ETH Transfer hashes ---"
echo "------------------------------------------------------"
echo "Network                 : $network"
echo "Gnosis Safe Address     : $address"
echo "Coin                    : ETH"
echo "Nonce                   : $nonce"
echo "To                      : $to"
echo "Value (ETH)             : $value_eth"
echo "Value (WEI)             : $value_wei    <== converted from the ETH value"
echo "------------------------------------------------------"
# Wait for any key press to continue
read -n 1 -s -r -p "Press any key to continue..."
echo

# helper to check offline eth txs
./safe_hashes.sh --offline --network $network --address $address --to $to --nonce $nonce --value $value_wei

