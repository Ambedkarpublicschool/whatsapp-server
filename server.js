const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());

let qrCodeData = '';
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('qr', async (qr) => {
    console.log('New QR code generated.');
    try {
        qrCodeData = await QRCode.toDataURL(qr);
    } catch (err) {
        console.error('Failed to generate QR Data URL:', err);
    }
});

client.on('ready', () => {
    isReady = true;
    qrCodeData = '';
    console.log('WhatsApp Connected Successfully on Render!');
});

client.on('disconnected', (reason) => {
    isReady = false;
    qrCodeData = '';
    console.log('Client disconnected:', reason);
});

// ब्राउज़र में साफ़ QR कोड देखने के लिए यह लिंक खोलें
app.get('/qr', (req, res) => {
    if (isReady) {
        return res.send('<h2>WhatsApp is already connected!</h2>');
    }
    if (!qrCodeData) {
        return res.send('<h2>QR code is generating, please refresh in 10 seconds...</h2>');
    }
    res.send(`
        <html>
            <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
                <h2>Scan this QR code with WhatsApp</h2>
                <img src="${qrCodeData}" style="width:300px;height:300px;" />
                <p>Refresh page if QR code expires.</p>
            </body>
        </html>
    `);
});

app.post('/send-receipt', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(503).json({ 
                status: 'error', 
                message: 'WhatsApp Client is not ready. Please scan QR first at /qr' 
            });
        }

        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ status: 'error', message: 'Phone & Message required' });
        }

        let cleanPhone = String(phone).replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
        }

        const chatId = cleanPhone + '@c.us';
        await client.sendMessage(chatId, message);
        console.log(`Message sent to: ${cleanPhone}`);

        res.status(200).json({ status: 'success', message: 'Sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ status: 'error', error: String(error.message || error) });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}...`);
    client.initialize();
});
