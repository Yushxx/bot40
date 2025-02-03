const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');
const http = require('http');

// ⚙️ Configuration
const token = '7914191446:AAHavIOWX1CFWFab9MaKqyj0UWFzYyqWpvE';
const mongoUri = 'mongodb+srv://josh:JcipLjQSbhxbruLU@cluster0.hn4lm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const channelId = '-1002402408788';

const dbName = 'telegramBotDB';
const collectionName = 'usersVF';

// 🏗 Initialisation
const bot = new TelegramBot(token, { polling: true });
const client = new MongoClient(mongoUri);

// 🔗 Connexion MongoDB
async function connectDB() {
    try {
        await client.connect();
        console.log('✅ Connecté à MongoDB');
        return client.db(dbName);
    } catch (error) {
        console.error('❌ Erreur MongoDB:', error);
        process.exit(1);
    }
}

// 📩 Fonction d'envoi de message
async function sendWelcomeMessage(userId, userName) {
    try {
        const message = `${userName}, félicitations ! 🚀 Prêt à rejoindre l'élite ?`;
        const keyboard = {
            inline_keyboard: [
                [{ text: '🔥 Canal 1', url: 'https://t.me/+r51NVBAziak5NzZk' }],
                [{ text: '🚀 Canal 2', url: 'https://t.me/+sL_NSnUaTugyODlk' }],
                [{ text: '🎯 Rejoindre le bot', url: 'https://t.me/Applepffortunebothack_bot' }]
            ]
        };

        await bot.sendMessage(userId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

        console.log(`✅ Message envoyé à ${userName} (ID: ${userId})`);
    } catch (error) {
        console.error(`❌ Erreur d'envoi à ${userName}:`, error.message);
    }
}

// 🚀 Lancement du bot
(async () => {
    const db = await connectDB();

    bot.on('chat_join_request', async (msg) => {
        const chatId = msg.chat.id.toString();
        const userId = msg.from.id;
        const userName = msg.from.first_name || msg.from.username || 'Utilisateur inconnu';

        console.log(`🔔 Nouvelle demande de ${userName} (ID: ${userId})`);

        if (chatId === channelId) {
            // 📌 Enregistrer l'utilisateur dans la base de données
            try {
                await db.collection(collectionName).insertOne({
                    user_id: userId,
                    chat_id: chatId,
                    username: userName,
                    timestamp: new Date(),
                    status: 'pending'
                });
                console.log(`✅ Utilisateur enregistré: ${userName} (${userId})`);
            } catch (error) {
                console.error('❌ Erreur MongoDB:', error);
            }

            // ⏳ Envoyer le message après 2 secondes
            setTimeout(() => sendWelcomeMessage(userId, userName), 2000);

            // ✅ Accepter la demande après 10 minutes
            setTimeout(async () => {
                try {
                    await bot.approveChatJoinRequest(chatId, userId);
                    console.log(`✅ ${userName} approuvé !`);

                    // 🏷️ Mettre à jour le statut dans MongoDB
                    await db.collection(collectionName).updateOne(
                        { user_id: userId },
                        { $set: { status: 'approved' } }
                    );

                } catch (error) {
                    console.error('❌ Erreur lors de l\'approbation:', error);
                }
            }, 600000); // 10 minutes
        }
    });

    // 🌍 Serveur keep-alive (évite que le bot s'arrête)
    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Bot en ligne');
    }).listen(8080, () => {
        console.log('🌍 Serveur actif sur port 8080');
    });

})();
