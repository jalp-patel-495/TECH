const Redis = require('ioredis');
require('dotenv').config();

// Memory store fallback in case native Redis server is not actively running
class InMemoryRedisFallback {
  constructor() {
    this.store = new Map();
    this.timeouts = new Map();
    this.status = 'ready (in-memory mode)';
    console.log('[Redis] Running in high-performance in-memory fallback cache');
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async set(key, value, ...args) {
    this.store.set(key, String(value));
    if (args[0] && args[0].toUpperCase() === 'EX' && args[1]) {
      this.expire(key, parseInt(args[1], 10));
    }
    return 'OK';
  }

  async setex(key, seconds, value) {
    return this.set(key, value, 'EX', seconds);
  }

  async del(...keys) {
    let count = 0;
    for (const key of keys) {
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
        this.timeouts.delete(key);
      }
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async expire(key, seconds) {
    if (!this.store.has(key)) return 0;
    if (this.timeouts.has(key)) clearTimeout(this.timeouts.get(key));
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timeouts.delete(key);
    }, seconds * 1000);
    this.timeouts.set(key, timer);
    return 1;
  }

  async keys(pattern) {
    const all = Array.from(this.store.keys());
    if (pattern === '*') return all;
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return all.filter((k) => regex.test(k));
  }

  async flushall() {
    this.store.clear();
    for (const timer of this.timeouts.values()) clearTimeout(timer);
    this.timeouts.clear();
    return 'OK';
  }

  async ping() {
    return 'PONG';
  }
}

let redisClient;
let isNativeRedis = false;

try {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);

  const realClient = new Redis({
    host,
    port,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 2) {
        return null; // Stop retrying if Redis is not running
      }
      return 500;
    },
    connectTimeout: 2000,
  });

  realClient.on('connect', () => {
    isNativeRedis = true;
    console.log(`[Redis] Connected to server at ${host}:${port}`);
  });

  realClient.on('error', (err) => {
    // Only log once during initial test
    if (isNativeRedis) {
      console.warn('[Redis] Connection warning:', err.message);
    }
  });

  // Test connection asynchronously
  realClient
    .connect()
    .then(() => {
      isNativeRedis = true;
      redisClient = realClient;
    })
    .catch(() => {
      console.log('[Redis] Standalone Redis server not detected; utilizing built-in cache fallback');
      redisClient = new InMemoryRedisFallback();
    });

  // Default to fallback until connection confirms
  redisClient = new InMemoryRedisFallback();
} catch (e) {
  redisClient = new InMemoryRedisFallback();
}

// Cache helper utilities
const cache = {
  get: async (key) => {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  set: async (key, value, ttlSeconds = 3600) => {
    try {
      const str = JSON.stringify(value);
      if (ttlSeconds) {
        await redisClient.setex(key, ttlSeconds, str);
      } else {
        await redisClient.set(key, str);
      }
      return true;
    } catch {
      return false;
    }
  },
  del: async (key) => {
    try {
      await redisClient.del(key);
      return true;
    } catch {
      return false;
    }
  },
  blacklistToken: async (token, ttlSeconds = 604800) => {
    try {
      await redisClient.set(`bl_${token}`, 'blacklisted', 'EX', ttlSeconds);
      return true;
    } catch {
      return false;
    }
  },
  isTokenBlacklisted: async (token) => {
    try {
      const res = await redisClient.get(`bl_${token}`);
      return !!res;
    } catch {
      return false;
    }
  },
  getStatus: () => ({
    mode: isNativeRedis ? 'Native Redis Server' : 'In-Memory Redis Cache',
    status: 'operational',
    port: process.env.REDIS_PORT || 6379,
  }),
};

module.exports = {
  redisClient,
  cache,
};
