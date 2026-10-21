import { createIdentityApp } from '../services/identity-service/src/index.js';

const app = createIdentityApp();

export default function handler(req, res) {
  return app(req, res);
}
