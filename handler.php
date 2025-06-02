<?php
// Verifica se é uma instalação
if ($_REQUEST['event'] == 'ONAPPINSTALL') {
    // Configura os placements (onde o widget aparece)
    $placements = [
        'CRM_LEAD_DETAIL_TOOLBAR',
        'CRM_CONTACT_DETAIL_TOOLBAR', 
        'CRM_DEAL_DETAIL_TOOLBAR',
        'CRM_COMPANY_DETAIL_TOOLBAR'
    ];
    
    // URL base do widget
    $widgetUrl = 'https://jaderfti.github.io/widget-whatsapp/index.html';
    
    // Registra o widget em cada placement
    foreach ($placements as $placement) {
        $result = restCommand('placement.bind', [
            'PLACEMENT' => $placement,
            'HANDLER' => $widgetUrl,
            'TITLE' => 'WhatsApp Rápido',
            'DESCRIPTION' => 'Envie mensagens via WhatsApp direto do CRM'
        ], $_REQUEST);
    }
    
    echo json_encode(['status' => 'installed']);
}

// Função para fazer chamadas REST
function restCommand($method, $params, $auth) {
    $queryUrl = $auth['client_endpoint'] . $method;
    $queryData = http_build_query(array_merge($params, [
        'auth' => $auth['access_token']
    ]));
    
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => $queryUrl,
        CURLOPT_POSTFIELDS => $queryData,
        CURLOPT_RETURNTRANSFER => true
    ]);
    
    $result = curl_exec($curl);
    curl_close($curl);
    
    return json_decode($result, true);
}
?>
