const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');
const http = require('http');

// ⚙️ Configuration
const token = '6453571781:AAFLdRX_mTsjTHNunvbxYDdhZdLuDEgqVJY';
const mongoUri = 'mongodb+srv://josh:JcipLjQSbhxbruLU@cluster0.hn4lm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const channelId = '-1002237370463';

const dbName = 'telegramBotDB';
const collectionName = 'userVF';

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
        const message = `*${userName}*, 🚀 *Félicitations, votre accès est presque validé!*  \n\n

🔥 Vous êtes sur le point de rejoindre un cercle ultra privé réservé aux esprits ambitieux, prêts à transformer leur avenir.
\n\n👉⚠️ *Attention* : Pour finaliser votre adhésion et débloquer l'accès à notre communauté privée, veuillez confirmer votre présence en rejoignant les canaux ci dessous
\n\n⏳ *Temps limité* : Vous avez 10 minutes pour rejoindre les canaux ci-dessous. Après ce délai, votre place sera réattribuée à quelqu’un d’autre, et vous perdrez cette opportunité unique.

\n 🎯 *Accédez maintenant et prenez votre destin en main* : `;
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
const adminId = 1613186921; // Remplace par ton ID admin

// Commande /admin pour afficher le menu
bot.onText(/\/admin/, async (msg) => {
    const userId = msg.from.id;
    
    if (userId !== adminId) {
        return bot.sendMessage(userId, "⛔ Vous n'avez pas accès à cette commande.");
    }

    const keyboard = {
        inline_keyboard: [
            [
                { text: "👥 Nombre d'utilisateurs", callback_data: 'user_count' },
                { text: '📊 Nombre ce mois', callback_data: 'user_count_month' }
            ],
            [{ text: '📢 Envoyer un message', callback_data: 'send_message' }]
        ]
    };

    await bot.sendMessage(userId, "📌 *Menu Admin*", {
        parse_mode: "Markdown",
        reply_markup: keyboard
    });
});

// Gestion des boutons du menu admin
bot.on('callback_query', async (callbackQuery) => {
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    const db = await connectDB();

    if (userId !== adminId) return;

    if (data === 'user_count') {
        const userCount = await db.collection(collectionName).countDocuments();
        bot.sendMessage(userId, `📊 Nombre total d'utilisateurs : *${userCount}*`, { parse_mode: "Markdown" });

    } else if (data === 'user_count_month') {
        const currentMonth = new Date().getMonth();
        const userCountMonth = await db.collection(collectionName).countDocuments({
            timestamp: { $gte: new Date(new Date().setMonth(currentMonth)) }
        });
        bot.sendMessage(userId, `📅 Nombre d'utilisateurs ce mois-ci : *${userCountMonth}*`, { parse_mode: "Markdown" });

    } else if (data === 'send_message') {
        bot.sendMessage(userId, "📩 Envoyez maintenant le message à diffuser (texte, image, vidéo, fichier...).");
        bot.once('message', async (message) => {
            // Sauvegarde l'ID du message à copier
            const messageId = message.message_id;
            const chatId = message.chat.id;

            bot.sendMessage(userId, "✅ Voulez-vous envoyer ce message à *tous les utilisateurs* ?", {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✔ Oui, envoyer', callback_data: `confirm_send_${chatId}_${messageId}` }],
                        [{ text: '❌ Non, annuler', callback_data: 'cancel_send' }]
                    ]
                }
            });
        });
    } else if (data.startsWith('confirm_send_')) {
        const parts = data.split('_');
        const chatId = parts[2];
        const messageId = parts[3];

        sendMessageToAllUsers(chatId, messageId);
        bot.sendMessage(userId, "📢 Message envoyé avec succès !");
    } else if (data === 'cancel_send') {
        bot.sendMessage(userId, "🚫 Envoi annulé.");
    }

    bot.answerCallbackQuery(callbackQuery.id);
});

// Fonction pour envoyer un message à tous les utilisateurs via copyMessage
async function sendMessageToAllUsers(chatId, messageId) {
    try {
        const db = await connectDB();
        const users = await db.collection(collectionName).find().toArray();

        for (let user of users) {
            try {
                await bot.copyMessage(user.user_id, chatId, messageId);
                console.log(`✅ Message copié à ${user.username} (${user.user_id})`);
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
