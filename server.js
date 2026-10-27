const express = require('express');
const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIRECT_URL = process.env.REDIRECT_URL || 'https://github.com';

// Initialize Redis Client for global scalability
const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
    await redisClient.connect();
    console.log('Connected to Redis Cluster successfully.');
})();

// Helper function to generate clean, dynamic SVG
function generateCounterSVG(count) {
    const formattedCount = Number(count).toLocaleString('en-US');
    return `
    <svg xmlns="http://w3.org" width="320" height="80" viewBox="0 0 320 80">
        <style>
            .bg { fill: #0d1117; stroke: #30363d; stroke-width: 2; rx: 12px; }
            .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; fill: #8b949e; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
            .count { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; fill: #58a6ff; font-size: 32px; font-weight: bold; }
            .live-pulse { fill: #238636; animation: pulse 2s infinite; }
            @keyframes pulse {
                0% { opacity: 0.4; }
                50% { opacity: 1; }
                100% { opacity: 0.4; }
            }
        </style>
        <rect width="100%" height="100%" class="bg" />
        <circle cx="25" cy="28" r="5" class="live-pulse" />
        <text x="40" y="32" class="title">Global Collective Clicks</text>
        <text x="25" y="65" class="count">${formattedCount}</text>
    </svg>
    `;
}

// Middleware to prevent GitHub Camo caching
const setNoCacheHeaders = (res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-date, no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
};

/**
 * @route   GET /api/v1/counter.svg
 * @desc    Renders the live SVG counter without incrementing
 */
app.get('/api/v1/counter.svg', async (req, res) => {
    try {
        setNoCacheHeaders(res);
        // Atomic read from Redis
        let currentCount = await redisClient.get('global_click_counter');
        if (!currentCount) {
            currentCount = 0;
            await redisClient.set('global_click_counter', 0);
        }
        
        res.status(200).send(generateCounterSVG(currentCount));
    } catch (error) {
        console.error('Error fetching counter:', error);
        res.status(500).send(generateCounterSVG('ERR'));
    }
});

/**
 * @route   GET /api/v1/click
 * @desc    Increments the counter at scale and redirects the user
 */
app.get('/api/v1/click', async (req, res) => {
    try {
        // High-speed atomic incrementing via Redis INCR
        await redisClient.incr('global_click_counter');
        
        // Prevent browser from caching the redirect endpoint
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.redirect(302, REDIRECT_URL);
    } catch (error) {
        console.error('Error processing click:', error);
        res.redirect(302, REDIRECT_URL);
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
