const { Redis } = require('ioredis');

if (process.env.NODE_ENV === 'test') {
    module.exports = {
        on: () => {},
        get: async () => null,
        set: async () => 'OK',
        del: async () => 0,
        quit: async () => undefined
    };
} else {
    const redis = new Redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD
    });

    redis.on('connect', () => {
        console.log('connect to redis database');
    });

    module.exports = redis;
}