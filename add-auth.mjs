import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

const routesToProtect = [
  "app.get('/api/rooms', (req, res) => {",
  "app.post('/api/rooms/group', (req, res) => {",
  "app.post('/api/rooms/private', (req, res) => {",
  "app.get('/api/messages/:roomId', (req, res) => {",
  "app.post('/api/products', (req, res) => {",
  "app.patch('/api/products/:productId/status', (req, res) => {",
  "app.post('/api/ratings', (req, res) => {",
  "app.post('/api/transactions', (req, res) => {",
  "app.get('/api/transactions/:userId', (req, res) => {",
  "app.post('/api/transactions/:transactionId/dispute', (req, res) => {",
  "app.patch('/api/transactions/:transactionId/resolve', (req, res) => {",
  "app.get('/api/user/credits', (req, res) => {",
  "app.post('/api/wallet/request', (req, res) => {",
  "app.get('/api/users', (req, res) => {",
  "app.get('/api/users/:userId', (req, res) => {",
  "app.post('/api/users/:userId/profile', (req, res) => {"
];

for (const route of routesToProtect) {
  content = content.replace(route, route.replace(', (req, res)', ', requireAuth, (req, res)'));
}

const adminRoutes = [
  "app.get('/api/admin/wallet/requests', (req, res) => {",
  "app.post('/api/admin/wallet/approve', (req, res) => {",
  "app.post('/api/admin/wallet/override', (req, res) => {",
  "app.get('/api/admin/audit-logs', (req, res) => {",
  "app.post('/api/admin/broadcast', (req, res) => {",
  "app.get('/api/admin/stats', (req, res) => {",
  "app.get('/api/admin/users', (req, res) => {",
  "app.get('/api/admin/disputes', (req, res) => {",
  "app.get('/api/admin/products', (req, res) => {",
  "app.delete('/api/admin/users/:id', (req, res) => {",
  "app.post('/api/admin/resolve-dispute', (req, res) => {",
  "app.post('/api/admin/users/update', (req, res) => {",
  "app.post('/api/admin/products/status', (req, res) => {",
  "app.post('/api/admin/products/update', (req, res) => {",
  "app.post('/api/admin/products/delete', (req, res) => {",
  "app.post('/api/settings', (req, res) => {"
];

for (const route of adminRoutes) {
  content = content.replace(route, route.replace(', (req, res)', ', requireAuth, requireAdmin, (req, res)'));
}

fs.writeFileSync('server.ts', content);
