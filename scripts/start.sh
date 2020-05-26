#!/usr/bin/env bash
set -euo pipefail

# Usage: INDEX=1|2 nodes/shared/node.sh
if [ -z "$INDEX" ]; then
  echo "Set INDEX env var to the node number to control"
  exit 1
fi

# Get address to unlock
case "$INDEX" in
  "1")
    ADDRESS=2e49232af0c6a20abba4e1d5503ed7da657a2cc8 ;;
  "2")
    ADDRESS=97469710850689711d79b7393d6cab818f93c3e9 ;;
  *)
    echo "Unexpected index: $INDEX (use 1 or 2)"
    exit 2 ;;
esac
echo "Address=${ADDRESS}"

# Create initial chain data from genesis file
geth \
  --nousb \
  --datadir nodes/node-$INDEX \
  init nodes/shared/reorg.json

# Run node!
geth \
  --nousb \
  --nodiscover \
  --datadir nodes/node-$INDEX \
  --port 3020$INDEX \
  --http --http.addr localhost --http.port 1200$INDEX \
  --http.api 'eth,personal,admin,miner,net' \
  --networkid 4242 \
  --gasprice 10000 \
  --unlock $ADDRESS \
  --allow-insecure-unlock \
  --miner.etherbase $ADDRESS \
  --password nodes/shared/password.txt
