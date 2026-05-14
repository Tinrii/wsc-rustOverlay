# Rust Team Stream Overlay

A high-performance, real-time stream overlay designed for Rust tournaments or team streams. It extracts live player statistics (health, weapon, ammo, and status like KNOCKED/DEAD) directly from the Rust server and displays them in a sleek, customizable HUD via an OBS browser source.

Features a backend Node.js server that links player Steam IDs to Discord IDs to automatically display high-quality Discord avatars in the HUD.

---

## 🌟 Features

*   **Real-Time Syncing**: Rust server sends updates 5 times a second (0.2s interval) via an optimized Oxide plugin, resulting in instant UI updates with practically zero server lag.
*   **Discord Integration**: Automatically fetches and caches Discord avatars for each player based on their Discord ID.
*   **Multi-Team Support**: Display a single team (`/team-name`) or dual-team versus mode (`/team1/team2`) for casting.
*   **Dynamic States**: Visually displays offline players (grayed out) and handles live player states (`KNOCKED`, `DEAD`).
*   **Missing Weapon Fallback**: Automatically detects missing weapon images from the Facepunch CDN and logs them to a dedicated Discord channel for admins to review.
*   **Responsive OBS Design**: UI is built using robust CSS constraints so you can freely resize the browser source in OBS without squishing the interface.

---

## 🛠️ Components

The project consists of three main parts:
1.  **Oxide Plugin (`rust/RustOverlay.cs`)**: Runs on your Rust server. Gathers active player data and sends it to the Node server via an HTTP POST request.
2.  **Node.js Server (`website/server.js`)**: The central brain. Receives data from Rust, matches it against configured teams, fetches Discord avatars, and broadcasts updates via WebSockets.
3.  **Frontend (`website/public/`)**: The actual web interface loaded into OBS as a Browser Source.

---

## 🚀 Installation & Setup

### 1. Node.js Backend Setup

1. Navigate to the `website` directory:
   ```bash
   cd website
   ```
2. Install the necessary dependencies:
   ```bash
   npm install express socket.io dotenv node-fetch
   ```
3. Create a `.env` file in the `website` directory and add your Discord Bot Token (needed to fetch avatars):
   ```env
   DISCORD_BOT_TOKEN=your_discord_bot_token_here
   ```
4. Start the server:
   ```bash
   npm start
   ```
   *(The server runs on port `3696` by default. You can change this at the bottom of `server.js` if needed.)*

### 2. Rust Server Setup

1. Place the `RustOverlay.cs` file into your Rust server's `oxide/plugins/` directory.
2. Open `RustOverlay.cs` and edit the `serverUrl` string at the top of the file to point to your hosted Node.js server:
   ```csharp
   private string serverUrl = "https://your-domain.com/update"; 
   // Or "http://ip-address:port/update" if not using a domain
   ```
3. Reload the plugin in the Rust console:
   ```bash
   oxide.reload RustOverlay
   ```

---

## ⚙️ Configuration (`players.json`)

All team structures and player mappings are handled in `website/players.json`.
The format MUST follow this structure:

```json
{
    "team_name_in_url": [
        {
            "name": "Player Display Name",
            "steamid": "76561198...",
            "discordid": "123456789..."
        }
    ]
}
```
*   **`steamid`**: Used to match the player with the incoming data from the Rust server.
*   **`discordid`**: (Optional) Used to fetch their avatar. If empty (`""`), a default placeholder is used.

---

## 📺 OBS Browser Source Usage

Add a **Browser Source** in OBS and set the URL to your Node server.

**To display a single team (Left Aligned):**
> `http://localhost:3696/nugato`

**To display a VS matchup (Left and Right Aligned):**
> `http://localhost:3696/marijica/nugato`

### OBS Settings:
*   **Width / Height**: Flexible, but `1920x1080` is recommended for native 1:1 scale on a 1080p canvas.
*   Check the box for **"Refresh browser when scene becomes active"** to ensure it connects cleanly if the Node server resets.

---

## 🐛 Troubleshooting

*   **HUD is completely blank (no offline players showing)**: Make sure the team name in the URL perfectly matches the key inside `players.json`.
*   **Avatars aren't loading**: Verify your `.env` file exists and the `DISCORD_BOT_TOKEN` is a valid bot token. Ensure the Bot has access to read user profiles if necessary.
*   **No live stats (Health/Ammo not updating)**: Check your Rust server console to see if the plugin loaded successfully, and verify that the `serverUrl` in `RustOverlay.cs` matches your Node server's public IP/Domain.
