#!/bin/bash
# ── Chaos Monkey Script for Kubernetes ────────────────────────
# Designed to continuously kill pods at random intervals to
# validate the resilience, failover, and self-healing properties
# of the microservice architecture.

set -e

NAMESPACE="ecommerce"

echo "========================================="
echo "🐒 Starting Kubernetes Chaos Monkey 🐒"
echo "Targeting namespace: $NAMESPACE"
echo "Press Ctrl+C to stop the chaos."
echo "========================================="

while true; do
  # Sleep for a random interval between 10 and 60 seconds
  SLEEP_TIME=$(( (RANDOM % 50) + 10 ))
  echo "[$(date +'%H:%M:%S')] 💤 Waiting for $SLEEP_TIME seconds..."
  sleep $SLEEP_TIME

  # Pick a random pod in the namespace
  TARGET_POD=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | shuf -n 1)

  if [ -z "$TARGET_POD" ]; then
    echo "⚠️ No pods found in namespace $NAMESPACE. Is the environment deployed?"
    continue
  fi

  echo "💥 [CHAOS] Terminating pod: $TARGET_POD"
  
  # Terminate the pod forcefully
  kubectl delete pod $TARGET_POD -n $NAMESPACE --grace-period=0 --force > /dev/null 2>&1

  echo "✔️ Pod $TARGET_POD deleted. Watch Kubernetes automatically spin up a replacement!"
  echo "👀 Check the Grafana dashboards to see if the HTTP error rate spiked or if circuit breakers handled it."
done
