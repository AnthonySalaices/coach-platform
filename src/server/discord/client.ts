import { Client, Events, GatewayIntentBits } from "discord.js";
import { env } from "@/env";

/**
 * Lazy Discord bot client: `getDiscordClient()` logs in on first call.
 * `startDiscordBot()` (instrumentation.ts) calls it eagerly at boot when
 * configured so button interactions work even before any job has run.
 * Interaction handling is wired here, exactly once per client.
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

      client.on(Events.InteractionCreate, (interaction) => {
        // Lazy import avoids a module cycle (interactions → provisioning →
        // this file) at load time.
        import("./interactions")
          .then(({ handleInteraction }) => handleInteraction(interaction))
          .catch((err) =>
            console.error("[discord] interaction handler error:", err),
          );
      });
      client.on(Events.Error, (err) =>
        console.error("[discord] client error:", err),
      );

      await client.login(env.DISCORD_BOT_TOKEN);
      console.log(`[discord] bot logged in as ${client.user?.tag}`);
      return client;
    })();
  }
  return clientPromise;
}

/** Boot-time eager start; no-op when the bot isn't configured. */
export async function startDiscordBot(): Promise<void> {
  if (!isDiscordConfigured()) return;
  try {
    await getDiscordClient();
  } catch (err) {
    console.error("[discord] bot failed to start:", err);
    clientPromise = null; // allow a later retry via getDiscordClient()
  }
}
