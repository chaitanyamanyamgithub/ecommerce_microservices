[CmdletBinding()]
param(
  [ValidateSet('docker-desktop', 'kind', 'minikube', 'remote')]
  [string]$Cluster = 'docker-desktop',

  [string]$KubeContext = '',

  [string]$KindClusterName = '',

  [string]$Registry = '',

  [string]$Tag = 'latest',

  [switch]$Push,

  [switch]$InstallPrereqs,

  [switch]$InstallObservability,

  [switch]$SkipBuild,

  [switch]$SkipApply
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$overlayDir = Join-Path $PSScriptRoot '.deploy-overlay'

$services = @(
  [pscustomobject]@{
    Name = 'user-service'
    Image = 'ecommerce-user-service'
    Dockerfile = 'services/user-service/Dockerfile'
    Workload = 'deployment/user-service'
  },
  [pscustomobject]@{
    Name = 'product-service'
    Image = 'ecommerce-product-service'
    Dockerfile = 'services/product-service/Dockerfile'
    Workload = 'deployment/product-service'
  },
  [pscustomobject]@{
    Name = 'cart-service'
    Image = 'ecommerce-cart-service'
    Dockerfile = 'services/cart-service/Dockerfile'
    Workload = 'deployment/cart-service'
  },
  [pscustomobject]@{
    Name = 'order-service'
    Image = 'ecommerce-order-service'
    Dockerfile = 'services/order-service/Dockerfile'
    Workload = 'deployment/order-service'
  },
  [pscustomobject]@{
    Name = 'payment-service'
    Image = 'ecommerce-payment-service'
    Dockerfile = 'services/payment-service/Dockerfile'
    Workload = 'deployment/payment-service'
  }
)

function Assert-CommandAvailable {
  param([string]$Command)

  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    throw "Required command '$Command' was not found in PATH."
  }
}

function Invoke-ExternalCommand {
  param(
    [string]$Command,
    [string[]]$Arguments = @()
  )

  Write-Host ">> $Command $($Arguments -join ' ')" -ForegroundColor Cyan
  & $Command @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $Command $($Arguments -join ' ')"
  }
}

function Ensure-Namespace {
  param([string]$Name)

  & kubectl get namespace $Name *> $null
  if ($LASTEXITCODE -ne 0) {
    Invoke-ExternalCommand -Command 'kubectl' -Arguments @('create', 'namespace', $Name)
  }
}

function Get-CurrentContext {
  $currentContext = & kubectl config current-context 2>$null
  if ($LASTEXITCODE -ne 0) {
    return ''
  }

  return ($currentContext | Select-Object -First 1).Trim()
}

function Get-AvailableContexts {
  $contexts = & kubectl config get-contexts -o name 2>$null
  if ($LASTEXITCODE -ne 0) {
    return @()
  }

  return @($contexts | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

function Get-KindClusters {
  $clusters = & kind get clusters 2>$null
  if ($LASTEXITCODE -ne 0) {
    return @()
  }

  return @($clusters | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

function Resolve-DesiredContext {
  if (-not [string]::IsNullOrWhiteSpace($KubeContext)) {
    return $KubeContext.Trim()
  }

  switch ($Cluster) {
    'docker-desktop' { return 'docker-desktop' }
    'minikube' { return 'minikube' }
    default { return '' }
  }
}

function Ensure-ExpectedContext {
  $desiredContext = Resolve-DesiredContext
  if ([string]::IsNullOrWhiteSpace($desiredContext)) {
    return
  }

  $currentContext = Get-CurrentContext
  if ($currentContext -eq $desiredContext) {
    return
  }

  $availableContexts = Get-AvailableContexts
  if ($availableContexts -notcontains $desiredContext) {
    $contextList = if ($availableContexts.Count -gt 0) {
      $availableContexts -join ', '
    } else {
      'none'
    }

    throw "kubectl is not configured for the expected context '$desiredContext'. Available contexts: $contextList"
  }

  Invoke-ExternalCommand -Command 'kubectl' -Arguments @('config', 'use-context', $desiredContext)
}

function Resolve-KindClusterName {
  if (-not [string]::IsNullOrWhiteSpace($KindClusterName)) {
    return $KindClusterName.Trim()
  }

  $contextCandidates = @(
    Resolve-DesiredContext
    Get-CurrentContext
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

  foreach ($contextName in $contextCandidates) {
    if ($contextName.StartsWith('kind-')) {
      return $contextName.Substring(5)
    }
  }

  $kindClusters = Get-KindClusters
  if ($kindClusters.Count -eq 1) {
    return $kindClusters[0]
  }

  if ($kindClusters.Count -gt 1) {
    throw "Multiple Kind clusters detected ($($kindClusters -join ', ')). Pass -KindClusterName or -KubeContext so images are loaded into the correct cluster."
  }

  throw "No Kind clusters were found. Create a Kind cluster or pass -KubeContext with a valid Kind context before loading images."
}

function Assert-ClusterReachable {
  $clusterInfo = & kubectl cluster-info 2>&1
  if ($LASTEXITCODE -eq 0) {
    return
  }

  $helpMessage = switch ($Cluster) {
    'minikube' { "Minikube is not reachable. Start it with 'minikube start' and then rerun this script." }
    'docker-desktop' { "Docker Desktop Kubernetes is not reachable. Turn on Kubernetes in Docker Desktop Settings, wait for it to show Running, and rerun this script." }
    'kind' { "Kind is not reachable. Create or start your Kind cluster, or pass -KubeContext with the correct context name." }
    default { "The Kubernetes cluster is not reachable. Check your kubeconfig, VPN, and cluster credentials, then rerun this script." }
  }

  throw "$helpMessage`n$clusterInfo"
}

function Test-CustomResourceDefinition {
  param([string]$Name)

  & kubectl get crd $Name *> $null
  return $LASTEXITCODE -eq 0
}

function Install-ClusterPrerequisites {
  Assert-CommandAvailable -Command 'helm'

  Invoke-ExternalCommand -Command 'helm' -Arguments @('repo', 'add', 'ingress-nginx', 'https://kubernetes.github.io/ingress-nginx', '--force-update')
  Invoke-ExternalCommand -Command 'helm' -Arguments @('repo', 'add', 'metrics-server', 'https://kubernetes-sigs.github.io/metrics-server/', '--force-update')
  Invoke-ExternalCommand -Command 'helm' -Arguments @('repo', 'update')

  Invoke-ExternalCommand -Command 'helm' -Arguments @(
    'upgrade', '--install', 'ingress-nginx', 'ingress-nginx/ingress-nginx',
    '--namespace', 'ingress-nginx',
    '--create-namespace'
  )

  Invoke-ExternalCommand -Command 'helm' -Arguments @(
    'upgrade', '--install', 'metrics-server', 'metrics-server/metrics-server',
    '--namespace', 'kube-system',
    '--set', 'args[0]=--kubelet-insecure-tls'
  )
}

function Install-ObservabilityStack {
  Assert-CommandAvailable -Command 'helm'

  Ensure-Namespace -Name 'observability'

  Invoke-ExternalCommand -Command 'helm' -Arguments @('repo', 'add', 'prometheus-community', 'https://prometheus-community.github.io/helm-charts', '--force-update')
  Invoke-ExternalCommand -Command 'helm' -Arguments @('repo', 'add', 'grafana', 'https://grafana.github.io/helm-charts', '--force-update')
  Invoke-ExternalCommand -Command 'helm' -Arguments @('repo', 'add', 'jaegertracing', 'https://jaegertracing.github.io/helm-charts', '--force-update')
  Invoke-ExternalCommand -Command 'helm' -Arguments @('repo', 'add', 'open-telemetry', 'https://open-telemetry.github.io/opentelemetry-helm-charts', '--force-update')
  Invoke-ExternalCommand -Command 'helm' -Arguments @('repo', 'update')

  Invoke-ExternalCommand -Command 'helm' -Arguments @(
    'upgrade', '--install', 'kube-prometheus-stack', 'prometheus-community/kube-prometheus-stack',
    '--namespace', 'observability',
    '--set', 'grafana.adminPassword=admin'
  )

  Invoke-ExternalCommand -Command 'kubectl' -Arguments @(
    'wait',
    '--for=condition=Established',
    'crd/prometheusrules.monitoring.coreos.com',
    '--timeout=120s'
  )

  Invoke-ExternalCommand -Command 'helm' -Arguments @(
    'upgrade', '--install', 'loki', 'grafana/loki-stack',
    '--namespace', 'observability',
    '--set', 'promtail.enabled=true',
    '--set', 'grafana.enabled=false'
  )

  Invoke-ExternalCommand -Command 'helm' -Arguments @(
    'upgrade', '--install', 'jaeger', 'jaegertracing/jaeger',
    '--namespace', 'observability',
    '--set', 'provisionDataStore.cassandra=false',
    '--set', 'allInOne.enabled=true'
  )

  Invoke-ExternalCommand -Command 'helm' -Arguments @(
    'upgrade', '--install', 'otel-collector', 'open-telemetry/opentelemetry-collector',
    '--namespace', 'observability',
    '--set', 'fullnameOverride=otel-collector',
    '--set', 'mode=daemonset',
    '--set', 'config.receivers.otlp.protocols.grpc.endpoint=0.0.0.0:4317',
    '--set', 'config.receivers.otlp.protocols.http.endpoint=0.0.0.0:4318',
    '--set', 'config.exporters.prometheus.endpoint=0.0.0.0:8889',
    '--set', 'config.exporters.jaeger.endpoint=jaeger-collector.observability.svc.cluster.local:14250',
    '--set', 'config.service.pipelines.traces.receivers[0]=otlp',
    '--set', 'config.service.pipelines.traces.exporters[0]=jaeger',
    '--set', 'config.service.pipelines.metrics.receivers[0]=otlp',
    '--set', 'config.service.pipelines.metrics.exporters[0]=prometheus'
  )
}

function New-DeployOverlay {
  param([object[]]$ResolvedServices)

  if (Test-Path $overlayDir) {
    Remove-Item -Path $overlayDir -Recurse -Force
  }

  New-Item -ItemType Directory -Path $overlayDir | Out-Null

  $content = @(
    'apiVersion: kustomize.config.k8s.io/v1beta1'
    'kind: Kustomization'
    'resources:'
    '  - ..'
    'images:'
  )

  foreach ($service in $ResolvedServices) {
    $content += "  - name: $($service.Image)"
    $content += "    newName: $($service.NewName)"
    $content += "    newTag: $($service.NewTag)"
  }

  Set-Content -Path (Join-Path $overlayDir 'kustomization.yaml') -Value ($content -join [Environment]::NewLine)
}

if ($Cluster -eq 'remote' -and [string]::IsNullOrWhiteSpace($Registry)) {
  throw "Cluster type 'remote' requires -Registry so the cluster can pull your images."
}

$registryPrefix = $Registry.Trim().TrimEnd('/')
$resolvedServices = foreach ($service in $services) {
  $newName = if ([string]::IsNullOrWhiteSpace($registryPrefix)) {
    $service.Image
  } else {
    "$registryPrefix/$($service.Image)"
  }

  [pscustomobject]@{
    Name = $service.Name
    Image = $service.Image
    Dockerfile = $service.Dockerfile
    Workload = $service.Workload
    NewName = $newName
    NewTag = $Tag
    FullImage = "${newName}:$Tag"
  }
}

Push-Location $repoRoot
try {
  if ($InstallPrereqs -or $InstallObservability -or -not $SkipApply) {
    Assert-CommandAvailable -Command 'kubectl'
    Ensure-ExpectedContext
    Assert-ClusterReachable
  }

  if (-not $SkipBuild) {
    Assert-CommandAvailable -Command 'docker'

    foreach ($service in $resolvedServices) {
      Invoke-ExternalCommand -Command 'docker' -Arguments @(
        'build',
        '-f', $service.Dockerfile,
        '-t', $service.FullImage,
        '.'
      )
    }

    if ($Push) {
      if ([string]::IsNullOrWhiteSpace($registryPrefix)) {
        throw "Use -Registry when passing -Push so images have a registry destination."
      }

      foreach ($service in $resolvedServices) {
        Invoke-ExternalCommand -Command 'docker' -Arguments @('push', $service.FullImage)
      }
    }

    switch ($Cluster) {
      'kind' {
        Assert-CommandAvailable -Command 'kind'
        $resolvedKindClusterName = Resolve-KindClusterName
        foreach ($service in $resolvedServices) {
          Invoke-ExternalCommand -Command 'kind' -Arguments @('load', 'docker-image', $service.FullImage, '--name', $resolvedKindClusterName)
        }
      }
      'minikube' {
        Assert-CommandAvailable -Command 'minikube'
        foreach ($service in $resolvedServices) {
          Invoke-ExternalCommand -Command 'minikube' -Arguments @('image', 'load', $service.FullImage)
        }
      }
    }
  }

  New-DeployOverlay -ResolvedServices $resolvedServices

  if ($InstallPrereqs) {
    Assert-CommandAvailable -Command 'kubectl'
    Install-ClusterPrerequisites
  }

  if ($InstallObservability) {
    Assert-CommandAvailable -Command 'kubectl'
    Install-ObservabilityStack
  }

  if (-not $SkipApply) {
    Assert-CommandAvailable -Command 'kubectl'

    Ensure-Namespace -Name 'ecommerce'
    Invoke-ExternalCommand -Command 'kubectl' -Arguments @('apply', '-k', $overlayDir)

    if (Test-CustomResourceDefinition -Name 'prometheusrules.monitoring.coreos.com') {
      Invoke-ExternalCommand -Command 'kubectl' -Arguments @('apply', '-f', (Join-Path $PSScriptRoot '6-prometheus-rules.yaml'))
    }

    Invoke-ExternalCommand -Command 'kubectl' -Arguments @('rollout', 'status', 'statefulset/mongodb', '-n', 'ecommerce', '--timeout=240s')
    Invoke-ExternalCommand -Command 'kubectl' -Arguments @('rollout', 'status', 'deployment/redis', '-n', 'ecommerce', '--timeout=240s')

    foreach ($service in $resolvedServices) {
      Invoke-ExternalCommand -Command 'kubectl' -Arguments @('rollout', 'status', $service.Workload, '-n', 'ecommerce', '--timeout=240s')
    }

    Invoke-ExternalCommand -Command 'kubectl' -Arguments @('get', 'pods', '-n', 'ecommerce')
    Invoke-ExternalCommand -Command 'kubectl' -Arguments @('get', 'ingress', '-n', 'ecommerce')
  } else {
    Write-Host "Skipped kubectl apply. Overlay manifest was generated successfully." -ForegroundColor Yellow
  }

  Write-Host "Kubernetes deployment helper finished." -ForegroundColor Green
} finally {
  Pop-Location

  if (Test-Path $overlayDir) {
    Remove-Item -Path $overlayDir -Recurse -Force
  }
}
