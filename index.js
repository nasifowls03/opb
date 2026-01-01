import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { connectDB } from './config/database.js';

// HTTP server removed — this runtime no longer starts an embedded web server.

const DISABLE_GATEWAY = !!(process.env.DISABLE_GATEWAY || process.env.INTERACTIONS_ONLY);

let client;
if (!DISABLE_GATEWAY) {
  client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

  client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
  });

  client.on('error', (err) => console.error('Client error:', err));

  if (!process.env.TOKEN) {
    console.error('TOKEN is missing in environment');
    process.exit(1);
  }

  // Call login exactly once.
  client.login(process.env.TOKEN).catch(err => {
    console.error('Failed to login:', err);
    process.exit(1);
  });
} else {
  console.log('DISABLE_GATEWAY is set — running in interactions-only (webhook) mode');
}

// Express-based HTTP server and Discord interactions webhook removed.
// If you need webhook handling later, restore the Express code and routes.
