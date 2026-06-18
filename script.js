const SERVER_IP = "127.0.0.1"; 
const SERVER_PORT = "4445";

const chatContainer = document.getElementById('chat-container');
const botsIgnorados = ['botrix', 'kickbot', 'nightbot', 'lobito_mensajero', 'jikobot'];
let messageCount = 0; // Contador para alternar mensajes izquierda/derecha

function conectarConStreamerBot() {
    console.log(`[Widget] Conectando a Streamer.bot v1.0.4 en puerto ${SERVER_PORT}...`);
    const ws = new WebSocket(`ws://${SERVER_IP}:${SERVER_PORT}/`);

    ws.onopen = () => {
        console.log("¡Conexión local establecida exitosamente!");
        
        const payloadSuscripcion = {
            "request": "Subscribe",
            "id": "jikokun-glass-chat",
            "events": {
                "Kick": [
                    "ChatMessage",
                    "Follow"
                ]
            }
        };
        
        ws.send(JSON.stringify(payloadSuscripcion));
        showSystemStatus("🟢 Sistema Liquid Glass Conectado - jikokun");
    };

    ws.onmessage = (event) => {
        try {
            const rawPayload = JSON.parse(event.data);
            const payload = rawPayload.data || rawPayload;
            const eventName = (rawPayload.event || rawPayload.type || rawPayload.eventType || rawPayload.name || payload.event || payload.type || payload.eventType || '')
                .toString()
                .toLowerCase();
            const payloadText = JSON.stringify(payload).toLowerCase();

            const isFollowEvent = eventName.includes('follow')
                || eventName.includes('follower')
                || payloadText.includes('followed')
                || payloadText.includes('follower');

            if (isFollowEvent && !payload.message && !payload.text) {
                showFollowAlert(payload);
                return;
            }

            if (payload.message || rawPayload.message || payload.text) {
                processMessage(payload);
                return;
            }

            console.debug('[Widget] Evento no chat detectado:', eventName, payload);
        } catch (error) {
            console.error("Fallo decodificando el paquete del bot local:", error);
        }
    };

    ws.onclose = () => {
        showSystemStatus("⚠️ Buscando Streamer.bot... Asegúrate de tenerlo abierto.");
        setTimeout(conectarConStreamerBot, 5000); 
    };
}

function processMessage(data) {
    if (!data) return;

    const messageObj = data.message || data;
    const userObj = data.user || data.sender || messageObj.user || messageObj.sender || {};
    
    const eventType = data.eventType || data.type || data.event || null;
    const isFollowEvent = eventType && eventType.toString().toLowerCase().includes('follow');

    // 1. OBTENER NOMBRE DE USUARIO
    let usernameRaw = "Usuario";
    if (typeof userObj === 'string') {
        usernameRaw = userObj;
    } else {
        usernameRaw = userObj.username || userObj.name || userObj.displayName || userObj.user_name || data.user_name || data.username || data.userName || "Usuario";
    }
    const usernameLower = usernameRaw.trim().toLowerCase();
    
    // Filtro anti-bots
    if (botsIgnorados.includes(usernameLower) || userObj.is_bot || data.is_bot) return;

    // 2. OBTENER Y PARSEAR EL MENSAJE CON EMOTES
    let contentRaw = data.messageText || messageObj.message || messageObj.text || data.message || data.text || data.content || "";

    // Mensajes de alerta de seguimiento
    if (isFollowEvent) {
        contentRaw = `${usernameRaw} ahora sigue a Jiko 🎉`;
    }

    if (!contentRaw) return;

    let safeContent = escapeHTML(contentRaw);

    // Convertir el formato de emote de Kick [emote:id:nombre] en imágenes reales
    safeContent = safeContent.replace(/\[emote:(\d+):([^\]]+)\]/g, function(match, emoteId, emoteName) {
        return `<img src="https://files.kick.com/emotes/${emoteId}/fullsize" alt="${emoteName}" class="kick-emote" style="height: 24px; width: auto; vertical-align: middle; margin: 0 2px;">`;
    });

    // 3. PROCESADOR DE COLOR ESTILO GLASS NEON
    let userColor = userObj.color || data.color || "#00f0ff";
    if (userColor === '#000000' || userColor === '#FFFFFF') {
        userColor = generarColorElegante(usernameLower);
    }
    const userColorDim = userColor + '60';

    // 4. MAPEADOR DE INSIGNIAS BLINDADO (Especial para Streamer.bot v1.0.4)
    let badgesHtml = '';
    
    // Extracción agresiva de propiedades de rol que maneja el bot antiguo
    const isBroadcaster = (usernameLower === 'jikokun') || data.isBroadcaster || userObj.isBroadcaster || messageObj.isBroadcaster || data.isOwner || userObj.isOwner || false;
    const isModerator = data.isModerator || userObj.isModerator || messageObj.isModerator || data.isMod || userObj.isMod || false;
    const isSubscriber = data.isSubscriber || userObj.isSubscriber || messageObj.isSubscriber || data.isSub || userObj.isSub || false;
    const isVip = data.isVip || userObj.isVip || messageObj.isVip || data.vip || userObj.vip || false;
    const isOg = data.isOg || userObj.isOg || data.og || userObj.og || false;

    // Inyección ordenada de insignias
    if (isBroadcaster) {
        badgesHtml += '<span class="badge streamer" style="margin-right: 5px; font-size: 16px; vertical-align: middle;">👑</span>';
    } else if (isModerator) {
        badgesHtml += '<span class="badge mod" style="margin-right: 5px; font-size: 14px; vertical-align: middle;">🛡️</span>';
    } else if (isVip) {
        badgesHtml += '<span class="badge vip" style="margin-right: 5px; font-size: 14px; vertical-align: middle;">💎</span>';
    }
    
    // La insignia de suscriptor puede ir junto a la de Moderador o VIP
    if (isSubscriber && !isBroadcaster) {
        badgesHtml += '<span class="badge sub" style="margin-right: 5px; font-size: 14px; vertical-align: middle;">⭐</span>';
    }
    
    if (isOg && !isBroadcaster) {
        badgesHtml += '<span class="badge og" style="margin-right: 5px; font-size: 14px; vertical-align: middle;">🔥</span>';
    }

    // 5. MAQUETACIÓN DE LA BURBUJA DE CRISTAL LÍQUIDO
    const msgElement = document.createElement('div');
    msgElement.className = 'glass-message';
    
    if (isFollowEvent) {
        msgElement.classList.add('follow-alert');
        msgElement.style.setProperty('--user-color', '#ffd700');
        msgElement.style.setProperty('--user-color-dim', 'rgba(255, 215, 0, 0.25)');
    } else {
        // Alternar entre izquierda y derecha
        messageCount++;
        if (messageCount % 2 === 0) {
            msgElement.classList.add('message-right');
        } else {
            msgElement.classList.add('message-left');
        }
        msgElement.style.setProperty('--user-color', userColor);
        msgElement.style.setProperty('--user-color-dim', userColorDim);
    }

    msgElement.innerHTML = `
        <div class="message-header" style="display: flex; align-items: center; margin-bottom: 4px;">
            <span class="badges" style="display: flex; align-items: center;">${badgesHtml}</span>
            <span class="username" style="font-weight: bold; color: var(--user-color); margin-left: 2px;">${escapeHTML(usernameRaw)}</span>
        </div>
        <div class="content" style="word-break: break-word; color: #d0f0f8;">${safeContent}</div>
    `;

    chatContainer.appendChild(msgElement);

    // Límite de mensajes concurrentes en OBS (Máximo 6)
    while (chatContainer.children.length > 6) {
        chatContainer.removeChild(chatContainer.firstChild);
    }

    // Temporizador: Evaporación líquida neón a los 30 segundos
    setTimeout(() => {
        msgElement.classList.add('evaporating');
        setTimeout(() => {
            if (msgElement.parentNode) msgElement.parentNode.removeChild(msgElement);
        }, 700); 
    }, 30000);
}

function generarColorElegante(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
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

function showFollowAlert(data) {
    const username = data.user?.username || data.user?.name || data.user?.displayName || data.username || data.name || data.displayName || data.user_name || data.userName || 'Nuevo seguidor';
    const msgElement = document.createElement('div');
    msgElement.className = 'glass-message follow-alert';
    msgElement.innerHTML = `
        <div class="message-header" style="display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
            <span class="username" style="font-weight: 800; color: #ffd700; font-size: 14px; text-shadow: 0 0 12px rgba(255, 215, 0, 0.95);">${escapeHTML(username)}</span>
        </div>
        <div class="content" style="word-break: break-word; color: #fff8d2; text-align: center; font-weight: 700;">¡Gracias por seguir a Jiko! ✨</div>
    `;
    chatContainer.appendChild(msgElement);

    while (chatContainer.children.length > 6) {
        chatContainer.removeChild(chatContainer.firstChild);
    }

    setTimeout(() => {
        msgElement.classList.add('evaporating');
        setTimeout(() => {
            if (msgElement.parentNode) msgElement.parentNode.removeChild(msgElement);
        }, 700);
    }, 8000);
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

conectarConStreamerBot();