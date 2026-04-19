const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let raw = fs.readFileSync(filePath, 'utf8');
    
    // Quick string replacements for non-existent metrics in ecommerce-observability.json and others
    raw = raw.replace(/ecommerce_checkout_requests_total\{status=\\"confirmed\\"\}/g, 'ecommerce_http_requests_total{service=\\"order-service\\", status_class=\\"2xx\\"}');
    raw = raw.replace(/ecommerce_cart_requests_total\{operation=\\"add\\"\}/g, 'ecommerce_http_requests_total{service=\\"cart-service\\", method=\\"POST\\"}');
    raw = raw.replace(/ecommerce_payment_requests_total\{status=\\"completed\\"\}/g, 'ecommerce_http_requests_total{service=\\"payment-service\\", status_class=\\"2xx\\"}');
    raw = raw.replace(/ecommerce_catalog_requests_total\{route=\\"list\\"\}/g, 'ecommerce_http_requests_total{service=\\"product-service\\", route=\\"/api/products\\"}');
    
    raw = raw.replace(/sum by \(operation\) \(rate\(ecommerce_cart_requests_total\[1m\]\)\)/g, 'sum by (method) (rate(ecommerce_http_requests_total{service=\\"cart-service\\"}[1m]))');
    raw = raw.replace(/sum by \(status\) \(rate\(ecommerce_checkout_requests_total\[1m\]\)\)/g, 'sum by (status_class) (rate(ecommerce_http_requests_total{service=\\"order-service\\"}[1m]))');
    raw = raw.replace(/sum by \(status\) \(rate\(ecommerce_payment_requests_total\[1m\]\)\)/g, 'sum by (status_class) (rate(ecommerce_http_requests_total{service=\\"payment-service\\"}[1m]))');
    raw = raw.replace(/ecommerce_catalog_requests_total/g, 'ecommerce_http_requests_total{service=\\"product-service\\"}');
    
    // Make it more colorful and bright as requested
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error("Error parsing", file, e);
        return;
    }

    // Modernize styles
    data.style = "dark";
    if (data.panels) {
        data.panels.forEach(p => {
            p.transparent = true;
            if (p.type === 'stat') {
                if (p.options) p.options.colorMode = "background";
                if (!p.fieldConfig) p.fieldConfig = { defaults: {} };
                if (!p.fieldConfig.defaults.color) p.fieldConfig.defaults.color = { mode: "continuous-GrYlRd" };
            }
            if (p.type === 'timeseries') {
                if (!p.fieldConfig) p.fieldConfig = { defaults: { custom: {} } };
                if (!p.fieldConfig.defaults.custom) p.fieldConfig.defaults.custom = {};
                p.fieldConfig.defaults.custom.fillOpacity = 40; // More color fill
                p.fieldConfig.defaults.custom.gradientMode = "hue";
                p.fieldConfig.defaults.custom.lineWidth = 3;
            }
        });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log('Fixed and brightened: ' + file);
});
console.log('Done!');
