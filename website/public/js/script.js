const socket = io();
const root = document.getElementById('root');

function weaponIcon(shortname) {
    if (!shortname || shortname === "none") return "";
    return `https://files.facepunch.com/rust/item/${shortname.toLowerCase()}_512.png`;
}

const pathParts = window.location.pathname.substring(1).split('/').filter(p => p.trim() !== "");
const maki = pathParts.includes("maki")
const cast = pathParts.includes("cast")
const overlay = pathParts.includes("overlay"); 

let teamsToTrack = pathParts.length > 0 ? pathParts : ["marijica"];
if (maki || cast || overlay) teamsToTrack.shift();
const teamUIs = {};

if (maki) {
    document.head.innerHTML += `<link rel="stylesheet" href="/css/maki.css">`;
} else {
    document.head.innerHTML += `<link rel="stylesheet" href="/css/style.css">`;
}

teamsToTrack.forEach(team => {
    const hud = document.createElement("div");
    hud.className = "hud";
    
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = `TEAM ${team}`;
    
    const playersContainer = document.createElement("div");
    playersContainer.className = "teamContainer";
    
    hud.appendChild(title);
    hud.appendChild(playersContainer);
    root.appendChild(hud);
    
    const advertisement = document.createElement("div");
    advertisement.className = "advertisement";
    advertisement.textContent = "weareaxora.com";
    hud.appendChild(advertisement);
    
    if (!teamUIs[team]) teamUIs[team] = [];
    teamUIs[team].push({ hud: hud, title: title, players: playersContainer });
});

socket.on("connect", () => {
    console.log("connected!");
    teamsToTrack.forEach(team => { socket.emit("join_team", team); });
});

function renderOverlay(data) {
    if (!data || !data.teamName || !teamUIs[data.teamName]) return;
    const uis = teamUIs[data.teamName];
    
    uis.forEach(ui => {
        ui.title.textContent = "TEAM " + data.teamName;
        ui.players.innerHTML = "";

        if (!data.players) return;
        data.players.forEach((p) => {
            const wrapper = document.createElement("div");
            wrapper.className = "playerWrapper";
            if (p.isOffline) {
                wrapper.style.opacity = "0.5";
                wrapper.style.filter = "grayscale(100%)";
            }

            const icon = weaponIcon(p.weapon);
            const avatarContent = p.avatar ? `<img src="${p.avatar}" style="width:100%; height:100%; border-radius:inherit; object-fit:cover;">` : "";
            
            let hpDisplay = `${p.health}/${p.maxHealth}`;
            if (p.isOffline) {
                hpDisplay = "OFFLINE";
            } else if (p.isDead) {
                hpDisplay = "DEAD";
            } else if (p.isWounded) {
                hpDisplay = "KNOCKED";
            }

            wrapper.innerHTML = `
                <div class="playerRow">
                    <div class="stripe"></div>
                    <div class="avatar">${avatarContent}</div>
                    <div class="name">${p.name}</div>
                    <div class="hp">${hpDisplay}</div>
                    <div class="weapon">
                        ${icon ? `<img src="${icon}" onerror="this.style.display='none'; socket.emit('missing_weapon', '${p.weapon}');" referrerpolicy="no-referrer">` : ""}
                    </div>
                    <div class="ammo">${p.isOffline ? "" : p.ammo}</div>
                </div>
            `;

            ui.players.appendChild(wrapper);
        });
    });
}

socket.on("overlay:update", renderOverlay);