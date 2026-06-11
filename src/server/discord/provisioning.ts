import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  OverwriteType,
  PermissionFlagsBits,
  type Guild,
  type GuildBasedChannel,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import { env } from "@/env";
import { formatMoney } from "@/lib/money";
import {
  setBookingDiscordVoiceChannel,
  type BookingDiscordInfo,
} from "@/server/db/repos/bookings";
import { getDiscordClient } from "./client";

/** customId prefix for the "add client to channel" button. */
export const ADD_CLIENT_BUTTON_PREFIX = "cp:addclient:";

const VOLT = 0xc9f73a; // brand accent for embeds

async function getGuild(): Promise<Guild> {
  if (!env.DISCORD_GUILD_ID) {
    throw new Error("DISCORD_GUILD_ID is not set.");
  }
  const client = await getDiscordClient();
  // Cache first: the gateway copy is fully hydrated (roles, @everyone),
  // unlike REST-fetched guilds in discord.js 14.26.
  const cached = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (cached) return cached;
  const guild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
  if (!guild.name) {
    throw new Error(
      `Guild ${env.DISCORD_GUILD_ID} not in bot cache — is the bot actually a member of that server?`,
    );
  }
  return guild;
}

function shortId(bookingId: string): string {
  return bookingId.replace(/-/g, "").slice(0, 8);
}

function mention(discordId: string | null, fallback: string | null): string {
  return discordId ? `<@${discordId}>` : (fallback ?? "them");
}

/** Discord-native timestamps render in each viewer's local timezone. */
function when(booking: BookingDiscordInfo): string {
  const start = Math.floor(booking.startAt.getTime() / 1000);
  const end = Math.floor(booking.endAt.getTime() / 1000);
  return `<t:${start}:F> → <t:${end}:t> (<t:${start}:R>)`;
}

function bookingEmbed(booking: BookingDiscordInfo): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(VOLT)
    .setTitle("🎮 New session booked")
    .addFields(
      { name: "Service", value: booking.serviceTitle, inline: true },
      {
        name: "Price",
        value: formatMoney(booking.price, booking.currency),
        inline: true,
      },
      { name: "Client", value: booking.clientName ?? "Unknown", inline: true },
      { name: "When", value: when(booking) },
    )
    .setFooter({ text: `Booking ${shortId(booking.id)}` });
}

/** Overwrites for a private session channel: invisible to everyone, full
 * access for the bot, and view/chat for each present participant.
 *
 * Discord only lets you grant overwrite permissions you hold yourself, so
 * everything is filtered to the bot's own guild permissions — an under-scoped
 * bot invite degrades gracefully (e.g. no AttachFiles) instead of erroring. */
async function sessionOverwrites(
  guild: Guild,
  participantIds: (string | null)[],
  voice: boolean,
) {
  const botPerms = (await guild.members.fetchMe()).permissions;
  const held = (flags: bigint[]) => flags.filter((f) => botPerms.has(f));

  const participantAllow = held(
    voice
      ? [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
        ]
      : [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
  );
  return [
    {
      id: guild.roles.everyone.id,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: guild.client.user.id,
      type: OverwriteType.Member,
      // No ManageRoles here: Discord only allows it inside an overwrite when
      // the setter has Administrator (verified: instant 50013 otherwise). The
      // bot's guild-level ManageRoles already covers overwrite management.
      allow: held([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.CreateInstantInvite,
        ...(voice ? [PermissionFlagsBits.Connect] : []),
      ]),
    },
    // Raw snowflakes need an explicit type — discord.js can't infer
    // member-vs-role for users it hasn't cached (e.g. not in the guild yet).
    ...participantIds
      .filter((id): id is string => Boolean(id))
      .map((id) => ({
        id,
        type: OverwriteType.Member,
        allow: participantAllow,
      })),
  ];
}

/**
 * Create the private session text channel (coach-only at first), post the
 * booking briefing with the "add client" button, and return the channel id.
 */
export async function provisionSessionChannel(
  booking: BookingDiscordInfo,
): Promise<{ channelId: string }> {
  const guild = await getGuild();

  const channel = await guild.channels.create({
    name: `session-${shortId(booking.id)}`,
    type: ChannelType.GuildText,
    parent: env.DISCORD_SESSIONS_CATEGORY_ID ?? null,
    reason: `Coaching session ${booking.id}`,
    permissionOverwrites: await sessionOverwrites(
      guild,
      [booking.coachDiscordId],
      false,
    ),
  });

  const addClientButton = new ButtonBuilder()
    .setCustomId(`${ADD_CLIENT_BUTTON_PREFIX}${booking.id}`)
    .setLabel(`Add ${booking.clientName ?? "the client"} to this channel`)
    .setEmoji("👋")
    .setStyle(ButtonStyle.Primary);

  await channel.send({
    content: booking.coachDiscordId
      ? `<@${booking.coachDiscordId}> you have a new booking! 🎉`
      : "New booking! 🎉",
    embeds: [
      bookingEmbed(booking).setDescription(
        "This is your private session channel — only you can see it right " +
          "now. Want to say hi or plan ahead? Hit the button below to let " +
          `**${booking.clientName ?? "the client"}** in early. Either way, ` +
          "they'll be added automatically when the session starts.",
      ),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(addClientButton),
    ],
  });

  return { channelId: channel.id };
}

async function fetchSessionChannel(
  guild: Guild,
  channelId: string | null,
): Promise<TextChannel | null> {
  if (!channelId) return null;
  const channel: GuildBasedChannel | null = await guild.channels
    .fetch(channelId)
    .catch(() => null);
  return channel?.type === ChannelType.GuildText
    ? (channel as TextChannel)
    : null;
}

export type AddClientResult =
  | { status: "added" }
  | { status: "already" }
  | { status: "pendingJoin"; inviteUrl?: string }
  | { status: "error"; reason: string };

/**
 * Grant the client access to the session channels. Discord SILENTLY DROPS
 * permission overwrites for users who aren't guild members (verified — on
 * create and edit alike), so access can't be pre-staged: if the client hasn't
 * joined the guild we return an invite instead, and a later call (button
 * re-press or session start) grants the overwrites once they're in.
 */
export async function addClientToSessionChannel(
  booking: BookingDiscordInfo,
  opts: { announce: boolean },
): Promise<AddClientResult> {
  if (!booking.clientDiscordId) {
    return {
      status: "error",
      reason: "The client has no linked Discord account yet.",
    };
  }
  const guild = await getGuild();
  const channel = await fetchSessionChannel(guild, booking.discordChannelId);
  if (!channel) {
    return { status: "error", reason: "The session channel no longer exists." };
  }

  const member = await guild.members
    .fetch(booking.clientDiscordId)
    .catch(() => null);
  if (!member) {
    // Not in the guild — mint an invite the coach can pass along.
    const secondsUntilEnd = Math.max(
      3600,
      Math.floor((booking.endAt.getTime() - Date.now()) / 1000),
    );
    const invite = await channel
      .createInvite({
        maxAge: Math.min(secondsUntilEnd, 7 * 24 * 3600),
        maxUses: 0,
        unique: true,
        reason: `Session invite for booking ${booking.id}`,
      })
      .catch(() => null);
    return { status: "pendingJoin", inviteUrl: invite?.url };
  }

  // Grant only permissions the bot itself holds (Discord rejects the rest).
  const botPerms = (await guild.members.fetchMe()).permissions;
  const held = (
    entries: readonly (readonly [string, bigint])[],
  ): Record<string, boolean> =>
    Object.fromEntries(
      entries.filter(([, flag]) => botPerms.has(flag)).map(([n]) => [n, true]),
    );

  const alreadyAdded = channel.permissionOverwrites.cache.has(member.id);
  if (!alreadyAdded) {
    await channel.permissionOverwrites.create(
      member,
      held([
        ["ViewChannel", PermissionFlagsBits.ViewChannel],
        ["SendMessages", PermissionFlagsBits.SendMessages],
        ["ReadMessageHistory", PermissionFlagsBits.ReadMessageHistory],
        ["AttachFiles", PermissionFlagsBits.AttachFiles],
        ["EmbedLinks", PermissionFlagsBits.EmbedLinks],
      ] as const),
    );
  }

  // If the session voice channel already exists (late join after kickoff),
  // make sure they can get into that too.
  if (booking.discordVoiceChannelId) {
    const voice = await guild.channels
      .fetch(booking.discordVoiceChannelId)
      .catch(() => null);
    if (
      voice?.type === ChannelType.GuildVoice &&
      !voice.permissionOverwrites.cache.has(member.id)
    ) {
      await voice.permissionOverwrites.create(
        member,
        held([
          ["ViewChannel", PermissionFlagsBits.ViewChannel],
          ["Connect", PermissionFlagsBits.Connect],
          ["Speak", PermissionFlagsBits.Speak],
          ["Stream", PermissionFlagsBits.Stream],
        ] as const),
      );
    }
  }

  if (opts.announce && !alreadyAdded) {
    await channel.send({
      content:
        `👋 Welcome ${mention(booking.clientDiscordId, booking.clientName)}! ` +
        `${mention(booking.coachDiscordId, booking.coachName)} opened this ` +
        `channel up early so you two can talk before your ` +
        `**${booking.serviceTitle}** session. It kicks off <t:${Math.floor(
          booking.startAt.getTime() / 1000,
        )}:R>.`,
    });
  }

  return { status: alreadyAdded ? "already" : "added" };
}

/**
 * Session kickoff: make sure the client can see the text channel, create the
 * private voice channel, and ping both participants with the join link.
 */
export async function startSession(booking: BookingDiscordInfo): Promise<void> {
  const guild = await getGuild();
  const channel = await fetchSessionChannel(guild, booking.discordChannelId);
  if (!channel) {
    throw new Error(`Session channel missing for booking ${booking.id}.`);
  }

  // Let the client in (no announcement — the kickoff message covers it).
  // If they haven't joined the guild, this yields an invite to relay instead.
  const added = await addClientToSessionChannel(booking, { announce: false });

  // Voice channel, visible only to the two of them (+ bot). Idempotent: reuse
  // a previously created one if the job retries.
  let voice: VoiceChannel | null = null;
  if (booking.discordVoiceChannelId) {
    const existing = await guild.channels
      .fetch(booking.discordVoiceChannelId)
      .catch(() => null);
    if (existing?.type === ChannelType.GuildVoice) {
      voice = existing as VoiceChannel;
    }
  }
  if (!voice) {
    voice = await guild.channels.create({
      name: `🎙 session-${shortId(booking.id)}`,
      type: ChannelType.GuildVoice,
      parent: env.DISCORD_SESSIONS_CATEGORY_ID ?? null,
      reason: `Voice for coaching session ${booking.id}`,
      permissionOverwrites: await sessionOverwrites(
        guild,
        [booking.coachDiscordId, booking.clientDiscordId],
        true,
      ),
    });
    await setBookingDiscordVoiceChannel(booking.id, voice.id);
  }

  const mentions = [
    mention(booking.coachDiscordId, booking.coachName),
    mention(booking.clientDiscordId, booking.clientName),
  ].join(" ");

  await channel.send({
    content: `🔔 ${mentions} — your **${booking.serviceTitle}** session is starting now!`,
    embeds: [
      new EmbedBuilder()
        .setColor(VOLT)
        .setTitle("🎙 Voice channel is open")
        .setDescription(
          `Hop in: <#${voice.id}>\n\n` +
            `Only the two of you can see it. It closes a while after the ` +
            `session ends (<t:${Math.floor(booking.endAt.getTime() / 1000)}:t>).` +
            (added.status === "pendingJoin"
              ? `\n\n⚠️ ${booking.clientName ?? "The client"} hasn't joined ` +
                `this server yet — once they have, hit the button on the ` +
                `booking message and I'll let them into both channels.` +
                (added.inviteUrl
                  ? `\nInvite to send them: ${added.inviteUrl}`
                  : "")
              : ""),
        )
        .setFooter({ text: `Booking ${shortId(booking.id)}` }),
    ],
  });
}

/** Delete both session channels outright (admin demo reset). */
export async function deleteSessionChannels(
  booking: BookingDiscordInfo,
): Promise<void> {
  const guild = await getGuild();
  for (const id of [booking.discordVoiceChannelId, booking.discordChannelId]) {
    if (!id) continue;
    const channel = await guild.channels.fetch(id).catch(() => null);
    await channel?.delete(`Demo reset for booking ${booking.id}`).catch(() => {
      /* already gone / not deletable — fine for a demo teardown */
    });
  }
}

/**
 * Post-session cleanup: delete the voice channel. Returns `retry` if someone
 * is still connected so the caller can reschedule (with an eventual hard cap).
 */
export async function cleanupSessionVoice(
  booking: BookingDiscordInfo,
  opts: { force: boolean },
): Promise<"done" | "retry"> {
  if (!booking.discordVoiceChannelId) return "done";
  const guild = await getGuild();
  const channel = await guild.channels
    .fetch(booking.discordVoiceChannelId)
    .catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildVoice) {
    await setBookingDiscordVoiceChannel(booking.id, null);
    return "done";
  }
  const voice = channel as VoiceChannel;
  if (voice.members.size > 0 && !opts.force) return "retry";

  await voice.delete(`Session ${booking.id} ended`);
  await setBookingDiscordVoiceChannel(booking.id, null);

  const text = await fetchSessionChannel(guild, booking.discordChannelId);
  await text?.send(
    "🧹 Session wrapped — the voice channel is closed. " +
      "This text channel stays open for follow-ups and homework. GLHF! ⚡",
  );
  return "done";
}
