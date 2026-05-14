using Newtonsoft.Json;
using Oxide.Core;
using Oxide.Core.Libraries;
using System.Collections.Generic;

namespace Oxide.Plugins {
    [Info("RustOverlay", "TinTin", "1.0.0")]
    public class RustOverlay : RustPlugin {
        private string serverUrl = "https://weareaxora.com/update";

        class PlayerData {
            [JsonProperty("name")]
            public string Name { get; set; }
            [JsonProperty("steamid")]
            public string SteamId { get; set; }
            [JsonProperty("health")]
            public int Health { get; set; }
            [JsonProperty("maxHealth")]
            public int MaxHealth { get; set; }
            [JsonProperty("isWounded")]
            public bool IsWounded { get; set; }
            [JsonProperty("isDead")]
            public bool IsDead { get; set; }
            [JsonProperty("weapon")]
            public string Weapon { get; set; }
            [JsonProperty("ammo")]
            public string Ammo { get; set; }
        }

        class PayloadData {
            [JsonProperty("players")]
            public List<PlayerData> Players { get; set; }
        }

        private Timer sendTimer;

        void Init() {
            sendTimer = timer.Every(0.2f, SendData);
        }

        void Unload() {
            if (sendTimer != null) sendTimer.Destroy();
        }

        void SendData() {
            var payloadData = new PayloadData {
                Players = new List<PlayerData>()
            };

            foreach (var player in BasePlayer.activePlayerList) {
                string weaponName = "none";
                string ammo = "0/0";

                var activeItem = player.GetActiveItem();
                if (activeItem != null) {
                    weaponName = activeItem.info.shortname;
                    var weapon = activeItem.GetHeldEntity() as BaseProjectile;
                    if (weapon != null) { ammo = $"{weapon.primaryMagazine.contents}/{weapon.primaryMagazine.capacity}"; }
                }

                payloadData.Players.Add(new PlayerData {
                    Name = player.displayName,
                    SteamId = player.UserIDString,
                    Health = (int)player.health,
                    MaxHealth = (int)player.MaxHealth(),
                    IsWounded = player.IsWounded(),
                    IsDead = player.IsDead(),
                    Weapon = weaponName,
                    Ammo = ammo
                });
            }

            string json = JsonConvert.SerializeObject(payloadData);
            
            webrequest.Enqueue(serverUrl, json, (code, response) => {
                // dropaj errore ako je node server down :D
            }, this, RequestMethod.POST, new Dictionary<string, string> { { "Content-Type", "application/json" } });
        }
    }
}