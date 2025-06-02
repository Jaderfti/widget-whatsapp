// Variáveis globais
let phoneNumber = '';
let entityData = {};
let entityType = '';
let entityId = '';

// Inicia quando o Bitrix24 estiver pronto
BX24.ready(function() {
    console.log('Widget WhatsApp iniciado!');
    
    // Pega informações da entidade atual
    getEntityInfo();
    
    // Configura os botões
    setupButtons();
});

// Função para pegar informações da entidade
function getEntityInfo() {
    // Pega o tipo e ID da entidade atual
    const placement = BX24.placement.info();
    entityType = placement.options.ENTITY_TYPE || '';
    entityId = placement.options.ENTITY_ID || '';
    
    console.log('Tipo:', entityType, 'ID:', entityId);
    
    // Define qual método usar baseado no tipo
    let method = '';
    switch(entityType) {
        case 'LEAD':
            method = 'crm.lead.get';
            break;
        case 'CONTACT':
            method = 'crm.contact.get';
            break;
        case 'DEAL':
            method = 'crm.deal.get';
            break;
        case 'COMPANY':
            method = 'crm.company.get';
            break;
    }
    
    if (method && entityId) {
        // Busca os dados da entidade
        BX24.callMethod(
            method,
            { id: entityId },
            function(result) {
                if (result.error()) {
                    console.error('Erro:', result.error());
                    showStatus('Erro ao carregar dados', 'error');
                } else {
                    entityData = result.data();
                    console.log('Dados carregados:', entityData);
                    extractPhoneNumber();
                }
            }
        );
    }
}

// Função para extrair o número de telefone
function extractPhoneNumber() {
    let phone = '';
    
    // Tenta pegar o telefone de diferentes campos
    if (entityData.PHONE && entityData.PHONE.length > 0) {
        phone = entityData.PHONE[0].VALUE;
    } else if (entityData.PHONE_MOBILE) {
        phone = entityData.PHONE_MOBILE;
    } else if (entityData.PHONE_WORK) {
        phone = entityData.PHONE_WORK;
    }
    
    if (phone) {
        // Limpa o número (remove caracteres especiais)
        phoneNumber = phone.replace(/\D/g, '');
        
        // Se não tem código do país, adiciona +55 (Brasil)
        if (!phoneNumber.startsWith('55')) {
            phoneNumber = '55' + phoneNumber;
        }
        
        // Mostra o número formatado
        document.getElementById('phone-number').textContent = formatPhone(phone);
    } else {
        document.getElementById('phone-number').textContent = '❌ Sem telefone';
        showStatus('Nenhum telefone encontrado', 'warning');
    }
}

// Função para formatar o telefone para exibição
function formatPhone(phone) {
    // Remove tudo que não é número
    let cleaned = phone.replace(/\D/g, '');
    
    // Formata como (XX) XXXXX-XXXX
    if (cleaned.length >= 11) {
        return `(${cleaned.substr(0,2)}) ${cleaned.substr(2,5)}-${cleaned.substr(7,4)}`;
    }
    return phone;
}

// Configura os botões
function setupButtons() {
    // Botão enviar WhatsApp
    document.getElementById('send-whatsapp').onclick = function() {
        sendWhatsApp();
    };
    
    // Botão copiar link
    document.getElementById('copy-link').onclick = function() {
        copyWhatsAppLink();
    };
    
    // Tecla Enter na mensagem
    document.getElementById('message-text').onkeydown = function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            sendWhatsApp();
        }
    };
}

// Função para enviar WhatsApp
function sendWhatsApp() {
    if (!phoneNumber) {
        showStatus('❌ Telefone não encontrado!', 'error');
        return;
    }
    
    // Pega a mensagem
    let message = document.getElementById('message-text').value.trim();
    
    if (!message) {
        showStatus('⚠️ Digite uma mensagem!', 'warning');
        return;
    }
    
    // Substitui as variáveis
    message = replaceVariables(message);
    
    // Cria o link do WhatsApp
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // Abre o WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Registra a atividade
    logActivity(message);
    
    showStatus('✅ WhatsApp aberto!', 'success');
}

// Função para substituir variáveis na mensagem
function replaceVariables(message) {
    const replacements = {
        '{NOME}': entityData.NAME || entityData.TITLE || '',
        '{EMPRESA}': entityData.COMPANY_TITLE || '',
        '{EMAIL}': getEmail() || ''
    };
    
    for (let [variable, value] of Object.entries(replacements)) {
        message = message.replace(new RegExp(variable, 'g'), value);
    }
    
    return message;
}

// Função para pegar o email
function getEmail() {
    if (entityData.EMAIL && entityData.EMAIL.length > 0) {
        return entityData.EMAIL[0].VALUE;
    }
    return '';
}

// Função para copiar o link
function copyWhatsAppLink() {
    if (!phoneNumber) {
        showStatus('❌ Telefone não encontrado!', 'error');
        return;
    }
    
    let message = document.getElementById('message-text').value.trim();
    message = replaceVariables(message);
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // Copia para a área de transferência
    navigator.clipboard.writeText(whatsappUrl).then(function() {
        showStatus('✅ Link copiado!', 'success');
    }, function() {
        showStatus('❌ Erro ao copiar', 'error');
    });
}

// Função para inserir variável no texto
function insertVariable(variable) {
    const textarea = document.getElementById('message-text');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    textarea.value = text.substring(0, start) + variable + text.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + variable.length, start + variable.length);
}

// Função para registrar atividade no CRM
function logActivity(message) {
    const activityData = {
        OWNER_TYPE_ID: getCrmOwnerType(),
        OWNER_ID: entityId,
        TYPE_ID: 2, // Chamada
        SUBJECT: 'WhatsApp enviado',
        DESCRIPTION: `Mensagem enviada via WhatsApp:\n\n${message}`,
        COMPLETED: 'Y',
        DIRECTION: 2, // Saída
        COMMUNICATIONS: [{
            TYPE: 'PHONE',
            VALUE: phoneNumber
        }]
    };
    
    BX24.callMethod(
        'crm.activity.add',
        { fields: activityData },
        function(result) {
            if (!result.error()) {
                console.log('Atividade registrada!');
            }
        }
    );
}

// Função para pegar o tipo de proprietário do CRM
function getCrmOwnerType() {
    const types = {
        'LEAD': 1,
        'DEAL': 2,
        'CONTACT': 3,
        'COMPANY': 4
    };
    return types[entityType] || 0;
}

// Função para mostrar status
function showStatus(message, type) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

// Função global para inserir variável
window.insertVariable = insertVariable;