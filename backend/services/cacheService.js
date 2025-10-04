const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
    constructor() {
        this.defaultTTL = 3600; // 1 hour in seconds
        this.sessionTTL = 86400; // 24 hours in seconds
        this.predictionTTL = 1800; // 30 minutes in seconds
    }

    /**
     * Set a value in cache with optional TTL
     */
    async set(key, value, ttl = this.defaultTTL) {
        try {
            if (!redisClient.isReady()) {
                logger.warn('Redis not available, skipping cache set');
                return false;
            }

            const client = redisClient.getClient();
            const serializedValue = JSON.stringify(value);
            
            if (ttl) {
                await client.setEx(key, ttl, serializedValue);
            } else {
                await client.set(key, serializedValue);
            }
            
            return true;
        } catch (error) {
            logger.error('Cache set error:', error);
            return false;
        }
    }

    /**
     * Get a value from cache
     */
    async get(key) {
        try {
            if (!redisClient.isReady()) {
                logger.warn('Redis not available, skipping cache get');
                return null;
            }

            const client = redisClient.getClient();
            const value = await client.get(key);
            
            if (value) {
                return JSON.parse(value);
            }
            
            return null;
        } catch (error) {
            logger.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Delete a key from cache
     */
    async del(key) {
        try {
            if (!redisClient.isReady()) {
                logger.warn('Redis not available, skipping cache delete');
                return false;
            }

            const client = redisClient.getClient();
            await client.del(key);
            return true;
        } catch (error) {
            logger.error('Cache delete error:', error);
            return false;
        }
    }

    /**
     * Check if key exists in cache
     */
    async exists(key) {
        try {
            if (!redisClient.isReady()) {
                return false;
            }

            const client = redisClient.getClient();
            const result = await client.exists(key);
            return result === 1;
        } catch (error) {
            logger.error('Cache exists error:', error);
            return false;
        }
    }

    /**
     * Set session data
     */
    async setSession(sessionId, sessionData) {
        const key = `session:${sessionId}`;
        return await this.set(key, sessionData, this.sessionTTL);
    }

    /**
     * Get session data
     */
    async getSession(sessionId) {
        const key = `session:${sessionId}`;
        return await this.get(key);
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId) {
        const key = `session:${sessionId}`;
        return await this.del(key);
    }

    /**
     * Cache ML predictions
     */
    async setPrediction(studentId, subjectId, prediction) {
        const key = `prediction:${studentId}:${subjectId}`;
        return await this.set(key, prediction, this.predictionTTL);
    }

    /**
     * Get cached ML prediction
     */
    async getPrediction(studentId, subjectId) {
        const key = `prediction:${studentId}:${subjectId}`;
        return await this.get(key);
    }

    /**
     * Cache user data
     */
    async setUser(userId, userData) {
        const key = `user:${userId}`;
        return await this.set(key, userData, this.defaultTTL);
    }

    /**
     * Get cached user data
     */
    async getUser(userId) {
        const key = `user:${userId}`;
        return await this.get(key);
    }

    /**
     * Cache dashboard data
     */
    async setDashboardData(userId, role, data) {
        const key = `dashboard:${role}:${userId}`;
        return await this.set(key, data, 1800); // 30 minutes
    }

    /**
     * Get cached dashboard data
     */
    async getDashboardData(userId, role) {
        const key = `dashboard:${role}:${userId}`;
        return await this.get(key);
    }

    /**
     * Invalidate user-related cache
     */
    async invalidateUserCache(userId) {
        try {
            if (!redisClient.isReady()) {
                return false;
            }

            const client = redisClient.getClient();
            const patterns = [
                `user:${userId}`,
                `dashboard:*:${userId}`,
                `prediction:${userId}:*`
            ];

            for (const pattern of patterns) {
                if (pattern.includes('*')) {
                    const keys = await client.keys(pattern);
                    if (keys.length > 0) {
                        await client.del(keys);
                    }
                } else {
                    await client.del(pattern);
                }
            }

            return true;
        } catch (error) {
            logger.error('Cache invalidation error:', error);
            return false;
        }
    }

    /**
     * Set user sessions list
     */
    async setUserSessions(userId, sessions) {
        const key = `user_sessions:${userId}`;
        return await this.set(key, sessions, this.sessionTTL);
    }

    /**
     * Get user sessions list
     */
    async getUserSessions(userId) {
        const key = `user_sessions:${userId}`;
        return await this.get(key);
    }

    /**
     * Add session to user's session list
     */
    async addUserSession(userId, sessionData) {
        try {
            const sessions = await this.getUserSessions(userId) || [];
            sessions.push(sessionData);
            return await this.setUserSessions(userId, sessions);
        } catch (error) {
            logger.error('Add user session error:', error);
            return false;
        }
    }

    /**
     * Remove session from user's session list
     */
    async removeUserSession(userId, sessionId) {
        try {
            const sessions = await this.getUserSessions(userId) || [];
            const filteredSessions = sessions.filter(s => s.sessionId !== sessionId);
            return await this.setUserSessions(userId, filteredSessions);
        } catch (error) {
            logger.error('Remove user session error:', error);
            return false;
        }
    }

    /**
     * Cache rate limit data
     */
    async setRateLimit(key, count, ttl) {
        return await this.set(`rate_limit:${key}`, count, ttl);
    }

    /**
     * Get rate limit data
     */
    async getRateLimit(key) {
        return await this.get(`rate_limit:${key}`);
    }

    /**
     * Increment rate limit counter
     */
    async incrementRateLimit(key, ttl) {
        try {
            if (!redisClient.isReady()) {
                return 1;
            }

            const client = redisClient.getClient();
            const rateLimitKey = `rate_limit:${key}`;
            
            const current = await client.incr(rateLimitKey);
            
            if (current === 1) {
                await client.expire(rateLimitKey, ttl);
            }
            
            return current;
        } catch (error) {
            logger.error('Rate limit increment error:', error);
            return 1;
        }
    }

    /**
     * Get cache statistics
     */
    async getStats() {
        try {
            if (!redisClient.isReady()) {
                return null;
            }

            const client = redisClient.getClient();
            const info = await client.info('memory');
            const keyspace = await client.info('keyspace');
            
            return {
                memory: info,
                keyspace: keyspace,
                connected: redisClient.isReady()
            };
        } catch (error) {
            logger.error('Cache stats error:', error);
            return null;
        }
    }
}

module.exports = new CacheService();