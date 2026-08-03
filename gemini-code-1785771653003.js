const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

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
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('\n--- SCAN THIS QR CODE IN RENDER LOGS ---\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n==================================');
    console.log('WhatsApp Connected Successfully on Render!');
    console.log('==================================\n');
});

app.post('/send-receipt', async (req, res) => {
    try {
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ status: 'error', message: 'Phone and message required' });
        }

        let formattedPhone = phone.toString().trim().replace(/[^0-9]/g, '');
        if (formattedPhone.length === 10) {
            formattedPhone = '91' + formattedPhone;
        }

        const chatId = formattedPhone + '@c.us';

        await client.sendMessage(chatId, message);
        console.log(`Message sent to: ${formattedPhone}`);

        res.status(200).json({ status: 'success', message: 'Sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}...`);
    client.initialize();
});