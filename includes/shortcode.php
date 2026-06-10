<?php

if (!defined('ABSPATH')) {
    exit;
}

class DLP_Paneles_Shortcode {
    public static function init() {
        add_shortcode('dlp_paneles', array(__CLASS__, 'render_panel'));
    }

    public static function render_panel() {
        if (!is_user_logged_in()) {
            return '<div>Debe iniciar sesion para usar el panel.</div>';
        }

        $css_file = DLP_PANELES_DIR . 'assets/css/panel.css';
        $js_file = DLP_PANELES_DIR . 'assets/js/panel.js';
        $css_version = file_exists($css_file) ? (string) filemtime($css_file) : DLP_PANELES_VERSION;
        $js_version = file_exists($js_file) ? (string) filemtime($js_file) : DLP_PANELES_VERSION;

        wp_enqueue_style(
            'dlp-paneles-style',
            DLP_PANELES_URL . 'assets/css/panel.css',
            array(),
            $css_version
        );

        wp_enqueue_script(
            'dlp-paneles-app',
            DLP_PANELES_URL . 'assets/js/panel.js',
            array(),
            $js_version,
            true
        );

        wp_localize_script('dlp-paneles-app', 'DLP_PANELES_CONFIG', array(
            'apiBase' => esc_url_raw(rest_url('dlp-paneles/v1')),
            'nonce' => wp_create_nonce('wp_rest'),
            'refreshSeconds' => 30,
        ));

        return '<div id="dlp-paneles-root"></div>';
    }
}
