const fs = require('fs');
const content = fs.readFileSync('new-ecommerce-microservice-drilldown.json', 'utf8');
let out = content.replace(/sum\(rate\(container_cpu_usage_seconds_total\{[^}]+\}\[1m\]\)\) by \(pod\)/g, 'avg(ecommerce_service_cpu_usage_ratio{service=~\\"\\"}) by (service)');
out = out.replace(/sum\(container_memory_usage_bytes\{[^}]+\}\) by \(pod\)/g, 'avg(ecommerce_service_memory_usage_bytes{service=~\\"\\"}) by (service)');
fs.writeFileSync('new-ecommerce-microservice-drilldown.json', out);
console.log('Fixed drilldown');
