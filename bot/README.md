# Binance Trading Bot

Un **bot de trading automatisé** conçu pour exécuter des ordres d'achat et de vente sur **Binance**, en utilisant des indicateurs techniques tels que le RSI, les bandes de Bollinger, Ichimoku, etc. Le bot prend en charge les notifications via **Telegram** et **Discord**, avec une architecture modulaire pour une personnalisation et une extensibilité simplifiées.

---

## Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Structure du projet](#structure-du-projet)
- [Détails techniques](#détails-techniques)
- [Dépannage](#dépannage)
- [Avertissement](#avertissement)
- [Licence](#licence)

---

## Fonctionnalités

- **Analyse multi-timeframe** : Analyse des intervalles de temps (1m, 3m, 5m, etc.) pour identifier les signaux.
- **Indicateurs techniques** :
  - RSI, MACD, Ichimoku, bandes de Bollinger, ATR, Fibonacci, EMA, OBV, et ADX.
- **Exécution d'ordres** : Prend en charge les ordres au marché et OCO (One-Cancels-Other).
- **Notifications intégrées** :
  - **Telegram** : Notifications pour les événements de trading et erreurs.
  - **Discord** : Notifications similaires via un bot Discord.
- **Architecture extensible** : Ajoutez facilement de nouveaux outils de communication ou fonctionnalités.
- **Gestion du cache** : Utilisation de Redis pour optimiser les performances.
- **Personnalisation facile** : Configuration dynamique via des arguments CLI.

---

## Prérequis

- **Node.js** (version 16 ou plus récente)
- **Binance API Key** avec autorisations de lecture et trading.
- Compte Telegram et/ou Discord pour configurer les notifications.

---

## Installation

1. **Cloner le dépôt** :
   ```bash
   git clone <repository-url>
   cd <folder-name>
   ```
2. **Installer les dépendances** :
   ```bash
   npm install
   ```

---

## Configuration

1. **Créer un fichier `.env`** dans le répertoire racine du projet.
   ```bash
   BINANCE_API_KEY=your_binance_api_key
   BINANCE_API_SECRET=your_binance_api_secret
   TELEGRAM_TOKEN=your_telegram_bot_token
   TELEGRAM_CHAT_ID=your_telegram_chat_id
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_CHANNELS=your_discord_channel_ids_comma_separated
   AMOUNT_TO_SPEND=amount_to_spend_per_trade
   REDIS_URL=redis_connection_url
   ```
2. **Configurer Binance API**:
   - Créez une clé API via la section "API Management" de votre compte Binance.
   - Activez les permissions lecture et trading.
3. **Configurer Telegram** (optionnel) :
   - Créez un bot Telegram via **BotFather**.
   - Ajoutez le token du bot et l'ID du chat dans le fichier `.env`.
4. **Configurer Discord** (optionnel) :
   - Créez une application Discord et générez un token bot.
   - Ajoutez le bot à votre serveur et spécifiez les IDs de canaux dans `DISCORD_CHANNELS`.

---

## Utilisation

### Démarrer le bot avec Docker compose

1. **Lancer le service** :
   ```bash
   docker-compose --env-file .env up --build -d
   ```
2. **Vérifier l'état du service** :
   ```bash
   docker-compose ps
   ```
3. **Vérifier les logs** :
   ```bash
   docker-compose logs -f
   ```
4. **Arrêter le service** :
   ```bash
   docker-compose down
   ```

### Options CLI (mode local sans Docker)
Pour exécuter en local, utilisez les commandes suivantes :
1. **Lancer le bot avec les options CLI** :
   ```bash
   npm start -- --telegram --interval 60
   ```
   - `--telegram` : Activer les notifications Telegram.
   - `--discord` : Activer les notifications Discord.
   - `--interval` : Intervalle de temps en secondes pour les analyses (par défaut : 30s).
2. **Mode développement avec Nodemon** :
   ```bash
   npm run dev -- --telegram --interval 60
   ```

## Structure du projet

```
.
├── src
│   ├── modules
│   │   ├── communication
│   │   │   ├── Telegram.ts      # Gestion des notifications Telegram
│   │   │   ├── Discord.ts       # Gestion des notifications Discord
│   │   │   ├── CommunicationTool.ts  # Interface pour les outils de communication
│   │   ├── trade
│   │   │   ├── Binance.ts       # Logique principale du bot de trading
│   ├── utils
│   │   ├── constants.ts         # Liste des paires de trading
│   │   ├── cache.ts             # Gestion du cache avec Redis
│   │   ├── type.ts              # Définition des types et interfaces
│   ├── algo
│   │   ├── MultiTimestamp.ts    # Algorithmes d'analyse multi-timeframe
│   │   ├── indicators
│   │   │   ├── TechnicalIndicators.ts # Calcul des indicateurs techniques
│   ├── config
│   │   ├── redis.ts             # Configuration de Redis
├── .env                         # Variables d'environnement
├── docker-compose.yml           # Configuration Docker Compose
├── Dockerfile                   # Fichier Docker pour le bot
├── package.json                 # Fichier de configuration du projet
├── README.md                    # Documentation du projet
```

---

## Détails techniques

### Architecture technique

1. **Modules de communication** :
   - Les classes `Telegram` et `Discord` gèrent les interactions avec leurs plateformes respectives.
   - Implémentation modulaire via l'interface `CommunicationTool`.
2. **Module de trading** :
   - La classe `TradingBot` intègre les API Binance pour analyser les paires et exécuter des ordres.
   - Prise en charge des ordres OCO avec gestion dynamique des niveaux de profit.
3. **Gestion du cache** :
   - Utilisation de Redis pour stocker les données de trading et optimiser les performances.
   - Configuration via le fichier `config/redis.ts`.
4. **Indicateurs techniques** :
   - Implémentation de RSI, MACD, bandes de Bollinger, Fibonacci, Ichimoku, etc.

---

## Dépannage

1. **Erreur : "Insufficient Balance"**
   - Vérifiez que votre compte Binance dispose de fonds suffisants.
2. **Erreur : "Too Much Precision"**
   - Assurez-vous que les ordres respectent la précision des lots (``stepSize``) définie par Binance.
3. **No signal for...**
   - Cela signifie qu'aucun signal d'achat ou de vente n'a été détecté. C'est normal si les conditions du marché ne correspondent pas aux critères du bot.
4. **Redis connection error**
   - Vérifiez que Redis est correctement configuré et accessible depuis le bot.

---

## Avertissement

Ce bot est fourni à des fins éducatives. Le trading de cryptomonnaies comporte des risques. Utilisez ce projet à vos propres risques et ne tradez que ce que vous êtes prêt à perdre.

---

## Licence

Ce projet est sous licence **GNU General Public License v3.0**. Vous pouvez redistribuer, modifier et utiliser ce logiciel selon les termes de cette licence.

Pour plus d'informations, consultez le fichier `LICENSE` ou visitez [GNU GPL v3.0](https://www.gnu.org/licenses/gpl-3.0.html).
