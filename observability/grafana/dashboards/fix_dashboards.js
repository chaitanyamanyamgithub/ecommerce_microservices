const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(/http_server_duration_milliseconds_count/g, 'ecommerce_http_server_duration_milliseconds_count');
    content = content.replace(/http_server_duration_milliseconds_bucket/g, 'ecommerce_http_server_duration_milliseconds_bucket');
    content = content.replace(/http_requests_total/g, 'ecommerce_http_requests_total');
    content = content.replace(/sum by \(job\)/g, 'sum by (service)');
    content = content.replace(/sum by \(le, job\)/g, 'sum by (le, service)');
    content = content.replace(/sum\(kube_pod_status_phase\{phase=\\"Running\\", namespace=\\"ecommerce\\"\}\)/g, 'count(up{job=\\"otel-collector\\", instance=\\"otel-collector:8888\\"})');
    content = content.replace(/\{namespace=\\"ecommerce\\"\} \|\~/g, '{job=\\"docker\\"} |~');
    content = content.replace(/sum\(rate\(container_cpu_usage_seconds_total\{namespace=\\"ecommerce\\", pod=\~\\"\.\*\\"\}\[1m\]\)\) by \(pod\)/g, 'avg(ecommerce_service_cpu_usage_ratio{service=~\\"\\"}) by (service)');
    content = content.replace(/\{\{pod\}\}/g, '{{service}}');
    content = content.replace(/sum\(container_memory_usage_bytes\{namespace=\\"ecommerce\\", pod=\~\\"\.\*\\"\}\) by \(pod\)/g, 'avg(ecommerce_service_memory_usage_bytes{service=~\\"\\"}) by (service)');
    content = content.replace(/\{app=\\"\\\"\}/g, '{job=\\"docker\\"} |= \\"\\"');
    content = content.replace(/route:request_rate_1m/g, 'service:request_rate_1m');

    fs.writeFileSync(filePath, content);
    console.log('Updated ' + file);
});
console.log('Done!');
