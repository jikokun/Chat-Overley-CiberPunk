const KICK_CHATROOM_ID = 1874362; // Tu ID verificado de jikokun
const chatContainer = document.getElementById('chat-container');
const botsIgnorados = ['botrix', 'kickbot', 'nightbot', 'lobito_mensajero', 'jikobot'];

// Llave perimetral global pública de Kick
const KICK_APP_KEY = "eb1d5f283081a78b93bb";

function inicializarChatGitHub() {
    // Inicializamos Pusher apuntando de forma nativa a la red de producción de Kick
    const pusher = new Pusher(KICK_APP_KEY, {
        wsHost: "ws-user.kick.com",
        wsPort: 443,
        wssPort: 443,
        forceTLS: true,
        enabledTransports: ["ws", "wss"],
        disableStats: true
    });

    showSystemStatus("🔮 Conectando con los servidores de Kick...");

    // Suscripción formal al canal v2 público
    const channelName = `chatrooms.${KICK_CHATROOM_ID}.v2`;
    const channel = pusher.subscribe(channelName);

    // Escuchar la entrada de nuevos mensajes en tiempo real
    channel.bind("App\\Events\\ChatMessageEvent", function(rawData) {
        let data = rawData;
        if (typeof rawData === 'string') {
            try { data = JSON.parse(rawData); } catch(e) { return; }
        }
        processMessage(data);
    });

    // Cambios de estado en la conexión de red
    pusher.connection.bind('connected', function() {
        showSystemStatus("🟢 Conexión Nube Exitosa - jikokun");
    });

    pusher.connection.bind('unavailable', function() {
        showSystemStatus("⚠️ Red inestable de Kick. Reconectando...");
    });
}

function processMessage(data) {
    if (!data || !data.content) return;

    const sender = data.sender || {};
    const usernameRaw = sender.username || "Usuario";
    const usernameLower = usernameRaw.trim().toLowerCase();
    let content = data.content;

    if (botsIgnorados.includes(usernameLower) || sender.is_bot) return;

    let userColor = sender.identity?.color || sender.color;
    if (!userColor || userColor === '#000000' || userColor === '#FFFFFF') {
        userColor = generarColorElegante(usernameLower);
    }
    const userColorDim = userColor + '60';

    content = content.replace(/\[emote:(\d+):([^\]]+)\]/g, function(match, emoteId, emoteName) {
        return `<img src="https://files.kick.com/emotes/${emoteId}/fullsize" alt="${emoteName}" class="kick-emote">`;
    });

    let badgesHtml = '';
    const badgesRaw = sender.identity?.badges || [];
    badgesRaw.forEach(b => {
        const type = b.type.toLowerCase();
        if (type === 'broadcaster') badgesHtml += '👑';
        else if (type === 'moderator') badgesHtml += '🛡️';
        else if (type === 'vip') badgesHtml += '💎';
        else if (type === 'subscriber') badgesHtml += '⭐';
    });

    const msgElement = document.createElement('div');
    msgElement.className = 'glass-message';
    msgElement.style.setProperty('--user-color', userColor);
    msgElement.style.setProperty('--user-color-dim', userColorDim);

    msgElement.innerHTML = `
        <div class="message-header">
            <span class="badges">${badgesHtml}</span>
            <span class="username">${escapeHTML(usernameRaw)}</span>
        </div>
        <div class="content">${content}</div>
    `;

    chatContainer.appendChild(msgElement);

    while (chatContainer.children.length > 4) {
        chatContainer.removeChild(chatContainer.firstChild);
    }

    setTimeout(() => {
        msgElement.classList.add('evaporating');
        setTimeout(() => {
            if (msgElement.parentNode) msgElement.parentNode.removeChild(msgElement);
        }, 700); 
    }, 30000);
}

function generarColorElegante(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colores = ['#FF5E7E', '#00D4FF', '#FFD166', '#06D6A0', '#B185DB', '#FF9F1C'];
    return colores[Math.abs(hash) % colores.length];
}

function showSystemStatus(text) {
    const statusBubble = document.createElement('div');
    statusBubble.className = 'glass-message';
    statusBubble.style.setProperty('--user-color', '#00f0ff');
    statusBubble.style.setProperty('--user-color-dim', 'rgba(0,240,255,0.1)');
    statusBubble.innerHTML = `<div class="content" style="color: #00f0ff; font-weight: bold; justify-content: center; width: 100%;">${text}</div>`;
    chatContainer.appendChild(statusBubble);
    
    setTimeout(() => {
        statusBubble.classList.add('evaporating');
        setTimeout(() => { if (statusBubble.parentNode) chatContainer.removeChild(statusBubble); }, 700);
    }, 5000);
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

inicializarChatGitHub();