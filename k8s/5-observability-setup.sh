#!/bin/bash
set -e

kubectl create namespace observability || true

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts --force-update
helm repo add grafana https://grafana.github.io/helm-charts --force-update
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts --force-update
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts --force-update
helm repo update

echo "Installing Prometheus & Grafana..."
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace observability \
  --set grafana.adminPassword=admin

echo "Installing Loki..."
helm upgrade --install loki grafana/loki-stack \
  --namespace observability \
  --set promtail.enabled=true \
  --set grafana.enabled=false

echo "Installing Jaeger..."
helm upgrade --install jaeger jaegertracing/jaeger \
  --namespace observability \
  --set provisionDataStore.cassandra=false \
  --set allInOne.enabled=true

echo "Installing OpenTelemetry Collector..."
helm upgrade --install otel-collector open-telemetry/opentelemetry-collector \
  --namespace observability \
  --set fullnameOverride=otel-collector \
  --set mode=daemonset \
  --set "config.receivers.otlp.protocols.grpc.endpoint=0.0.0.0:4317" \
  --set "config.receivers.otlp.protocols.http.endpoint=0.0.0.0:4318" \
  --set "config.exporters.prometheus.endpoint=0.0.0.0:8889" \
  --set "config.exporters.jaeger.endpoint=jaeger-collector.observability.svc.cluster.local:14250" \
  --set "config.service.pipelines.traces.receivers=[otlp]" \
  --set "config.service.pipelines.traces.exporters=[jaeger]" \
  --set "config.service.pipelines.metrics.receivers=[otlp]" \
  --set "config.service.pipelines.metrics.exporters=[prometheus]"

echo "Observability stack deployed."
echo "Grafana: kubectl port-forward svc/kube-prometheus-stack-grafana 3000:80 -n observability"
echo "Jaeger: kubectl port-forward svc/jaeger-query 16686:16686 -n observability"
