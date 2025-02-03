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

// 📩 Fonction d'envoi de message améliorée
async function sendWelcomeMessage(userId, userName) {
    try {
        // Vérification des permissions
        const chatMember = await bot.getChatMember(userId, userId);
        if (chatMember.status === 'left') {
            console.log(`❌ L'utilisateur ${userName} a bloqué le bot`);
            return;
        }

        const message = `*${userName}*, félicitations ! 🚀\n\nPrêt à rejoindre l'élite ?\n\n👉 *Clique sur les liens ci-dessous* :`;
        const keyboard = {
            inline_keyboard: [
                [{ text: '🔥 Canal VIP 1', url: 'https://t.me/+r51NVBAziak5NzZk' }],
                [{ text: '🚀 Canal VIP 2', url: 'https://t.me/+sL_NSnUaTugyODlk' }],
                [{ text: '🎯 Rejoindre le bot', url: 'https://t.me/Applepffortunebothack_bot' }]
            ]
        };

        // Envoi avec vérification des erreurs Telegram
        await bot.sendMessage(userId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
            disable_web_page_preview: true
        });

        console.log(`✅ Message envoyé à ${userName} (ID: ${userId})`);

    } catch (error) {
        console.error(`❌ ERREUR CRITIQUE avec ${userName}:`, error.response?.body || error.message);
        
        // Réessai après 3 secondes en cas d'erreur réseau
        if (error.code === 'ETELEGRAM' || error.code === 'ECONNRESET') {
            console.log(`🔄 Nouvelle tentative pour ${userName}...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            return sendWelcomeMessage(userId, userName);
        }
    }
}

// 🚀 Lancement du bot
(async () => {
    const db = await connectDB();

    // Active le débogage profond
    process.env.NTBA_FIX_319 = 1;

    bot.on('chat_join_request', async (msg) => {
        const chatId = msg.chat.id.toString();
        const userId = msg.from.id;
        const userName = msg.from.first_name || msg.from.username || 'Utilisateur inconnu';

        console.log(`\n🔔 Nouvelle demande de ${userName} (ID: ${userId})`);

        if (chatId === channelId) {
            try {
                // 🗃️ Enregistrement dans MongoDB avec vérification des doublons
                const existingUser = await db.collection(collectionName).findOne({ user_id: userId });
                
                if (!existingUser) {
                    await db.collection(collectionName).insertOne({
                        user_id: userId,
                        chat_id: chatId,
                        username: userName,
                        timestamp: new Date(),
                        status: 'pending'
                    });
                    console.log(`💾 Nouvel utilisateur enregistré: ${userName}`);
                }

                // ⏳ Envoi du message avec gestion d'erreur
                setTimeout(async () => {
                    try {
                        await sendWelcomeMessage(userId, userName);
                    } catch (error) {
                        console.error(`❌ Échec final de l'envoi à ${userName}:`, error);
                    }
                }, 2000); // Réduit à 2s comme dans votre code

                // ✅ Approbation après 10 minutes
                setTimeout(async () => {
                    try {
                        await bot.approveChatJoinRequest(chatId, userId);
                        console.log(`🎉 ${userName} approuvé avec succès !`);

                        await db.collection(collectionName).updateOne(
                            { user_id: userId },
                            { $set: { status: 'approved', approved_at: new Date() } }
                        );

                    } catch (error) {
                        console.error('❌ Échec de l\'approbation:', error.response?.body || error.message);
                    }
                }, 600000);

            } catch (error) {
                console.error('❌ ERREUR GLOBALE:', error);
            }
        }
    });

    // 🌍 Serveur keep-alive
    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('🤖 Bot opérationnel');
    }).listen(8080, () => {
        console.log('🌍 Serveur keep-alive actif sur port 8080');
    });

})();
