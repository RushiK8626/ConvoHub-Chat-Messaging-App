const { createClient } = require('redis');

let redisClient = null;
let isRedisAvailable = false;
let connectionAttempted = false;

// In-memory fallback store for when Redis is unavailable
const memoryStore = {
  data: new Map(),
  lists: new Map(),
  hashes: new Map(),
  expiry: new Map(),
  
  // Cleanup expired keys periodically
  cleanupInterval: null,
  
  startCleanup() {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, expireAt] of this.expiry.entries()) {
        if (expireAt && expireAt < now) {
          this.data.delete(key);
          this.lists.delete(key);
          this.hashes.delete(key);
          this.expiry.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  },
  
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  },
  
  setExpiry(key, seconds) {
    if (seconds) {
      this.expiry.set(key, Date.now() + (seconds * 1000));
    }
  },
  
  isExpired(key) {
    const expireAt = this.expiry.get(key);
    if (expireAt && expireAt < Date.now()) {
      this.data.delete(key);
      this.lists.delete(key);
      this.hashes.delete(key);
      this.expiry.delete(key);
      return true;
    }
    return false;
  }
};

// Start memory store cleanup
memoryStore.startCleanup();

const initRedis = async () => {
  if (redisClient && isRedisAvailable) {
    return redisClient; // Already connected
  }

  connectionAttempted = true;

  // Configuration for AWS ElastiCache Valkey with TLS support
  const redisConfig = {
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis: Max reconnection attempts reached');
          isRedisAvailable = false;
          return new Error('Redis reconnection failed');
        }
        return Math.min(retries * 100, 3000); // Exponential backoff
      }
    }
  };

  // Check if using AWS ElastiCache/Valkey with TLS
  if (process.env.REDIS_HOST) {
    redisConfig.socket.host = process.env.REDIS_HOST;
    redisConfig.socket.port = parseInt(process.env.REDIS_PORT || '6379');
    
    // Enable TLS if specified
    if (process.env.REDIS_TLS === 'true') {
      redisConfig.socket.tls = true;
      redisConfig.socket.rejectUnauthorized = false; // AWS ElastiCache uses self-signed certs
    }

    // Add password if specified
    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }
  } else {
    // Fallback to URL-based connection (local Redis)
    redisConfig.url = process.env.REDIS_URL || 'redis://localhost:6379';
  }

  try {
    redisClient = createClient(redisConfig);

    redisClient.on('error', (err) => {
      console.error('Redis error:', err.message);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('Redis connecting...');
    });

    redisClient.on('ready', () => {
      console.log('Redis connected and ready');
      isRedisAvailable = true;
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis reconnecting...');
      isRedisAvailable = false;
    });

    redisClient.on('end', () => {
      console.log('Redis connection closed');
      isRedisAvailable = false;
    });

    await redisClient.connect();
    isRedisAvailable = true;
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    console.log('⚠️  Running in memory-fallback mode. Some features may be limited.');
    redisClient = null;
    isRedisAvailable = false;
    return null;
  }
};

// Graceful shutdown
const closeRedis = async () => {
  memoryStore.stopCleanup();
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('Redis connection closed gracefully');
    } catch (error) {
      console.error('Error closing Redis:', error.message);
    }
  }
};

// Export a promise that resolves to the client
let clientPromise = null;

const getRedisClient = () => {
  if (!clientPromise) {
    clientPromise = initRedis().catch((error) => {
      // Don't throw, just return null client
      clientPromise = null;
      return null;
    });
  }
  return clientPromise;
};

// Check if Redis is currently available
const isAvailable = () => isRedisAvailable;

// Memory-based fallback implementations
const memoryFallback = {
  // String operations
  async get(key) {
    if (memoryStore.isExpired(key)) return null;
    return memoryStore.data.get(key) || null;
  },
  
  async set(key, value, options = {}) {
    memoryStore.data.set(key, value);
    if (options.EX) {
      memoryStore.setExpiry(key, options.EX);
    }
    return 'OK';
  },
  
  async del(key) {
    memoryStore.data.delete(key);
    memoryStore.lists.delete(key);
    memoryStore.hashes.delete(key);
    memoryStore.expiry.delete(key);
    return 1;
  },
  
  async exists(key) {
    if (memoryStore.isExpired(key)) return 0;
    return (memoryStore.data.has(key) || memoryStore.lists.has(key) || memoryStore.hashes.has(key)) ? 1 : 0;
  },
  
  async expire(key, seconds) {
    memoryStore.setExpiry(key, seconds);
    return 1;
  },
  
  // Hash operations
  async hSet(key, fieldOrObj, value) {
    if (memoryStore.isExpired(key)) {
      memoryStore.hashes.set(key, new Map());
    }
    let hash = memoryStore.hashes.get(key);
    if (!hash) {
      hash = new Map();
      memoryStore.hashes.set(key, hash);
    }
    
    if (typeof fieldOrObj === 'object') {
      for (const [k, v] of Object.entries(fieldOrObj)) {
        hash.set(k, String(v));
      }
    } else {
      hash.set(fieldOrObj, String(value));
    }
    return 1;
  },
  
  async hGet(key, field) {
    if (memoryStore.isExpired(key)) return null;
    const hash = memoryStore.hashes.get(key);
    return hash ? hash.get(field) : null;
  },
  
  async hGetAll(key) {
    if (memoryStore.isExpired(key)) return {};
    const hash = memoryStore.hashes.get(key);
    if (!hash) return {};
    const result = {};
    for (const [k, v] of hash.entries()) {
      result[k] = v;
    }
    return result;
  },
  
  async hIncrBy(key, field, increment) {
    if (memoryStore.isExpired(key)) {
      memoryStore.hashes.set(key, new Map());
    }
    let hash = memoryStore.hashes.get(key);
    if (!hash) {
      hash = new Map();
      memoryStore.hashes.set(key, hash);
    }
    const current = parseInt(hash.get(field) || '0');
    const newValue = current + increment;
    hash.set(field, String(newValue));
    return newValue;
  },
  
  // List operations
  async rPush(key, ...values) {
    let list = memoryStore.lists.get(key);
    if (!list) {
      list = [];
      memoryStore.lists.set(key, list);
    }
    list.push(...values);
    return list.length;
  },
  
  async lRange(key, start, stop) {
    if (memoryStore.isExpired(key)) return [];
    const list = memoryStore.lists.get(key);
    if (!list) return [];
    
    // Handle negative indices like Redis
    const len = list.length;
    let startIdx = start < 0 ? Math.max(0, len + start) : start;
    let stopIdx = stop < 0 ? len + stop : stop;
    
    return list.slice(startIdx, stopIdx + 1);
  },
  
  // Scan operation (simplified for memory store)
  async scan(cursor, options = {}) {
    const pattern = options.MATCH || '*';
    const count = options.COUNT || 10;
    
    // Convert Redis pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    
    // Collect all keys from all stores
    const allKeys = new Set([
      ...memoryStore.data.keys(),
      ...memoryStore.lists.keys(),
      ...memoryStore.hashes.keys()
    ]);
    
    const matchingKeys = Array.from(allKeys).filter(key => {
      if (memoryStore.isExpired(key)) return false;
      return regex.test(key);
    });
    
    // Simple pagination using cursor as index
    const startIdx = parseInt(cursor) || 0;
    const endIdx = Math.min(startIdx + count, matchingKeys.length);
    const keys = matchingKeys.slice(startIdx, endIdx);
    
    // Return next cursor (0 means done)
    const nextCursor = endIdx >= matchingKeys.length ? '0' : String(endIdx);
    
    return { cursor: nextCursor, keys };
  }
};

// Create a proxy that uses Redis when available, falls back to memory store
const createRedisProxy = () => {
  return new Proxy({}, {
    get: (target, prop) => {
      // Handle special properties
      if (prop === 'isAvailable') return isAvailable;
      if (prop === 'initRedis') return initRedis;
      if (prop === 'closeRedis') return closeRedis;
      if (prop === 'getRedisClient') return getRedisClient;
      
      // Return async wrapper for all Redis methods
      return async (...args) => {
        // Try Redis first if available
        if (isRedisAvailable && redisClient) {
          try {
            return await redisClient[prop](...args);
          } catch (error) {
            console.error(`Redis ${prop} error:`, error.message);
            // Fall through to memory fallback
          }
        }
        
        // Use memory fallback if Redis unavailable or failed
        if (memoryFallback[prop]) {
          return await memoryFallback[prop](...args);
        }
        
        // For unsupported operations, return undefined
        console.warn(`Redis operation '${prop}' not supported in fallback mode`);
        return undefined;
      };
    }
  });
};

// Export the proxy with fallback support
module.exports = createRedisProxy();

// Also export control functions
module.exports.initRedis = initRedis;
module.exports.closeRedis = closeRedis;
module.exports.getRedisClient = getRedisClient;
module.exports.isAvailable = isAvailable;