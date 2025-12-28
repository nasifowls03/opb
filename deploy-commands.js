import { REST, Routes } from "discord.js";
import { config } from "dotenv";
import fs from "fs";

config();

const commands = [];
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  // Only include commands that expose a SlashCommandBuilder (has toJSON)
  if (command && command.data && typeof command.data.toJSON === "function") {
    commands.push(command.data.toJSON());
  } else {
    console.log(`Skipping non-slash command or missing data.toJSON: ${file}`);
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

const putWithRetries = async (route, body, attempts = 3) => {
  for (let i = 1; i <= attempts; i++) {
    try {
      console.log(`🌀 Registering slash commands (attempt ${i}/${attempts})...`);
      await rest.put(route, { body });
      console.log('✅ Successfully registered commands!');
      return;
    } catch (err) {
      // Check for a 429 response in the error body or message
      const msg = err && err.message ? err.message : String(err);
      console.error(`Attempt ${i} failed:`, msg);
      // Try to parse Retry-After from error if available
      let waitMs = 0;
      try {
        if (err && err.status === 429 && err.csv) {
          // unlikely shape; ignore
        }
        if (err && err.headers && err.headers['retry-after']) {
          const h = Number(err.headers['retry-after']);
          if (!Number.isNaN(h)) waitMs = Math.ceil(h * 1000);
        }
      } catch (e) {
        // ignore parse errors
      }
      if (i < attempts) {
        const backoff = Math.ceil(5000 * Math.pow(2, i - 1));
        const wait = Math.max(waitMs, backoff);
        console.log(`Waiting ${wait}ms before retrying command registration...`);
        await new Promise((res) => setTimeout(res, wait));
        continue;
      }
      throw err;
    }
  }
};

try {
  await putWithRetries(Routes.applicationCommands(process.env.CLIENT_ID), commands, 3);
} catch (error) {
  console.error('Failed to register slash commands after retries:', error && error.message ? error.message : error);
}
