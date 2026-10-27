import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });

export default async function handler(req, res) {
    if (!redisClient.isOpen) await redisClient.connect();
    
    const { source } = req.query;
    const redirectTarget = process.env.REDIRECT_URL || `https://${req.headers.host}`;

    try {
        // Operação atômica de alta performance em escala global
        await redisClient.incr('global_click_counter');

        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

        // Se o clique foi disparado de dentro do site principal via JavaScript Fetch
        if (source === 'web') {
            return res.status(200).json({ success: true });
        }

        // Se o clique veio do README do GitHub, redireciona o usuário para o site
        return res.redirect(302, redirectTarget);
    } catch (error) {
        console.error(error);
        if (source === 'web') return res.status(500).json({ error: 'Redis failure' });
        return res.redirect(302, redirectTarget);
    }
}
