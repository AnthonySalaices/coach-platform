import { Client, GatewayIntentBits } from "discord.js";
import { env } from "@/env";

/**
 * Lazy Discord bot client. STUB phase: the bot is NOT started anywhere yet —
 * `getDiscordClient()` only logs in on first call, and the only callers
 * (provisioning) are themselves stubs. This keeps discord.js out of the hot
 * path until provisioning is actually implemented.
 */
let clientPromise: Promise<Client> | null = null;

export function isDiscordConfigured(): boolean {
  return Boolean(env.DISCORD_BOT_TOKEN && env.DISCORD_GUILD_ID);
}

export function getDiscordClient(): Promise<Client> {
  if (!env.DISCORD_BOT_TOKEN) {
    throw new Error(
      "DISCORD_BOT_TOKEN is not set — Discord provisioning is disabled.",
    );
  }
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new Client({ intents: [GatewayIntentBits.Guilds] });
      await client.login(env.DISCORD_BOT_TOKEN);
      return client;
    })();
  }
  return clientPromise;
}
