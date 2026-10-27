import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.error('Redis Client Error', err));

function generateCounterSVG(count) {
    const formattedCount = Number(count).toLocaleString('en-US');
    return `
    <svg xmlns="http://w3.org" width="320" height="80" viewBox="0 0 320 80">
        <style>
            .bg { fill: #0d1117; stroke: #30363d; stroke-width: 2; rx: 12px; }
            .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; fill: #8b949e; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
            .count { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; fill: #58a6ff; font-size: 32px; font-weight: bold; }
            .live-pulse { fill: #238636; animation: pulse 2s infinite; }
            @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
        </style>
        <rect width="100%" height="100%" class="bg" />
        <circle cx="25" cy="28" r="5" class="live-pulse" />
        <text x="40" y="32" class="title">Global Collective Clicks</text>
        <text x="25" y="65" class="count">${formattedCount}</text>
    </svg>
    `;
}

export default async function handler(req, res) {
    if (!redisClient.isOpen) await redisClient.connect();

    // Headers agressivos para quebrar o Proxy Camo do GitHub
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-date, no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    try {
        let currentCount = await redisClient.get('global_click_counter');
        if (!currentCount) {
            currentCount = 0;
            await redisClient.set('global_click_counter', 0);
        }
        return res.status(200).send(generateCounterSVG(currentCount));
    } catch (error) {
        return res.status(500).send(generateCounterSVG('ERR'));
    }
}
