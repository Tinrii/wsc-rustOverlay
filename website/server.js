const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.get("/", (req, res) => {
    res.json({ status: "Running", message: "Please specify a team in the URL (e.g. /nugato)", teams: Object.keys(playersConfig), madeby: "https://weareaxora.com" });
});
app.use(express.static("public"));

let playersConfig = {};
try { 
    playersConfig = JSON.parse(fs.readFileSync("players.json", "utf8")); 
} catch (err) { 
    console.error("Could not load players.json:", err.message); 
}

const avatarCache = {};
async function getDiscordAvatar(discordId) {
    if (avatarCache[discordId]) return avatarCache[discordId];
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) return "";

    try {
        const res = await fetch(`https://discord.com/api/v10/users/${discordId}`, { headers: { Authorization: `Bot ${token}` } });
        if (res.ok) {
            const data = await res.json();
            if (data.avatar) {
                const ext = data.avatar.startsWith("a_") ? "gif" : "png";
                const avatarUrl = `https://cdn.discordapp.com/avatars/${discordId}/${data.avatar}.${ext}?size=128`;
                avatarCache[discordId] = avatarUrl;
                return avatarUrl;
            }
        }
    } catch (err) {
        console.error(`Error fetching avatar for ${discordId}:`, err.message);
    }
    return "";
}

let teamDataCache = {};

async function initCache() {
    let savedCache = {};
    if (fs.existsSync("teamDataCache.json")) {
        try {
            savedCache = JSON.parse(fs.readFileSync("teamDataCache.json", "utf8"));
        } catch (e) {
            console.error("Error reading teamDataCache.json:", e.message);
        }
    }

    for (const [teamName, members] of Object.entries(playersConfig)) {
        const teamData = { teamName: teamName, players: [] };
        const savedTeamData = savedCache[teamName];

        for (const member of members) {
            let avatarUrl = "";
            if (member.discordid && member.discordid !== "none") {
                avatarUrl = await getDiscordAvatar(member.discordid);
            }
            
            let savedPlayer = null;
            if (savedTeamData && savedTeamData.players) {
                savedPlayer = savedTeamData.players.find(p => p.steamid === member.steamid);
            }

            if (savedPlayer) {
                savedPlayer.avatar = avatarUrl || savedPlayer.avatar;
                savedPlayer.name = member.name === "none" ? savedPlayer.name : member.name;
                teamData.players.push(savedPlayer);
            } else {
                teamData.players.push({
                    name: member.name === "none" ? "" : member.name,
                    steamid: member.steamid,
                    health: 0,
                    maxHealth: 100,
                    isWounded: false,
                    isDead: false,
                    weapon: "none",
                    ammo: "0/0",
                    avatar: avatarUrl,
                    isOffline: true
                });
            }
        }
        teamDataCache[teamName] = teamData;
    }
}
initCache();

app.post("/update", async (req, res) => {
    const rawData = req.body;

    for (const [teamName, members] of Object.entries(playersConfig)) {
        const teamData = { teamName: teamName, players: [] };
        
        for (const member of members) {
            const livePlayer = rawData?.players?.find(p => p.steamid === member.steamid);
            
            let avatarUrl = "";
            if (member.discordid) avatarUrl = await getDiscordAvatar(member.discordid);

            if (livePlayer) {
                if (livePlayer.health == livePlayer.maxHealth) livePlayer.health = livePlayer.maxHealth - 1;
                if (livePlayer.health > livePlayer.maxHealth) livePlayer.health = livePlayer.maxHealth;
                if (livePlayer.weapon === "rocket.launcher.rpg7") livePlayer.weapon = "rocket.launcher";
                
                teamData.players.push({
                    name: livePlayer.name || member.name,
                    steamid: member.steamid,
                    health: livePlayer.health + 1,
                    maxHealth: livePlayer.maxHealth || 100,
                    isWounded: livePlayer.isWounded || false,
                    isDead: livePlayer.isDead || false,
                    weapon: livePlayer.weapon,
                    ammo: livePlayer.ammo,
                    avatar: avatarUrl,
                    isOffline: false
                });
            } else {
                teamData.players.push({
                    name: member.name,
                    steamid: member.steamid,
                    health: 0,
                    maxHealth: 100,
                    isWounded: false,
                    isDead: false,
                    weapon: "none",
                    ammo: "0/0",
                    avatar: avatarUrl,
                    isOffline: true
                });
            }
        }
        
        teamDataCache[teamName] = teamData;
        io.to(teamName).emit("overlay:update", teamData);
    }

    try {
        fs.writeFileSync("teamDataCache.json", JSON.stringify(teamDataCache, null, 2));
    } catch (e) {
        console.error("Error writing teamDataCache.json:", e.message);
    }

    res.json({ ok: true });
})

const missingWeapons = new Set();
io.on("connection", socket => {
    console.log("Client connected");
    socket.on("join_team", (teamName) => {
        socket.join(teamName);
        if (teamDataCache[teamName]) socket.emit("overlay:update", teamDataCache[teamName]);
    });
    socket.on("get_leaderboard", () => {
        if (fs.existsSync(LEADERBOARD_CACHE_FILE)) {
            try {
                const data = fs.readFileSync(LEADERBOARD_CACHE_FILE, "utf8");
                socket.emit("leaderboard:update", JSON.parse(data));
            } catch (err) {
                console.error("Error reading leaderboard cache:", err);
            }
        }
    });
    socket.on("missing_weapon", async (weapon) => {
        if (!missingWeapons.has(weapon)) {
            missingWeapons.add(weapon);
            console.log(`[Missing Weapon Image] https://files.facepunch.com/rust/item/${weapon.toLowerCase()}_512.png`);
            const channelId = "1503463203412119733";
            const sendMessage = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
                method: "POST",
                headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json", },
                body: JSON.stringify({ content: `[Missing Weapon Image] https://files.facepunch.com/rust/item/${weapon.toLowerCase()}_512.png`, }),
            });

            const messageData = await sendMessage.json();
            console.log(messageData);
        }
    });
});

const development = false;
if (development) {
    setInterval(async () => {
        const teamMembers = playersConfig["marijica"];
        if (!teamMembers) return;

        const dummyPlayers = [];
        const weapons = ["rifle.ak", "shotgun.pump", "syringe.medical"];
        const ammos = ["30/30", "6/6", "1/1"];
        const healths = [100, 75, 42];

        let i = 0;
        for (const member of teamMembers) {
            let avatarUrl = "";
            if (member.discordid) avatarUrl = await getDiscordAvatar(member.discordid);

            dummyPlayers.push({
                name: member.name,
                steamid: member.steamid,
                health: healths[i % healths.length],
                maxHealth: 100,
                isWounded: i % 3 === 1,
                isDead: i % 3 === 2,
                weapon: weapons[i % weapons.length],
                ammo: ammos[i % ammos.length],
                avatar: avatarUrl,
                isOffline: false
            });
            i++;
        }

        const dummyData = {
            teamName: "marijica",
            players: dummyPlayers
        };

        teamDataCache["marijica"] = dummyData;
        io.to("marijica").emit("overlay:update", dummyData);
    }, 2000);
}

const LEADERBOARD_API_URL = "https://genuine-mindfulness-production-bd97.up.railway.app/leaderboard";
const LEADERBOARD_CACHE_FILE = "leaderboardCache.json";

async function fetchAndCacheLeaderboard() {
    try {
        const response = await fetch(LEADERBOARD_API_URL);
        if (response.ok) {
            const data = await response.json();
            fs.writeFileSync(LEADERBOARD_CACHE_FILE, JSON.stringify(data, null, 2));
            io.emit("leaderboard:update", data);
        }
    } catch (err) {
        console.error("Error fetching leaderboard API:", err.message);
    }
}

fetchAndCacheLeaderboard();
setInterval(fetchAndCacheLeaderboard, 15000);

app.get("/overlay/:team1", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

app.get("/cast/:team1/:team2", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

app.get("/overlay/maki/:team1", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
})

app.get("/teamStats/:team1", (req, res) => {
    res.sendFile(__dirname + "/public/teamStats.html");
})

app.get("/api/leaderboard", (req, res) => {
    try {
        if (fs.existsSync(LEADERBOARD_CACHE_FILE)) {
            const data = fs.readFileSync(LEADERBOARD_CACHE_FILE, "utf8");
            res.json(JSON.parse(data));
        } else {
            res.status(404).json({ error: "Leaderboard data not available" });
        }
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

server.listen(3696, () => {
    console.log("Server is running on port 3696");
});