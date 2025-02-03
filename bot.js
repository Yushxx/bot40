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





const adminId = 1613186921; // Remplace avec ton ID Telegram

let postDraft = {}; // Stocke temporairement les posts en attente de confirmation

// 📌 Commande /admin pour ouvrir le menu admin
bot.onText(/\/admin/, async (msg) => {
    if (msg.from.id !== adminId) return; // Vérifie si c'est l'admin

    const keyboard = {
        inline_keyboard: [
            [{ text: '📊 Nombre total d\'utilisateurs', callback_data: 'stats_total' }],
            [{ text: '📅 Utilisateurs ce mois-ci', callback_data: 'stats_month' }],
            [{ text: '📝 Envoyer un post', callback_data: 'send_post' }]
        ]
    };

    bot.sendMessage(adminId, "🔧 *Panneau d'administration*", {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
});

// 📊 Gestion des stats
bot.on('callback_query', async (query) => {
    const data = query.data;

    if (data === 'stats_total') {
        const totalUsers = await client.db(dbName).collection(collectionName).countDocuments();
        bot.sendMessage(adminId, `📊 Nombre total d'utilisateurs : *${totalUsers}*`, { parse_mode: 'Markdown' });
    } 

    else if (data === 'stats_month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthUsers = await client.db(dbName).collection(collectionName).countDocuments({
            timestamp: { $gte: startOfMonth }
        });

        bot.sendMessage(adminId, `📅 Nombre d'inscriptions ce mois-ci : *${monthUsers}*`, { parse_mode: 'Markdown' });
    } 

    else if (data === 'send_post') {
        bot.sendMessage(adminId, "📝 *Envoie-moi ton message* (texte, image, vidéo, etc.)", { parse_mode: 'Markdown' });
        postDraft[adminId] = { content: null }; // Prépare un espace pour l'admin
    }
});

// 📩 Stocker le message temporairement
bot.on('message', (msg) => {
    if (msg.from.id !== adminId) return;

    // Vérifie si l'admin est en train de créer un post
    if (postDraft[adminId] && !postDraft[adminId].content) {
        postDraft[adminId].content = msg;
        
        const keyboard = {
            inline_keyboard: [
                [{ text: '✅ Confirmer et envoyer', callback_data: 'confirm_post' }],
                [{ text: '❌ Annuler', callback_data: 'cancel_post' }]
            ]
        };

        bot.sendMessage(adminId, "📩 *Prévisualisation du post*\n\nConfirmer l'envoi ?", {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }
});

// ✅ Confirmation et envoi
bot.on('callback_query', async (query) => {
    if (query.data === 'confirm_post' && postDraft[adminId] && postDraft[adminId].content) {
        const post = postDraft[adminId].content;

        // Copie le message de l'admin et l'affiche dans le bot
        bot.copyMessage(adminId, adminId, post.message_id);

        bot.sendMessage(adminId, "✅ *Post envoyé avec succès !*", { parse_mode: 'Markdown' });
        delete postDraft[adminId]; // Supprime le brouillon après envoi
    } 

    else if (query.data === 'cancel_post') {
        bot.sendMessage(adminId, "❌ *Post annulé*", { parse_mode: 'Markdown' });
        delete postDraft[adminId]; // Supprime le brouillon
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
