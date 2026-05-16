const pathParts = window.location.pathname.substring(1).split('/').filter(p => p.trim() !== "");
const teamNameRaw = pathParts[1];
const root = document.getElementById('root');

const socket = io();

socket.on("connect", () => {
    socket.emit("get_leaderboard");
});

socket.on("leaderboard:update", (data) => {
    if (!teamNameRaw) {
        root.innerHTML = "<div class='error-msg'>No team specified in the URL.</div>";
        return;
    }

    try {
        const teamData = data.teams.find(t => t.name.toLowerCase() === teamNameRaw.toLowerCase());
        
        if (teamData) {
            root.innerHTML = `
                <div class="stats-hud">
                    <div class="stats-top">
                        <div class="stats-title">TEAM ${teamData.name}</div>
                        <div class="stats-rank-box">
                            <div class="stats-label">RANK</div>
                            <div class="stats-rank-val">#${teamData.rank}</div>
                        </div>
                    </div>
                    <div class="stats-divider"></div>
                    <div class="stats-bottom">
                        <div class="stats-points-box">
                            <div class="stats-label">BODOVI</div>
                            <div class="stats-points-val">${teamData.score}</div>
                        </div>
                        <div class="stats-logo-box">
                            <img src="/assets/logo.png" class="stats-logo" alt="WSC Logo" />
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error processing team stats:", error);
    }
});