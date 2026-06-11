import {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
  type ButtonInteraction,
  type Interaction,
} from "discord.js";
import { getBookingDiscordInfo } from "@/server/db/repos/bookings";
import {
  ADD_CLIENT_BUTTON_PREFIX,
  addClientToSessionChannel,
} from "./provisioning";

/**
 * Gateway interaction dispatch. Wired once per Discord client in
 * `startDiscordBot()`. Currently just the "add client to channel" button on
 * the booking briefing message.
 */
export async function handleInteraction(
  interaction: Interaction,
): Promise<void> {
  if (!interaction.isButton()) return;
  if (interaction.customId.startsWith(ADD_CLIENT_BUTTON_PREFIX)) {
    await handleAddClientButton(interaction);
  }
}

async function handleAddClientButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const bookingId = interaction.customId.slice(ADD_CLIENT_BUTTON_PREFIX.length);
  const booking = await getBookingDiscordInfo(bookingId);

  if (!booking) {
    await interaction.reply({
      content: "Hmm, I can't find that booking anymore.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Only the session's coach may open the channel up early.
  if (
    !booking.coachDiscordId ||
    interaction.user.id !== booking.coachDiscordId
  ) {
    await interaction.reply({
      content: "Only the coach for this session can use this button.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (booking.status === "cancelled" || booking.status === "refunded") {
    await interaction.reply({
      content: `This booking is ${booking.status} — not adding the client.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const result = await addClientToSessionChannel(booking, { announce: true });

  if (result.status === "error") {
    await interaction.reply({
      content: `Couldn't add them: ${result.reason}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (result.status === "pendingJoin") {
    // Can't grant access until they're a guild member (Discord silently
    // drops overwrites for non-members) — leave the button active so the
    // coach can press it again once they've joined.
    await interaction.reply({
      content:
        `${booking.clientName ?? "The client"} isn't in this server yet, so ` +
        `I can't open the channel for them. ` +
        (result.inviteUrl
          ? `Send them this invite, then hit the button again once they've ` +
            `joined: ${result.inviteUrl}`
          : `Get them to join the server, then hit the button again.`),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Swap the button for a disabled "added" state on the original message.
  const doneButton = new ButtonBuilder()
    .setCustomId(`${ADD_CLIENT_BUTTON_PREFIX}done:${bookingId}`)
    .setLabel(`${booking.clientName ?? "Client"} has access`)
    .setEmoji("✅")
    .setStyle(ButtonStyle.Success)
    .setDisabled(true);
  await interaction.update({
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(doneButton),
    ],
  });

  if (result.status === "already") {
    await interaction.followUp({
      content: "They already had access — you're all set.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
