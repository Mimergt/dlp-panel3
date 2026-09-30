<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Integracion opcional con el plugin dlp-tiendas (ubicacion, mapa, pausas).
 * Si dlp-tiendas no esta activo, todo esto queda apagado y el panel funciona igual.
 */
class DLP_Paneles_Geo {
    public static function available() {
        return function_exists('dlp_tiendas_map_config') && function_exists('dlp_tiendas_service_status');
    }

    // Config para el front: URLs de las librerias del mapa (se cargan solo al pulsar "Ver mapa").
    public static function front_config() {
        if (!self::available()) {
            return array('enabled' => false);
        }

        $c = dlp_tiendas_map_config();
        $u = DLP_TIENDAS_URL . 'assets/vendor/';
        $v = rawurlencode(DLP_TIENDAS_VERSION);

        return array(
            'enabled' => true,
            'leafletCss' => $u . 'leaflet.css?ver=1.9.4',
            'leafletJs' => $u . 'leaflet.js?ver=1.9.4',
            'protomapsJs' => $u . 'protomaps-leaflet.js?ver=5.1.0',
            'tilesUrl' => $c['tilesUrl'],
            'minZoom' => $c['minZoom'],
            'maxZoom' => $c['maxZoom'],
            'v' => $v,
        );
    }

    public static function order_payload($order, $order_type, $store_id) {
        if (!self::available() || $order_type !== 'delivery') {
            return null;
        }

        $lat = $order->get_meta('_dlp_lat');
        $lng = $order->get_meta('_dlp_lng');
        if (!is_numeric($lat) || !is_numeric($lng)) {
            return null;
        }

        $slat = $store_id ? get_post_meta($store_id, 'extra_store_lat', true) : '';
        $slng = $store_id ? get_post_meta($store_id, 'extra_store_lng', true) : '';

        $zs = (int) $order->get_meta('_dlp_tienda_zona');

        return array(
            'cubre_a' => $zs ? get_the_title($zs) : '',
            'lat' => (float) $lat,
            'lng' => (float) $lng,
            'zona' => (string) $order->get_meta('_dlp_zona'),
            'source' => (string) $order->get_meta('_dlp_geo_source'),
            'store_lat' => is_numeric($slat) ? (float) $slat : null,
            'store_lng' => is_numeric($slng) ? (float) $slng : null,
        );
    }
}
