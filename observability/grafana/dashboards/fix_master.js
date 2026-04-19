const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'new-ecommerce-master-architecture.json');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/sum by \(service\)/g, 'sum by (exported_job)');
content = content.replace(/sum by \(le, service\)/g, 'sum by (le, exported_job)');
content = content.replace(/\{\{service\}\}/g, '{{exported_job}}');

fs.writeFileSync(filePath, content);
console.log('Fixed master architecture');
