require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT;

// Mencegah server mati karena error yang tidak tertangkap
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// WhatsApp Client State
let qrCodeData = null;
let clientReady = false;

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR Code generated. Please scan to authenticate.');
    qrCodeData = qr;
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    qrCodeData = null; // Clear QR code as we are connected
    clientReady = true;
});

client.on('disconnected', async (reason) => {
    console.log('WhatsApp Client was disconnected', reason);
    clientReady = false;
    qrCodeData = null; // Reset QR code

    try {
        // Menghancurkan sesi client yang terputus
        await client.destroy();
    } catch (err) {
        console.error('Error saat menghancurkan client:', err);
    }
    
    // Inisialisasi ulang agar QR code baru bisa di-generate
    console.log('Menginisialisasi ulang WhatsApp Client...');
    client.initialize();
});

// Listen for incoming messages
client.on('message', async (msg) => {
    const body = msg.body.toLowerCase().trim();

    if (body.startsWith('yes ') || body.startsWith('no ')) {
        const parts = body.split(' ');
        if (parts.length >= 2) {
            const reply = parts[0];
            const taskId = parseInt(parts[1], 10);

            if (!isNaN(taskId)) {
                if (reply === 'yes') {
                    try {
                        const task = await prisma.task.update({
                            where: { id: taskId },
                            data: { status: 'completed' }
                        });
                        msg.reply(`Mantap! Tugas dengan ID ${taskId} telah ditandai selesai.`);
                    } catch (err) {
                        if (err.code === 'P2025') {
                            msg.reply(`Tugas dengan ID ${taskId} tidak ditemukan.`);
                        } else {
                            console.error('Error updating task', err.message);
                            msg.reply('Maaf, terjadi kesalahan saat mengupdate status tugas.');
                        }
                    }
                } else if (reply === 'no') {
                    msg.reply(`Oke, jangan lupa diselesaikan ya! Tugas dengan ID ${taskId} masih pending.`);
                }
            }
        }
    }
});

client.initialize();

// Function to send WhatsApp message
const sendWhatsAppMessage = async (phone, message) => {
    if (!clientReady) {
        console.error('Client is not ready to send messages');
        return;
    }

    // Format phone number to WhatsApp format (e.g., 62812... -> 62812...@c.us)
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
    }
    const chatId = `${formattedPhone}@c.us`;

    try {
        await client.sendMessage(chatId, message);
        console.log(`Message sent to ${phone}`);
    } catch (error) {
        console.error(`Failed to send message to ${phone}:`, error);
    }
};

// Scheduler: Check every minute for upcoming deadlines
cron.schedule('* * * * *', async () => {
    // We only log every hour to avoid spamming the console
    if (new Date().getMinutes() === 0) {
        console.log('Running reminder check...');
    }

    const now = new Date();

    try {
        const tasks = await prisma.task.findMany({
            where: { status: 'pending' }
        });

        for (const task of tasks) {
            const deadlineDate = new Date(task.deadline);
            const diffMs = deadlineDate - now;
            const diffMinutes = Math.floor(diffMs / (1000 * 60));

            // Check if deadline is exactly X hours away (60, 120, 180 mins, etc)
            // or exactly daily intervals (1440 mins, 2880 mins, etc)
            if (diffMinutes > 0 && diffMinutes % 60 === 0) {
                const hoursLeft = diffMinutes / 60;
                let timeText = hoursLeft >= 24 ? `${hoursLeft / 24} hari` : `${hoursLeft} jam`;

                const message = `PENGINGAT: Tugas '${task.title}' memiliki deadline ${timeText} lagi (${deadlineDate.toLocaleString('id-ID')}). Apakah kamu sudah menyelesaikannya? Balas dengan 'yes ${task.id}' jika sudah, atau 'no ${task.id}' jika belum.`;
                await sendWhatsAppMessage(task.phone, message);
            }
        }
    } catch (err) {
        console.error(err.message);
    }
});


// API ENDPOINTS //

// Get WhatsApp Status & QR
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        ready: clientReady,
        qr: qrCodeData
    });
});

// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await prisma.task.findMany({
            orderBy: { deadline: 'asc' }
        });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new task
app.post('/api/tasks', async (req, res) => {
    const { title, description, deadline, phone } = req.body;

    if (!title || !deadline || !phone) {
        return res.status(400).json({ error: 'Title, deadline, and phone are required' });
    }

    try {
        const task = await prisma.task.create({
            data: { title, description, deadline: new Date(deadline), phone }
        });
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update task status
app.patch('/api/tasks/:id/status', async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    try {
        await prisma.task.update({
            where: { id: parseInt(id, 10) },
            data: { status }
        });
        res.json({ updated: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await prisma.task.delete({
            where: { id: parseInt(id, 10) }
        });
        res.json({ deleted: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`);
});
