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





// ⚙️ Variable globale pour gérer le brouillon du message
let postDraft = {};

// 💬 Commande /admin
bot.onText(/\/admin/, (msg) => {
    const adminId = msg.from.id;
    const adminUsername = msg.from.username;
    
    if (adminId === YOUR_ADMIN_ID) {  // Remplace "YOUR_ADMIN_ID" par l'ID de ton admin
        const adminMenu = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Envoyer un message à tous', callback_data: 'send_message_to_all' }],
                    [{ text: 'Voir les utilisateurs', callback_data: 'view_users_count' }]
                ]
            }
        };
        
        bot.sendMessage(adminId, "Bienvenue dans le menu d'administration ! Choisissez une action :", adminMenu);
    }
});

// 💬 Envoi d'un message à tous les utilisateurs
bot.on('callback_query', async (query) => {
    const adminId = query.from.id;

    // Vérification que l'utilisateur est bien l'admin
    if (adminId !== 1613186921) return;

    // Si l'admin veut envoyer un message à tous les utilisateurs
    if (query.data === 'send_message_to_all') {
        bot.sendMessage(adminId, "📢 Veuillez envoyer le message que vous souhaitez diffuser à tous les utilisateurs.");

        // Sauvegarder la commande pour créer un message
        postDraft[adminId] = {
            stage: 'waiting_for_message'
        };
    }

    // Affichage du nombre d'utilisateurs
    if (query.data === 'view_users_count') {
        const db = await connectDB();
        const users = await db.collection(collectionName).find().toArray();
        const userCount = users.length;

        bot.sendMessage(adminId, `👥 Nombre d'utilisateurs : ${userCount}`);
    }

    // Confirmation de l'envoi
    if (query.data === 'confirm_post' && postDraft[adminId] && postDraft[adminId].content) {
        const post = postDraft[adminId].content;

        const db = await connectDB();
        const users = await db.collection(collectionName).find().toArray();

        try {
            // Envoi à tous les utilisateurs en utilisant copyMessage
            for (let user of users) {
                const userId = user.user_id;

                // Utilisation de copyMessage pour envoyer le même message à tous
                await bot.copyMessage(userId, post.chat_id, post.message_id);

                console.log(`✅ Message envoyé à ${userId}`);
            }

            bot.sendMessage(adminId, "✅ *Message envoyé avec succès à tous les utilisateurs !*", { parse_mode: 'Markdown' });
            delete postDraft[adminId]; // Supprime le brouillon après l'envoi

        } catch (error) {
            console.error("❌ ERREUR lors de l'envoi du post:", error);
            bot.sendMessage(adminId, "❌ Échec de l'envoi du post.");
        }
    }

    // Annuler l'envoi
    if (query.data === 'cancel_post') {
        bot.sendMessage(adminId, "❌ *Post annulé*", { parse_mode: 'Markdown' });
        delete postDraft[adminId]; // Supprime le brouillon
    }
});

// Lorsque l'admin envoie un message texte
bot.on('message', (msg) => {
    const adminId = msg.from.id;

    if (postDraft[adminId] && postDraft[adminId].stage === 'waiting_for_message') {
        const { message_id, chat, text } = msg;

        // Sauvegarder le message dans le brouillon
        postDraft[adminId].content = { 
            chat_id: chat.id,
            message_id: message_id
        };
        postDraft[adminId].stage = 'confirmed';

        bot.sendMessage(adminId, "✅ *Message enregistré !* Vous pouvez maintenant confirmer l'envoi à tous les utilisateurs.", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Confirmer l\'envoi', callback_data: 'confirm_post' }],
                    [{ text: 'Annuler', callback_data: 'cancel_post' }]
                ]
            }
        });
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
