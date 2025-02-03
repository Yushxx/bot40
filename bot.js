const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');
const http = require('http');

// Configuration MongoDB
const mongoUri = 'mongodb+srv://josh:JcipLjQSbhxbruLU@cluster0.hn4lm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // À modifier
const dbName = 'telegramBotDB';
const collectionName = 'usersVF';

// Configuration Telegram
const token = '7914191446:AAHavIOWX1CFWFab9MaKqyj0UWFzYyqWpvE';
const channelId = '-1002402408788';

// Initialisation des composants
const bot = new TelegramBot(token, { polling: true });
const client = new MongoClient(mongoUri);

// Connexion à MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log('Connecté à MongoDB avec succès');
    return client.db(dbName);
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
}

// Fonction améliorée d'envoi de message
async function sendWelcomeMessage(userId, userName) {
  try {
    const videoUrl = 'https://t.me/morxmorcash/19';
    const message = `${userName}, félicitations\\! Vous êtes sur le point de rejoindre un groupe d'élite...`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: 'Canal 1🤑', url: 'https://t.me/+r51NVBAziak5NzZk' },
          { text: 'Canal 2🤑', url: 'https://t.me/+sL_NSnUaTugyODlk' },
        ],
        [
          { text: 'Canal 3✅️', url: 'https://t.me/+5kl4Nte1HS5lOGZk' },
          { text: 'Canal 4✅️', url: 'https://t.me/+tKWRcyrKwh9jMzA8' },
        ],
        [
          { text: 'Join le bot 🤑', url: 'https://t.me/Applepffortunebothack_bot' },
        ]
      ]
    };

    // Vérification avant envoi
    if (!userId || !userName) {
      throw new Error('Données utilisateur manquantes');
    }

    const sentMessage = await bot.sendVideo(userId, videoUrl, {
      caption: message,
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard
    });

    console.log(`Message envoyé à ${userName} (ID: ${userId}) à ${new Date().toISOString()}`);
    return sentMessage;

  } catch (error) {
    console.error(`Échec d'envoi à ${userName}:`, error.response?.body || error.message);
    // Réessayer une fois après 2 secondes
    if (error.response?.body?.error_code === 429) {
      console.log(`Nouvelle tentative pour ${userName}...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return sendWelcomeMessage(userId, userName);
    }
  }
}

// Structure principale
(async () => {
  const db = await connectDB();

  bot.on('chat_join_request', async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id;
    const userName = msg.from.first_name || msg.from.username || 'Inconnu';

    if (chatId === channelId) {
      console.log(`Nouvelle demande de ${userName} (${userId}) à ${new Date().toISOString()}`);

      // Envoi du message avec gestion d'erreur
      setTimeout(async () => {
        try {
          await sendWelcomeMessage(userId, userName);
        } catch (error) {
          console.error(`Échec critique d'envoi à ${userName}:`, error);
        }
      }, 5000); // 5 secondes

      // Approbation après 10 minutes
      setTimeout(async () => {
        try {
          await bot.approveChatJoinRequest(chatId, userId);
          console.log(`Utilisateur ${userName} approuvé`);

          await db.collection(collectionName).insertOne({
            user_id: userId,
            chat_id: chatId,
            username: userName,
            timestamp: new Date(),
            status: 'approved'
          });

        } catch (error) {
          console.error('Erreur lors de l\'approbation:', error);
        }
      }, 600000); // 10 minutes
    }
  });

  // Serveur keep-alive
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot en ligne');
  }).listen(8080, () => {
    console.log('Serveur keep-alive actif sur port 8080');
  });

})();
