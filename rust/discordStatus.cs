using Newtonsoft.Json;
using Oxide.Core.Libraries;
using System;
using System.Collections.Generic;

namespace Oxide.Plugins {
    [Info("DiscordStatus", "TinTin", "1.0.0")]
    [Description("Shows server status.")]
    class DiscordStatus : RustPlugin {
        private string apiURL = "https://wsc.weareaxora.com/serverStatus";
        private ServerStatus serverStatus = new ServerStatus();
        private Timer updateTimer;

        private class ServerStatus {
            [JsonProperty("players")]
            public int Players { get; set; }
            [JsonProperty("maxPlayers")]
            public int MaxPlayers { get; set; }
            [JsonProperty("queue")]
            public int Queue { get; set; }
        }

        private void serverData() {
            int playersOnline = BasePlayer.activePlayerList.Count;
            int maxPlayers = ConVar.Server.maxplayers;
            int queue = GetQueueCount();

            serverStatus.Players = playersOnline;
            serverStatus.MaxPlayers = maxPlayers;
            serverStatus.Queue = queue;
        }

        private int GetQueueCount() {
            return ServerMgr.Instance.connectionQueue.Queued;
        }

        private void updateAPI() {
            string json = JsonConvert.SerializeObject(serverStatus);
            webrequest.Enqueue(apiURL, json, (code, response) => {
                // dropaj errore ako je node server down :D
            }, this, RequestMethod.POST, new Dictionary<string, string> { { "Content-Type", "application/json" } });
        }

        private void OnServerInitialized() {
            serverData();
            updateAPI();
            updateTimer = timer.Every(15f, () => {
                serverData();
                updateAPI();
            });
        }

        private void Unload() {
            if (updateTimer != null) {
                updateTimer.Destroy();
            }
        }
    }
}
