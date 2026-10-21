import { createApp } from '../services/bus-service/src/index.js';

const app = createApp();

export default function handler(req, res) {
  return app(req, res);
}
