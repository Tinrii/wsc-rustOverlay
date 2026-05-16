using Oxide.Core.Plugins;

namespace Oxide.Plugins {
    [Info("FreePhone", "TinTin", "1.0.0")]
    [Description("Allows every player to use /phone.")]
    public class FreePhone : RustPlugin {
        private const string ItemShortname = "mobilephone";
        private const int Amount = 1;

        [ChatCommand("phone")]
        private void PhoneCommand(BasePlayer player, string command, string[] args) {
            if (player == null) return;
            Item item = ItemManager.CreateByName(ItemShortname, Amount);

            if (item == null) {
                player.ChatMessage("Could not create phone.");
                return;
            }

            if (!player.inventory.GiveItem(item)) {
                item.Drop(player.transform.position, player.transform.forward);
                player.ChatMessage("Your inventory is full, so the phone was dropped.");
                return;
            }

            player.ChatMessage($"You received {Amount} phone.");
        }
    }
}