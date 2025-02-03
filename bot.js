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
        const message = `*${userName}*, félicitations ! 🚀\n\nPrêt à rejoindre l'élite ?\n\n👉 *Clique sur les liens ci-dessous* :`;
        const keyboard = {
            inline_keyboard: [
                [{ text: '🔥 Canal VIP 1', url: 'https://t.me/+r51NVBAziak5NzZk' }],
                [{ text: '🚀 Canal VIP 2', url: 'https://t.me/+sL_NSnUaTugyODlk' }],
                [{ text: '🎯 Rejoindre le bot', url: 'https://t.me/Applepffortunebothack_bot' }]
            ]
        };

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

                // ⏳ Envoi du message après 2s
                setTimeout(async () => {
                    try {
                        await sendWelcomeMessage(userId, userName);
                    } catch (error) {
                        console.error(`❌ Échec final de l'envoi à ${userName}:`, error);
                    }
                }, 2000);

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




// ⚙️ Configuration de l'admin
const adminId = 1613186921; // Remplacez par l'ID réel de l'administrateur

// Commande /admin pour accéder au menu admin
bot.onText(/\/admin/, async (msg) => {
    const userId = msg.from.id;
    
    // Vérification que l'utilisateur est bien l'admin
    if (userId !== adminId) {
        return bot.sendMessage(userId, "Désolé, vous n'avez pas accès à cette commande.");
    }

    // Menu admin avec options
    const keyboard = {
        inline_keyboard: [
            [
                { text: "Nombre d'utilisateurs", callback_data: 'user_count' },
                { text: 'Nombre d\'utilisateurs ce mois', callback_data: 'user_count_month' }
            ],
            [
                { text: 'Envoyer un message', callback_data: 'send_message' }
            ]
        ]
    };

    await bot.sendMessage(userId, "Bienvenue dans le menu admin", {
        reply_markup: keyboard
    });
});

// Actions en fonction des boutons du menu admin
bot.on('callback_query', async (callbackQuery) => {
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    if (userId !== adminId) {
        return;
    }

    const db = await connectDB();

    if (data === 'user_count') {
        // Nombre d'utilisateurs
        const userCount = await db.collection(collectionName).countDocuments();
        bot.sendMessage(userId, `Il y a actuellement ${userCount} utilisateurs.`);
    } else if (data === 'user_count_month') {
        // Nombre d'utilisateurs ce mois
        const currentMonth = new Date().getMonth();
        const userCountMonth = await db.collection(collectionName).countDocuments({
            timestamp: { $gte: new Date(new Date().setMonth(currentMonth)) }
        });
        bot.sendMessage(userId, `Il y a ${userCountMonth} utilisateurs ce mois-ci.`);
    } else if (data === 'send_message') {
        // Demander le message à envoyer
        bot.sendMessage(userId, "Envoyez le message que vous souhaitez diffuser à tous les utilisateurs.");
        bot.once('message', async (message) => {
            const userMessage = message.text;
            // Demander confirmation de l'envoi
            bot.sendMessage(userId, "Êtes-vous sûr de vouloir envoyer ce message à tous les utilisateurs ?\n\n" + userMessage, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Oui, envoyer', callback_data: 'confirm_send' },
                            { text: 'Non, annuler', callback_data: 'cancel_send' }
                        ]
                    ]
                }
            });
        });
    } else if (data === 'confirm_send') {
        // Envoi à tous les utilisateurs
        const userMessage = callbackQuery.message.text.replace("Êtes-vous sûr de vouloir envoyer ce message à tous les utilisateurs ?", "").trim();
        await sendMessageToAllUsers(userMessage);
        bot.sendMessage(userId, "Le message a été envoyé à tous les utilisateurs.");
    } else if (data === 'cancel_send') {
        bot.sendMessage(userId, "Envoi du message annulé.");
    }

    bot.answerCallbackQuery(callbackQuery.id);
});

// Fonction pour envoyer un message à tous les utilisateurs
async function sendMessageToAllUsers(message) {
    try {
        const db = await connectDB();
        const users = await db.collection(collectionName).find().toArray();
        for (let user of users) {
            try {
                await bot.sendMessage(user.user_id, message);
                console.log(`✅ Message envoyé à ${user.username} (${user.user_id})`);
            } catch (error) {
                console.error(`❌ Échec d'envoi à ${user.username} (${user.user_id}):`, error.message);
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi à tous les utilisateurs:', error.message);
    }
}









    

    // 🌍 Serveur keep-alive
    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('🤖 Bot opérationnel');
    }).listen(8080, () => {
        console.log('🌍 Serveur keep-alive actif sur port 8080');
    });

})();
