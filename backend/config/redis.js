const redis = require('redis');
const logger = require('../utils/logger');

class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        // Check if Redis is disabled
        if (process.env.REDIS_ENABLED === 'false') {
            logger.info('Redis is disabled in configuration');
            this.isConnected = false;
            return null;
        }

        try {
            this.client = redis.createClient({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                db: process.env.REDIS_DB || 0,
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        logger.warn('Redis server connection refused - continuing without Redis');
                        return undefined; // Don't retry
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        logger.error('Redis retry time exhausted');
                        return new Error('Retry time exhausted');
                    }
                    if (options.attempt > 3) {
                        logger.warn('Redis max retry attempts reached - continuing without Redis');
                        return undefined;
                    }
                    // Reconnect after
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            this.client.on('error', (err) => {
                logger.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                logger.info('Redis client connected');
                this.isConnected = true;
            });

            this.client.on('ready', () => {
                logger.info('Redis client ready');
                this.isConnected = true;
            });

            this.client.on('end', () => {
                logger.info('Redis client disconnected');
                this.isConnected = false;
            });

            await this.client.connect();
            logger.info('Redis connection established successfully');
            return this.client;
        } catch (error) {
            logger.warn('Failed to connect to Redis - continuing without Redis caching:', error.message);
            this.isConnected = false;
            this.client = null;
            return null;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.isConnected = false;
        }
    }

    getClient() {
        return this.client;
    }

    isReady() {
        return this.isConnected && this.client;
    }
}

const redisClient = new RedisClient();

module.exports = redisClient;