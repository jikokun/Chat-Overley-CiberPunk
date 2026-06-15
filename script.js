const KICK_CHATROOM_ID = 1874362; // Tu ID de jikokun
const chatContainer = document.getElementById('chat-container');
const botsIgnorados = ['botrix', 'kickbot', 'nightbot', 'lobito_mensajero', 'jikobot'];

// ========================================================
// CREDENCIALES OFICIALES DE TU APLICACIÓN EN DEV.KICK.COM
// ========================================================
const KICK_CLIENT_ID = "01KV4R1TR2TERA7YASCB2TKRSW";
const KICK_CLIENT_SECRET = "db808fbca55d5b5bf4d39b2bb13610a008a6faa5c13d7070bed0f9bd3defee1d";

let accessToken = "";
let socket;
let heartbeatInterval;

// PASO 1: OBTENER EL TOKEN BEARER AUTORIZADO (OAuth 2.1)
async function autenticarEnKick() {
    showSystemStatus("🔑 Autenticando App en Kick Developer...");
    
    try {
        const respuesta = await fetch("https://api.kick.com/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                "grant_type": "client_credentials",
                "client_id": KICK_CLIENT_ID,
                "client_secret": KICK_CLIENT_SECRET,
                "scope": "chat:read" // Permiso de lectura solicitado
            })
        });

        if (!respuesta.ok) throw new Error("Kick rechazó las credenciales de la aplicación");

        const data = await respuesta.json();
        accessToken = data.access_token; // Guardamos el token de acceso seguro
        
        console.log("Autenticación exitosa. Token recibido.");
        
        // PASO 2: Abrir el canal de datos con el token
        conectarWebSocketOficial();

    } catch (error) {
        console.error("Error OAuth:", error);
        showSystemStatus("❌ Error de Autenticación. Revisa dev.kick.com");
        // Reintentar iniciar sesión tras 10 segundos en caso de error de red
        setTimeout(autenticarEnKick, 10000);
    }
}

// PASO 2: CONEXIÓN AL WEBSOCKET AUTORIZADO
function conectarWebSocketOficial() {
    const KICK_WS_URL = "wss://ws-user.kick.com/app/eb1d5f283081a78b93bb?protocol=7&client=js&version=7.4.0&flash=false";
    socket = new WebSocket(KICK_WS_URL);

    socket.onopen = () => {
        console.log("Túnel WebSocket establecido.");
        
        // Enviamos el token de autenticación (auth) requerido obligatoriamente por Kick
        const subscribePayload = {
            "event": "pusher:subscribe",
            "data": {
                "channel": `chatrooms.${KICK_CHATROOM_ID}.v2`,
                "auth": accessToken // Tu firma digital oficial
            }
        };
        socket.send(JSON.stringify(subscribePayload));
        
        // Mantener viva la conexión con un pulso constante (Heartbeat) cada 25 segundos
        clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ "event": "pusher:ping", "data": {} }));
            }
        }, 25000);

        showSystemStatus("🟢 Conexión Oficial API Exitosa - jikokun");
    };

    socket.onmessage = (event) => {
        try {
            const rawPayload = JSON.parse(event.data);
            
            if (rawPayload.event === "pusher:pong") return; // Ignorar el eco del latido

            if (rawPayload.event === "App\\Events\\ChatMessageEvent") {
                let messageData = rawPayload.data;
                if (typeof messageData === 'string') {
                    messageData = JSON.parse(messageData);
                }
                processMessage(messageData);
            }
        } catch (error) {
            console.error("Error de parsing:", error);
        }
    };

    socket.onclose = () => {
        clearInterval(heartbeatInterval);
        showSystemStatus("⚠️ Conexión cerrada. Reconectando...");
        // Volvemos a autenticar para refrescar el token antes de reconectar
        setTimeout(autenticarEnKick, 5000);
    };
}

// PASO 3: PROCESAMIENTO Y PARSEO DEL CHAT
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

    // Parseador de Emotes oficiales de Kick
    content = content.replace(/\[emote:(\d+):([^\]]+)\]/g, function(match, emoteId, emoteName) {
        return `<img src="https://files.kick.com/emotes/${emoteId}/fullsize" alt="${emoteName}" class="kick-emote">`;
    });

    // Mapeador de insignias de roles
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

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
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

// Disparar flujo OAuth oficial al arrancar el widget
autenticarEnKick();