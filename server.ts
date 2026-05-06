/**
 * Copyright Alen Pepa 2026
 */
import jwt from 'jsonwebtoken';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import db from './database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Server is starting...");
  const app = express();
  const PORT = 3000;

  // Trust proxy is required for express-rate-limit to get correct IP behind reverse proxy
  app.set('trust proxy', 1);

  const httpServer = createHttpServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Basic security and DDoS protection
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for Vite/React dev server compatibility
    crossOriginEmbedderPolicy: false,
  }));

  // === REST API ROUTES ===
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-123';

  // Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      req.user = payload;
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
  
  // === BLOCKING SYSTEM ===

  app.get('/api/users/:userId/blocks', requireAuth, (req, res) => {
    const { userId } = req.params;
    if ((req as any).user.id !== userId && !(req as any).user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const blocks = db.prepare(`
      SELECT blocked_id
      FROM blocks
      WHERE blocker_id = ?
    `).all(userId);
    const blockers = db.prepare(`
      SELECT blocker_id
      FROM blocks
      WHERE blocked_id = ?
    `).all(userId);
    res.json({ blocked: blocks, blockers: blockers });
  });

  app.post('/api/users/:targetId/block', requireAuth, (req, res) => {
    const { targetId } = req.params;
    const userId = (req as any).user.id;
    if (userId === targetId) return res.status(400).json({ error: 'Cannot block yourself' });
    
    try {
      db.prepare('INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?)').run(userId, targetId);
      res.json({ success: true });
    } catch (e) {
      // Ignore if already blocked
      res.json({ success: true });
    }
  });

  app.post('/api/users/:targetId/unblock', requireAuth, (req, res) => {
    const { targetId } = req.params;
    const userId = (req as any).user.id;
    db.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?').run(userId, targetId);
    res.json({ success: true });
  });

  // === END BLOCKING SYSTEM ===

  // Public Settings Route
  app.get('/api/settings', (req, res) => {
    try {
      const settings = db.prepare('SELECT key, value FROM site_settings').all();
      const settingsMap = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  // Admin Settings Update Route
  app.post('/api/settings', requireAuth, requireAdmin, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user || user.is_banned) return res.status(401).json({ error: 'Unauthorized' });
    if (!user.is_admin) return res.status(403).json({ error: 'Forbidden' });

    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings format' });
    }

    try {
      const updateStmt = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
      
      const tx = db.transaction((updates) => {
        for (const [key, value] of Object.entries(updates)) {
          updateStmt.run(key, String(value));
        }
      });
      
      tx(settings);

      db.prepare('INSERT INTO audit_logs (id, admin_id, action, target_type, details) VALUES (?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), userId, 'update_settings', 'system', 'Updated site settings');

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Login with Alias (No password)
  app.post('/api/auth/alias', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Alias required' });
    
    let user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO users (id, username, is_guest) VALUES (?, ?, 1)').run(id, username);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      const token = jwt.sign({ id: user.id, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ id: user.id, username: user.username, avatar_url: user.avatar_url, is_guest: 1, is_admin: user.is_admin, credits: user.credits, token, user });
    }
    
    if (user.is_banned) {
      return res.status(403).json({ error: 'YOUR_ID_HAS_BEEN_TERMINATED' });
    }
    
    if (user.password) {
      return res.status(401).json({ error: 'This alias is registered and requires a password.' });
    }
    
    // Ensure existing alias users are marked as guest in response
    const token = jwt.sign({ id: user.id, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ id: user.id, username: user.username, avatar_url: user.avatar_url, is_guest: 1, is_admin: user.is_admin, credits: user.credits, token, user });
  });

  // Signup with password
  app.post('/api/auth/signup', (req, res) => {
    const { username, password, adminCode } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const userCount: any = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const isFirstUser = userCount.count === 0;
    
    // Default admin code if not provided in ENV
    const SECRET_ADMIN_CODE = process.env.ADMIN_SIGNUP_CODE || 'MATRIX_ADMIN_2026';
    const wantsAdmin = adminCode === SECRET_ADMIN_CODE;

    let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    const hash = crypto.createHash('sha256').update(password).digest('hex');

    if (user) {
      if ((user as any).password) {
        return res.status(409).json({ error: 'Username already taken' });
      } else {
        // Upgrade guest to full user
        const isAdmin = isFirstUser || wantsAdmin ? 1 : 0;
        db.prepare('UPDATE users SET password = ?, is_guest = 0, is_admin = ? WHERE id = ?').run(hash, isAdmin, (user as any).id);
      }
    } else {
      const id = crypto.randomUUID();
      const isAdmin = isFirstUser || wantsAdmin ? 1 : 0;
      db.prepare('INSERT INTO users (id, username, password, is_guest, is_admin) VALUES (?, ?, ?, 0, ?)').run(id, username, hash, isAdmin);
    }
    
    user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    const token = jwt.sign({ id: (user as any).id, is_admin: (user as any).is_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ id: (user as any).id, username: (user as any).username, avatar_url: (user as any).avatar_url, is_guest: 0, is_admin: (user as any).is_admin, credits: (user as any).credits, token, user });
  });

  // Login with password
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    
    let user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.password) {
      return res.status(401).json({ error: 'User does not have a password. Use Alias login.' });
    }

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.password !== hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: 'YOUR_ID_HAS_BEEN_TERMINATED' });
    }

    const token = jwt.sign({ id: user.id, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ id: user.id, username: user.username, avatar_url: user.avatar_url, is_guest: 0, is_admin: user.is_admin, credits: user.credits, token, user });
  });

  // Public system stats
  app.get('/api/public/stats', (req, res) => {
    try {
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
      const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE status = "available"').get() as any;
      const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as any;
      const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get() as any;
      
      res.json({
        users: userCount.count,
        products: productCount.count,
        transactions: txCount.count,
        messages: messageCount.count
      });
    } catch (e) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verify Auth & get User Information
  app.get('/api/auth/me', requireAuth, (req, res) => {
    const userId = (req as any).user.id;
    const user: any = db.prepare('SELECT id, username, is_guest, is_admin, avatar_url, credits, is_banned FROM users WHERE id = ?').get(userId);
    if (!user || user.is_banned) return res.status(401).json({ error: 'Unauthorized' });
    res.json(user);
  });

  // Get all rooms a user has access to
  app.get('/api/rooms', requireAuth, (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'UserId required' });
    
    // For private rooms, we want to show the OTHER user's name
    const rooms = db.prepare(`
      SELECT r.id, r.type, 
        CASE 
          WHEN r.type = 'private' THEN (
            SELECT u.username FROM users u 
            JOIN group_members gm2 ON u.id = gm2.user_id 
            WHERE gm2.room_id = r.id AND gm2.user_id != ?
            LIMIT 1
          )
          ELSE r.name 
        END as name
      FROM rooms r
      LEFT JOIN group_members gm ON r.id = gm.room_id
      WHERE r.type = 'world' OR gm.user_id = ?
    `).all(userId, userId);
    res.json(rooms);
  });

  // Create a custom group room
  app.post('/api/rooms/group', requireAuth, (req, res) => {
    const { name } = req.body;
    const ownerId = (req as any).user.id;
    const roomId = crypto.randomUUID();
    
    db.prepare("INSERT INTO rooms (id, name, type) VALUES (?, ?, 'group')").run(roomId, name);
    // group_members also tracking role = 'owner' implicitly, maybe just use first member, or we can just say owner is the creator.
    db.prepare("INSERT INTO group_members (room_id, user_id) VALUES (?, ?)").run(roomId, ownerId);
    
    res.json({ id: roomId, name, type: 'group' });
  });

  // Join a group room
  app.post('/api/rooms/group/:roomId/join', requireAuth, (req, res) => {
    const { roomId } = req.params;
    const userId = (req as any).user.id;

    // find the owner of the group (the first one added, or just anyone who is in it. Let's find if any member has blocked this user)
    // "Users should be able to block others from ... joining their groups"
    // So if the group has ANY member who blocked this user (or if the user blocked any member), we can block the join.
    // Or specifically the group owner. Since we don't have owner field in rooms, let's just find if ANY member has blocked the joining user.
    const blockedCheck = db.prepare(`
      SELECT 1 FROM blocks b
      JOIN group_members gm ON b.blocker_id = gm.user_id
      WHERE gm.room_id = ? AND b.blocked_id = ?
    `).get(roomId, userId);

    if (blockedCheck) {
      return res.status(403).json({ error: 'You are blocked by a member of this group.' });
    }

    try {
      db.prepare("INSERT INTO group_members (room_id, user_id) VALUES (?, ?)").run(roomId, userId);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: 'Already a member' });
    }
  });

  // Start private chat (idempotent)
  app.post('/api/rooms/private', requireAuth, (req, res) => {
    const { user1, user2 } = req.body; 
    // user1 is the requester usually, verify this
    const reqUserId = (req as any).user.id;
    if (user1 !== reqUserId) return res.status(403).json({ error: 'Forbidden' });

    // Check if user2 has blocked user1
    const blockCheck = db.prepare('SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?').get(user2, user1);
    if (blockCheck) {
      return res.status(403).json({ error: 'You have been blocked from sending private messages to this user.' });
    }

    // Check if private room already exists between these two
    const existing = db.prepare(`
      SELECT r.id 
      FROM rooms r
      JOIN group_members gm1 ON r.id = gm1.room_id
      JOIN group_members gm2 ON r.id = gm2.room_id
      WHERE r.type = 'private' 
      AND gm1.user_id = ? 
      AND gm2.user_id = ?
    `).get(user1, user2) as { id: string } | undefined;

    if (existing) {
      return res.json({ id: existing.id });
    }

    const roomId = crypto.randomUUID();
    db.prepare("INSERT INTO rooms (id, name, type) VALUES (?, ?, 'private')").run(roomId, 'Private Chat');
    db.prepare("INSERT INTO group_members (room_id, user_id) VALUES (?, ?)").run(roomId, user1);
    db.prepare("INSERT INTO group_members (room_id, user_id) VALUES (?, ?)").run(roomId, user2);
    
    res.json({ id: roomId, name: 'Private Chat', type: 'private' });
  });

  // Get messages for a room
  app.get('/api/messages/:roomId', requireAuth, (req, res) => {
    const { roomId } = req.params;
    const userId = (req as any).user.id;
    // blocked users should not see messages from the blocker
    // so if the message sender (m.user_id) has blocked the requesting user (userId), do not return it.
    const messages = db.prepare(`
      SELECT m.*, u.username as username
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.room_id = ?
        AND m.user_id NOT IN (
          SELECT blocker_id FROM blocks WHERE blocked_id = ?
        )
      ORDER BY m.created_at ASC
      LIMIT 100
    `).all(roomId, userId);
    res.json(messages);
  });

  // Get all available products
  app.get('/api/products', (req, res) => {
    const products = db.prepare(`
      SELECT p.*, u.username as seller_username, u.avatar_url as seller_avatar_url,
             (SELECT AVG(rating) FROM user_ratings WHERE seller_id = p.user_id) as seller_rating,
             (SELECT COUNT(*) FROM user_ratings WHERE seller_id = p.user_id) as seller_rating_count
      FROM products p
      JOIN users u ON p.user_id = u.id
      WHERE p.status != 'banned' AND u.is_banned = 0
      ORDER BY p.created_at DESC
    `).all();
    res.json(products);
  });

  // Post a product
  app.post('/api/products', requireAuth, (req, res) => {
    const { userId, title, description, price_btc, price_usd, wallet_address, image_url, status } = req.body;

    const user = db.prepare('SELECT is_guest FROM users WHERE id = ?').get(userId) as any;
    if (user?.is_guest) {
      return res.status(403).json({ error: 'Guest accounts cannot post to marketplace.' });
    }

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO products (id, user_id, title, description, price_btc, price_usd, wallet_address, image_url, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, title, description, price_btc, price_usd || 0, wallet_address, image_url, status || 'available');
    res.json({ id });
  });

  // Update product status
  app.patch('/api/products/:productId/status', requireAuth, (req, res) => {
    const { productId } = req.params;
    const { status, userId } = req.body;
    
    // Check ownership
    const product = db.prepare('SELECT user_id FROM products WHERE id = ?').get(productId) as { user_id: string } | undefined;
    if (!product || product.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized profile access' });
    }

    try {
      db.prepare('UPDATE products SET status = ? WHERE id = ?').run(status, productId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  // Rate a seller
  app.post('/api/ratings', requireAuth, (req, res) => {
    const { sellerId, buyerId, rating } = req.body;
    if (!sellerId || !buyerId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating data' });
    }
    
    if (sellerId === buyerId) {
      return res.status(400).json({ error: 'You cannot rate yourself' });
    }

    try {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO user_ratings (id, seller_id, buyer_id, rating) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(seller_id, buyer_id) DO UPDATE SET rating=excluded.rating
      `).run(id, sellerId, buyerId, rating);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save rating' });
    }
  });

  // Record a transaction (Support Credits)
  app.post('/api/transactions', requireAuth, (req, res) => {
    const { productId, sellerId, buyerId, priceBtc, useCredits } = req.body;
    if (!productId || !sellerId || !buyerId) {
      return res.status(400).json({ error: 'Missing transaction data' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
    const buyer = db.prepare('SELECT * FROM users WHERE id = ?').get(buyerId) as any;

    if (useCredits) {
      if (!product.price_usd || product.price_usd <= 0) {
        return res.status(400).json({ error: 'This asset is only available via BTC direct transfer' });
      }
      if (buyer.credits < product.price_usd) {
        return res.status(400).json({ error: 'Insufficient credits in biometric wallet.' });
      }

      // Deduct credits from buyer, add to seller
      db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(product.price_usd, buyerId);
      db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(product.price_usd, sellerId);
    }

    try {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO transactions (id, product_id, seller_id, buyer_id, price_btc, payment_method)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, productId, sellerId, buyerId, priceBtc || 0, useCredits ? 'credits' : 'btc');
      res.json({ id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to record transaction' });
    }
  });

  // Get transaction history for a user
  app.get('/api/transactions/:userId', requireAuth, (req, res) => {
    const { userId } = req.params;
    try {
      const history = db.prepare(`
        SELECT t.*, p.title as product_title, s.username as seller_username, b.username as buyer_username
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        JOIN users s ON t.seller_id = s.id
        JOIN users b ON t.buyer_id = b.id
        WHERE t.seller_id = ? OR t.buyer_id = ?
        ORDER BY t.created_at DESC
      `).all(userId, userId);
      res.json(history);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch transaction history' });
    }
  });

  // File a dispute
  app.post('/api/transactions/:transactionId/dispute', requireAuth, (req, res) => {
    const { transactionId } = req.params;
    const { reason, userId } = req.body;

    if (!reason || !userId) {
      return res.status(400).json({ error: 'Missing reason or userId' });
    }

    try {
      // Verify user is part of the transaction
      const transaction = db.prepare('SELECT buyer_id, seller_id FROM transactions WHERE id = ?').get(transactionId) as any;
      if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
      
      if (transaction.buyer_id !== userId && transaction.seller_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      db.prepare('UPDATE transactions SET dispute_status = ?, dispute_reason = ? WHERE id = ?')
        .run('pending', reason, transactionId);
      
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to file dispute' });
    }
  });

  // Resolve a dispute (Admin or manual for now)
  app.patch('/api/transactions/:transactionId/resolve', requireAuth, (req, res) => {
    const { transactionId } = req.params;
    const { status } = req.body; // 'resolved', 'dismissed', etc.

    try {
      db.prepare('UPDATE transactions SET dispute_status = ? WHERE id = ?')
        .run(status, transactionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to resolve dispute' });
    }
  });

  // --- ADMIN ENDPOINTS ---
  const isAdmin = (adminId: string) => {
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(adminId) as any;
    return user?.is_admin === 1;
  };

  const logAudit = (adminId: string, action: string, targetType: string, targetId: string, details: string) => {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, action, target_type, target_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, adminId, action, targetType, targetId, details);
  };

  // Get user credits
  app.get('/api/user/credits', requireAuth, (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'UserId required' });
    const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId) as any;
    res.json({ credits: user?.credits || 0 });
  });

  // Request credits (Manual BTC logic placeholder)
  app.post('/api/wallet/request', requireAuth, (req, res) => {
    const { userId, amount, btcAddress } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: 'Missing required fields' });
    
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO credit_requests (id, user_id, amount, btc_address) VALUES (?, ?, ?, ?)').run(
      id, userId, amount, btcAddress || ''
    );
    res.json({ success: true, id });
  });

  // --- ADMIN WALLET ENDPOINTS ---
  app.get('/api/admin/wallet/requests', requireAuth, requireAdmin, (req, res) => {
    const { adminId } = req.query;
    if (!isAdmin(adminId as string)) return res.status(403).json({ error: 'Unauthorized' });
    
    const requests = db.prepare(`
      SELECT r.*, u.username 
      FROM credit_requests r 
      JOIN users u ON r.user_id = u.id 
      ORDER BY r.created_at DESC
    `).all();
    res.json(requests);
  });

  app.post('/api/admin/wallet/approve', requireAuth, requireAdmin, (req, res) => {
    const { adminId, requestId, status } = req.body;
    if (!isAdmin(adminId)) return res.status(403).json({ error: 'Unauthorized' });
    
    const request = db.prepare('SELECT * FROM credit_requests WHERE id = ?').get(requestId) as any;
    if (!request || request.status !== 'pending') return res.status(400).json({ error: 'Invalid request' });
    
    if (status === 'approved') {
      db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(request.amount, request.user_id);
      db.prepare("UPDATE credit_requests SET status = 'approved' WHERE id = ?").run(requestId);
      logAudit(adminId, 'APPROVE_CREDITS', 'USER', request.user_id, `Amount: ${request.amount}`);
    } else {
      db.prepare("UPDATE credit_requests SET status = 'rejected' WHERE id = ?").run(requestId);
      logAudit(adminId, 'REJECT_CREDITS', 'USER', request.user_id, `Amount: ${request.amount}`);
    }
    
    res.json({ success: true });
  });

  app.post('/api/admin/wallet/override', requireAuth, requireAdmin, (req, res) => {
    const { adminId, userId, amount } = req.body;
    if (!isAdmin(adminId)) return res.status(403).json({ error: 'Unauthorized' });
    
    db.prepare('UPDATE users SET credits = ? WHERE id = ?').run(amount, userId);
    logAudit(adminId, 'OVERRIDE_CREDITS', 'USER', userId, `New balance: ${amount}`);
    res.json({ success: true });
  });

  app.get('/api/admin/audit-logs', requireAuth, requireAdmin, (req, res) => {
    const { adminId } = req.query;
    if (!isAdmin(adminId as string)) return res.status(403).json({ error: 'Unauthorized' });
    const logs = db.prepare(`
      SELECT l.*, u.username as admin_username 
      FROM audit_logs l 
      JOIN users u ON l.admin_id = u.id 
      ORDER BY l.created_at DESC 
      LIMIT 100
    `).all();
    res.json(logs);
  });

  app.post('/api/admin/broadcast', requireAuth, requireAdmin, (req, res) => {
    const { adminId, message } = req.body;
    if (!isAdmin(adminId)) return res.status(403).json({ error: 'Unauthorized' });
    
    // Send a system message to the world room
    const worldRoom = db.prepare("SELECT id FROM rooms WHERE type = 'world'").get() as any;
    if (worldRoom) {
      const msgId = crypto.randomUUID();
      db.prepare('INSERT INTO messages (id, room_id, user_id, content, is_read) VALUES (?, ?, ?, ?, ?)').run(
        msgId, worldRoom.id, adminId, `[SYSTEM_BROADCAST]: ${message}`, 0
      );
      
      const adminUser = db.prepare('SELECT username FROM users WHERE id = ?').get(adminId) as any;
      io.to(worldRoom.id).emit('receive_message', {
        id: msgId,
        room_id: worldRoom.id,
        user_id: adminId,
        username: adminUser.username,
        content: `[SYSTEM_BROADCAST]: ${message}`,
        created_at: new Date().toISOString()
      });
      
      logAudit(adminId, 'BROADCAST', 'SYSTEM', worldRoom.id, message);
    }
    res.json({ success: true });
  });

  app.get('/api/admin/stats', requireAuth, requireAdmin, (req, res) => {
    const { adminId } = req.query;
    if (!isAdmin(adminId as string)) return res.status(403).json({ error: 'Unauthorized' });
    
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as any;
    const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as any;
    const activeDisputes = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE dispute_status = ?').get('pending') as any;

    res.json({
      users: userCount.count,
      products: productCount.count,
      transactions: txCount.count,
      disputes: activeDisputes.count
    });
  });

  app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
    const { adminId } = req.query;
    if (!isAdmin(adminId as string)) return res.status(403).json({ error: 'Unauthorized' });
    const users = db.prepare('SELECT id, username, is_guest, is_banned, ban_reason, is_admin, credits, bio, avatar_url, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  });

  app.get('/api/admin/disputes', requireAuth, requireAdmin, (req, res) => {
    const { adminId } = req.query;
    if (!isAdmin(adminId as string)) return res.status(403).json({ error: 'Unauthorized' });
    const disputes = db.prepare(`
      SELECT t.*, b.username as buyer_username, s.username as seller_username
      FROM transactions t
      JOIN users b ON t.buyer_id = b.id
      JOIN users s ON t.seller_id = s.id
      WHERE t.dispute_status IS NOT NULL
      ORDER BY t.created_at DESC
    `).all();
    res.json(disputes);
  });

  app.get('/api/admin/products', requireAuth, requireAdmin, (req, res) => {
    const { adminId } = req.query;
    if (!isAdmin(adminId as string)) return res.status(403).json({ error: 'Unauthorized' });
    const products = db.prepare(`
      SELECT p.*, u.username as seller_username 
      FROM products p 
      JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC
    `).all();
    res.json(products);
  });

  app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
    const { adminId } = req.body;
    if (!isAdmin(adminId)) return res.status(403).json({ error: 'Unauthorized' });
    const { id } = req.params;
    // Don't let admin delete themselves
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id) as any;
    if (user?.username === 'admin') return res.status(400).json({ error: 'Cannot delete primary admin' });
    
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    logAudit(adminId, 'DELETE_USER', 'USER', id, user.username);
    res.json({ success: true });
  });

  // Resolve a dispute (Admin override)
  app.post('/api/admin/resolve-dispute', requireAuth, requireAdmin, (req, res) => {
    const { adminId, transactionId, status } = req.body;
    if (!isAdmin(adminId)) return res.status(403).json({ error: 'Unauthorized' });
    
    db.prepare('UPDATE transactions SET dispute_status = ? WHERE id = ?')
      .run(status, transactionId);
    logAudit(adminId, 'RESOLVE_DISPUTE', 'TRANSACTION', transactionId, `Status: ${status}`);
    res.json({ success: true });
  });

  // Admin: Update User
  app.post('/api/admin/users/update', requireAuth, requireAdmin, (req, res) => {
    const { adminId, userId, username, bio, is_banned, ban_reason, is_admin, password, credits } = req.body;
    if (!isAdmin(adminId)) return res.status(403).json({ error: 'Unauthorized' });
    
    const target = db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as any;
    // Protect original admin user
    if (target?.username === 'admin' && userId !== adminId) return res.status(400).json({ error: 'Forbidden' });

    if (password) {
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, userId);
    }

    db.prepare('UPDATE users SET username = ?, bio = ?, is_banned = ?, ban_reason = ?, is_admin = ?, credits = ? WHERE id = ?')
      .run(username, bio, is_banned ? 1 : 0, ban_reason || null, is_admin ? 1 : 0, credits || 0, userId);
    
    logAudit(adminId, 'UPDATE_USER', 'USER', userId, `Banned: ${is_banned}${is_banned ? ` Reason: ${ban_reason}` : ''}, Admin: ${is_admin}, Credits: ${credits}`);
    res.json({ success: true });
  });

  // Admin: Ban Product
  app.post('/api/admin/products/status', requireAuth, requireAdmin, (req, res) => {
    const { adminId, productId, status } = req.body;
    if (!isAdmin(adminId)) return res.status(403).json({ error: 'Unauthorized' });
    
    db.prepare('UPDATE products SET status = ? WHERE id = ?').run(status, productId);
    logAudit(adminId, 'UPDATE_PRODUCT_STATUS', 'PRODUCT', productId, `Status: ${status}`);
    res.json({ success: true });
  });

  // Admin: Update Product
  app.post('/api/admin/products/update', requireAuth, requireAdmin, (req, res) => {
    const { adminId, productId, title, description, price_btc, price_usd, wallet_address, status, image_url } = req.body;
    if (!isAdmin(adminId)) return res.status(403).json({ error: 'Unauthorized' });
    
    db.prepare(`
      UPDATE products 
      SET title = ?, description = ?, price_btc = ?, price_usd = ?, wallet_address = ?, status = ?, image_url = ?
      WHERE id = ?
    `).run(title, description, price_btc, price_usd, wallet_address, status, image_url, productId);
    
    logAudit(adminId, 'UPDATE_PRODUCT', 'PRODUCT', productId, `Title: ${title}, Status: ${status}`);
    res.json({ success: true });
  });

  // Admin: Delete Product
  app.post('/api/admin/products/delete', requireAuth, requireAdmin, (req, res) => {
    const { adminId, productId } = req.body;
    if (!isAdmin(adminId)) return res.status(403).json({ error: 'Unauthorized' });
    
    const product = db.prepare('SELECT title FROM products WHERE id = ?').get(productId) as any;
    db.prepare('DELETE FROM products WHERE id = ?').run(productId);
    logAudit(adminId, 'DELETE_PRODUCT', 'PRODUCT', productId, product?.title || 'Unknown');
    res.json({ success: true });
  });

  // Get users for private chat list
  app.get('/api/users', requireAuth, (req, res) => {
    const users = db.prepare('SELECT id, username FROM users').all();
    res.json(users);
  });

  // Get specific user profile
  app.get('/api/users/:userId', requireAuth, (req, res) => {
    const { userId } = req.params;
    const user = db.prepare(`
      SELECT id, username, bio, avatar_url, created_at,
             (SELECT AVG(rating) FROM user_ratings WHERE seller_id = users.id) as avg_rating,
             (SELECT COUNT(*) FROM user_ratings WHERE seller_id = users.id) as rating_count
      FROM users 
      WHERE id = ?
    `).get(userId);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  // Get all products by a specific seller
  app.get('/api/products/seller/:userId', (req, res) => {
    const { userId } = req.params;
    const products = db.prepare(`
      SELECT p.*, u.username as seller_username,
             (SELECT AVG(rating) FROM user_ratings WHERE seller_id = p.user_id) as seller_rating,
             (SELECT COUNT(*) FROM user_ratings WHERE seller_id = p.user_id) as seller_rating_count
      FROM products p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(userId);
    res.json(products);
  });

  // Update user profile
  app.post('/api/users/:userId/profile', requireAuth, (req, res) => {
    const { userId } = req.params;
    const { bio, avatar_url } = req.body;
    try {
      const user = db.prepare('SELECT is_guest FROM users WHERE id = ?').get(userId) as any;
      if (user?.is_guest) {
        return res.status(403).json({ error: 'Guest accounts cannot modify profiles.' });
      }

      if (bio !== undefined && avatar_url !== undefined) {
        db.prepare('UPDATE users SET bio = ?, avatar_url = ? WHERE id = ?').run(bio, avatar_url, userId);
      } else if (bio !== undefined) {
        db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio, userId);
      } else if (avatar_url !== undefined) {
        db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatar_url, userId);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // === SOCKET.IO REALTIME EVENTS ===
  io.on('connection', (socket) => {
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
    });

    socket.on('send_message', (data) => {
      const { roomId, userId, content } = data;
      
      const user = db.prepare('SELECT username, is_guest, is_banned FROM users WHERE id = ?').get(userId) as { username: string, is_guest: number, is_banned: number } | undefined;
      
      if (user?.is_banned) {
        socket.emit('error', { message: 'YOUR_ID_HAS_BEEN_TERMINATED' });
        return;
      }

      if (user?.is_guest) {
        // Only allow world chat viewing, block writing
        // Actually we stop them here
        return;
      }

      // If this room has group members, check if any member blocked this user
      // "Users should be able to block others from sending them private messages"
      const blockedCheck = db.prepare(`
        SELECT 1 FROM blocks b
        JOIN group_members gm ON b.blocker_id = gm.user_id
        WHERE gm.room_id = ? AND b.blocked_id = ?
      `).get(roomId, userId);

      if (blockedCheck) {
        socket.emit('error', { message: 'You are blocked from sending messages to this room.' });
        return;
      }

      const id = crypto.randomUUID();
      db.prepare('INSERT INTO messages (id, room_id, user_id, content, is_read) VALUES (?, ?, ?, ?, ?)').run(id, roomId, userId, content, 0);
      
      const msg = {
        id, room_id: roomId, user_id: userId, content, is_read: 0,
        created_at: new Date().toISOString(),
        username: user?.username || 'Unknown'
      };
      
      io.to(roomId).emit('receive_message', msg);
    });

    socket.on('typing', ({ roomId, username, isTyping }) => {
      socket.to(roomId).emit('user_typing', { roomId, username, isTyping });
    });

    socket.on('mark_read', ({ roomId, userId }) => {
      db.prepare('UPDATE messages SET is_read = 1 WHERE room_id = ? AND user_id != ?').run(roomId, userId);
      io.to(roomId).emit('messages_read', { roomId });
    });
  });

  // === VITE MIDDLEWARE ===
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
