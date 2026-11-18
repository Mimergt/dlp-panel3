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


        wp_enqueue_style(
            'dlp-paneles-style',
            DLP_Paneles_Assets::url('assets/css/panel.css'),
            array(),
            null
        );

        wp_enqueue_script(
            'dlp-paneles-app',
            DLP_Paneles_Assets::url('assets/js/panel.js'),
            array(),
            null,
            true
        );

        wp_enqueue_script(
            'dlp-paneles-geo',
            DLP_Paneles_Assets::url('assets/js/panel-geo.js'),
            array('dlp-paneles-app'),
            null,
            true
        );

        $current_user = wp_get_current_user();

        wp_localize_script('dlp-paneles-app', 'DLP_PANELES_CONFIG', array(
            'apiBase' => esc_url_raw(rest_url('dlp-paneles/v1')),
            'nonce' => wp_create_nonce('wp_rest'),
            'ajaxUrl' => esc_url_raw(admin_url('admin-ajax.php')),
            'loginUrl' => esc_url_raw(apply_filters('dlp_paneles_login_url', home_url('/ingresar/'))),
            'refreshSeconds' => 30,
            'version' => DLP_PANELES_VERSION,
            'logoutUrl' => esc_url_raw(wp_logout_url(home_url('/'))),
            'logoutRedirect' => esc_url_raw(wp_login_url((string) get_permalink() ?: home_url('/'))),
            'brandTitle' => 'DEL PUENTE',
            'brandLogoUrl' => 'https://delpuente.com.gt/wp-content/uploads/2020/08/new-logo-web-dlp.png',
            'currentUserName' => $current_user->display_name ? $current_user->display_name : $current_user->user_login,
            'geo' => DLP_Paneles_Geo::front_config(),
        ));

        return '<div id="dlp-paneles-root"></div>';
    }
}
