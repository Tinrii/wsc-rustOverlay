using System;

namespace Oxide.Plugins {
    [Info("Pop", "TinTin", "1.0.0")]
    [Description("Shows current player population with !pop and /pop commands.")]
    class Pop : RustPlugin {
        // /pop komanda
        [ChatCommand("pop")]
        private void PopCommand(BasePlayer player, string command, string[] args) {
            ShowPop(player);
        }

        // !pop komanda
        object OnPlayerChat(BasePlayer player, string message, ConVar.Chat.ChatChannel channel) {
            if (message.Trim().Equals("!pop", StringComparison.OrdinalIgnoreCase)) {
                ShowPop(player);
                return false; // da ne izbacuje poruku u global chat
            }
            return null;
        }

        private void ShowPop(BasePlayer player) {
            int online = BasePlayer.activePlayerList.Count;
            int max = ConVar.Server.maxplayers;
            SendReply(player, $"<size=14><color=#ffbf00>Players Online:</color> {online} / {max}</size>");
        }
    }
}