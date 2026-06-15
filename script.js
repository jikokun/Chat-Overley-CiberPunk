const KICK_CHATROOM_ID = 1874362; // ID verificado de tu canal jikokun
const chatContainer = document.getElementById('chat-container');
const botsIgnorados = ['botrix', 'kickbot', 'nightbot', 'lobito_mensajero', 'jikobot'];

// Parámetros oficiales de la API pública y global de Kick
const KICK_WS_URL = "wss://ws-user.kick.com/app/eb1d5f283081a78b93bb?protocol=7&client=js&version=7.4.0&flash=false";
let socket;
let pingInterval;

function conectarChatKick() {
    console.log("[Kick API] Inicializando conexión nativa...");
    socket = new WebSocket(KICK_WS_URL);

    socket.onopen = () => {
        console.log("[Kick API] Canal abierto.");
        
        // Formato de suscripción requerido por el servidor de Kick
        const subscribePayload = {
            "event": "pusher:subscribe",
            "data": {
                "channel": `chatrooms.${KICK_CHATROOM_ID}.v2`
            }
        };
        socket.send(JSON.stringify(subscribePayload));
        
        // Mantenemos la conexión viva enviando un pulso (ping) cada 20 segundos
        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ "event": "pusher:ping", "data": {} }));
            }
        }, 20000);
        
        showSystemStatus("🟢 Liquid Glass Conectado - jikokun");
    };

    socket.onmessage = (event) => {
        try {
            const rawPayload = JSON.parse(event.data);
            
            // Si el servidor de Kick responde a nuestro pulso de vida, lo ignoramos de forma segura
            if (rawPayload.event === "pusher:pong") return;

            // Cuando la plataforma envíe un mensaje real de chat
            if (rawPayload.event === "App\\Events\\ChatMessageEvent") {
                let messageData = rawPayload.data;
                if (typeof messageData === 'string') {
                    messageData = JSON.parse(messageData);
                }
                processMessage(messageData);
            }
        } catch (error) {
            console.error("Error procesando trama:", error);
        }
    };

    socket.onclose = () => {
        clearInterval(pingInterval);
        showSystemStatus("⚠️ Conexión perdida con Kick. Reconectando...");
        // Bucle automático de reconexión cada 5 segundos si se interrumpe la red
        setTimeout(conectarChatKick, 5000);
    };
}

function processMessage(data) {
    if (!data || !data.content) return;

    const sender = data.sender || {};
    const usernameRaw = sender.username || "Usuario";
    const usernameLower = usernameRaw.trim().toLowerCase();
    let content = data.content;

    // Filtro anti-bots
    if (botsIgnorados.includes(usernameLower) || sender.is_bot) return;

    // Extracción o generación automática de colores elegantes neón
    let userColor = sender.identity?.color || sender.color;
    if (!userColor || userColor === '#000000' || userColor === '#FFFFFF') {
        userColor = generarColorElegante(usernameLower);
    }
    const userColorDim = userColor + '60';

    // Parseador automático de Emotes nativos de Kick
    content = content.replace(/\[emote:(\d+):([^\]]+)\]/g, function(match, emoteId, emoteName) {
        return `<img src="https://files.kick.com/emotes/${emoteId}/fullsize" alt="${emoteName}" class="kick-emote">`;
    });

    // Mapeo visual de insignias (Streamer, Mods, Subs) en emojis
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

    // Límite estricto: máximo 4 mensajes simultáneos para optimizar recursos en tu stream
    while (chatContainer.children.length > 4) {
        chatContainer.removeChild(chatContainer.firstChild);
    }

    // Animación Cyberpunk de evaporación líquida neón a los 30 segundos
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

// Iniciar proceso directo
conectarChatKick();