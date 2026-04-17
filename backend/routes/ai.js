const express = require('express');
const router = express.Router();
const axios = require('axios');

// AI Service URL (FastAPI)
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * @route   POST /api/ai/chat/:mode
 * @desc    Proxy request to the Python AI service
 * @access  Private (Authenticated)
 */
router.post('/chat/:mode', async (req, res) => {
    const { mode } = req.params;
    const body = req.body;

    try {
        console.log(`🤖 Proxying AI request for mode: ${mode}`);
        
        let endpoint = '';
        switch (mode) {
            case 'recommend':
                endpoint = '/chat/recommend';
                break;
            case 'preorder':
                endpoint = '/chat/preorder';
                break;
            case 'inventory':
                endpoint = '/chat/inventory';
                break;
            case 'campaign':
                endpoint = '/chat/campaign';
                break;
            case 'graph':
                endpoint = '/graph';
                break;
            default:
                return res.status(400).json({ error: 'Invalid AI mode' });
        }

        const response = await axios.post(`${AI_SERVICE_URL}${endpoint}`, body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000 // Ajanların düşünmesi için 60 saniye süre veriyoruz
        });

        res.json(response.data);
    } catch (error) {
        console.error('❌ AI Service Error:', error.message);
        res.status(error.response?.status || 500).json({
            error: 'AI servisi ile iletişim kurulurken bir hata oluştu.',
            details: error.response?.data?.detail || error.message
        });
    }
});

module.exports = router;
