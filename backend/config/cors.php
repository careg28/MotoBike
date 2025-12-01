<?php

return [
  
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    // Métodos permitidos
    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        'http://frontend-feos.test',
        // 'https://www.tudominio.com',
        // 'https://admin.tudominio.com',
    ],

    
    'allowed_origins_patterns' => [
        // '#^https://([a-z0-9-]+\.)?tudominio\.com$#i',
    ],

    // Headers permitidos 
    'allowed_headers' => ['*'],

    
    'exposed_headers' => [],

    // Cache del preflight en segundos
    'max_age' => 0,

    // Para Bearer tokens 
    'supports_credentials' => false,
];