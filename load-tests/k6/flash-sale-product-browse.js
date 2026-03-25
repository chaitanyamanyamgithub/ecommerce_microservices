import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost';
const STAGE_1_VUS = Number(__ENV.STAGE_1_VUS || 100);
const STAGE_2_VUS = Number(__ENV.STAGE_2_VUS || 250);
const STAGE_3_VUS = Number(__ENV.STAGE_3_VUS || 500);
const STAGE_4_VUS = Number(__ENV.STAGE_4_VUS || 1000);

export const options = {
  scenarios: {
    flash_sale_catalog: {
      executor: 'ramping-vus',
      startVUs: 0,
      gracefulRampDown: '30s',
      stages: [
        { duration: '2m', target: STAGE_1_VUS },
        { duration: '2m', target: STAGE_2_VUS },
        { duration: '3m', target: STAGE_3_VUS },
        { duration: '3m', target: STAGE_4_VUS },
        { duration: '2m', target: 0 }
      ]
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
    checks: ['rate>0.99']
  }
};

export function setup() {
  const response = http.get(`${BASE_URL}/api/products`, {
    tags: { endpoint: 'catalog-list', phase: 'setup' }
  });

  check(response, {
    'setup catalog list returned 200': (res) => res.status === 200
  });

  let productIds = [];
  try {
    const payload = response.json();
    if (payload && payload.data && Array.isArray(payload.data.products)) {
      productIds = payload.data.products
        .map((product) => product && product._id)
        .filter(Boolean);
    }
  } catch (error) {
    productIds = [];
  }

  return { productIds };
}

export default function (data) {
  const productIds = data.productIds || [];
  const randomRoll = Math.random();

  if (randomRoll < 0.45) {
    group('catalog.list', () => {
      const response = http.get(`${BASE_URL}/api/products`, {
        tags: { endpoint: 'catalog-list', phase: 'browse' }
      });
      check(response, {
        'catalog list status is 200': (res) => res.status === 200,
        'catalog list has success payload': (res) => res.json('success') === true
      });
    });
  } else if (randomRoll < 0.7) {
    group('catalog.category', () => {
      const response = http.get(`${BASE_URL}/api/products?category=electronics`, {
        tags: { endpoint: 'catalog-category', phase: 'browse' }
      });
      check(response, {
        'category list status is 200': (res) => res.status === 200
      });
    });
  } else if (randomRoll < 0.85) {
    group('catalog.search', () => {
      const response = http.get(`${BASE_URL}/api/products?search=phone`, {
        tags: { endpoint: 'catalog-search', phase: 'browse' }
      });
      check(response, {
        'search list status is 200': (res) => res.status === 200
      });
    });
  } else if (productIds.length > 0) {
    group('catalog.detail', () => {
      const productId = productIds[Math.floor(Math.random() * productIds.length)];
      const response = http.get(`${BASE_URL}/api/products/${productId}`, {
        tags: { endpoint: 'catalog-detail', phase: 'browse' }
      });
      check(response, {
        'catalog detail status is 200': (res) => res.status === 200,
        'catalog detail has product id': (res) => !!res.json('data._id')
      });
    });
  }

  sleep(Math.random() * 2 + 0.25);
}
