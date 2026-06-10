<?php

if (!defined('ABSPATH')) {
    exit;
}

class DLP_Paneles_App_Mode {
    public static function init() {
        add_action('template_redirect', array(__CLASS__, 'maybe_render_app_mode'), 1);
    }

    public static function maybe_render_app_mode() {
        if (is_admin() || wp_doing_ajax()) {
            return;
        }

        $slug = apply_filters('dlp_paneles_app_slug', 'pedidos');
        if (!is_page($slug)) {
            return;
        }

        if (!is_user_logged_in()) {
            auth_redirect();
            exit;
        }

        add_filter('show_admin_bar', '__return_false');

        $css_file = DLP_PANELES_DIR . 'assets/css/panel.css';
        $js_file = DLP_PANELES_DIR . 'assets/js/panel.js';
        $css_version = file_exists($css_file) ? (string) filemtime($css_file) : DLP_PANELES_VERSION;
        $js_version = file_exists($js_file) ? (string) filemtime($js_file) : DLP_PANELES_VERSION;

        $css_url = DLP_PANELES_URL . 'assets/css/panel.css?ver=' . rawurlencode($css_version);
        $js_url = DLP_PANELES_URL . 'assets/js/panel.js?ver=' . rawurlencode($js_version);

        $config = array(
            'apiBase' => esc_url_raw(rest_url('dlp-paneles/v1')),
            'nonce' => wp_create_nonce('wp_rest'),
            'refreshSeconds' => 30,
            'logoutUrl' => esc_url_raw(wp_logout_url(home_url('/'))),
            'brandTitle' => 'DEL PUENTE',
            'brandLogoUrl' => 'https://delpuente.com.gt/wp-content/uploads/2020/08/new-logo-web-dlp.png',
        );

        status_header(200);
        nocache_headers();

        echo '<!doctype html>';
        echo '<html ' . get_language_attributes() . '>';
        echo '<head>';
        echo '<meta charset="' . esc_attr(get_bloginfo('charset')) . '">';
        echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
        echo '<title>DLP Paneles</title>';
        echo '<style>html,body{margin:0;padding:0;background:#f3f5f9;}#dlp-paneles-root{padding:14px;}@media (max-width:980px){#dlp-paneles-root{padding:10px;}}</style>';
        echo '<link rel="stylesheet" href="' . esc_url($css_url) . '">';
        echo '<script>window.DLP_PANELES_CONFIG=' . wp_json_encode($config) . ';</script>';
        echo '</head>';
        echo '<body class="dlp-paneles-app-mode">';
        echo '<div id="dlp-paneles-root"></div>';
        echo '<script src="' . esc_url($js_url) . '" defer></script>';
        echo '</body>';
        echo '</html>';
        exit;
    }
}
