require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cron = require('node-cron');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// WhatsApp Client State
let qrCodeData = null;
let clientReady = false;

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
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

client.on('disconnected', (reason) => {
    console.log('WhatsApp Client was disconnected', reason);
    clientReady = false;
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
                    db.run('UPDATE tasks SET status = ? WHERE id = ?', ['completed', taskId], function(err) {
                        if (err) {
                            console.error('Error updating task', err.message);
                            msg.reply('Maaf, terjadi kesalahan saat mengupdate status tugas.');
                        } else if (this.changes > 0) {
                            msg.reply(`Mantap! Tugas dengan ID ${taskId} telah ditandai selesai.`);
                        } else {
                            msg.reply(`Tugas dengan ID ${taskId} tidak ditemukan.`);
                        }
                    });
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
cron.schedule('* * * * *', () => {
    // We only log every hour to avoid spamming the console
    if (new Date().getMinutes() === 0) {
        console.log('Running reminder check...');
    }
    
    const now = new Date();
    
    db.all('SELECT * FROM tasks WHERE status = "pending"', [], async (err, tasks) => {
        if (err) return console.error(err.message);
        
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
    });
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
app.get('/api/tasks', (req, res) => {
    db.all('SELECT * FROM tasks ORDER BY deadline ASC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Create a new task
app.post('/api/tasks', (req, res) => {
    const { title, description, deadline, phone } = req.body;
    
    if (!title || !deadline || !phone) {
        return res.status(400).json({ error: 'Title, deadline, and phone are required' });
    }

    db.run(
        'INSERT INTO tasks (title, description, deadline, phone) VALUES (?, ?, ?, ?)',
        [title, description, deadline, phone],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, title, description, deadline, phone, status: 'pending' });
        }
    );
});

// Update task status
app.patch('/api/tasks/:id/status', (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    db.run('UPDATE tasks SET status = ? WHERE id = ?', [status, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ updated: this.changes });
    });
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ deleted: this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
