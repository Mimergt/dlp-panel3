<?php
/**
 * Plugin Name: DLP Paneles
 * Plugin URI: https://github.com/Mimergt/dlp-panel3
 * Description: Panel operativo de pedidos para tiendas y supervisores.
 * Version: 1.13.1
 * Author: Mimer - EPIC.gt
 * License: GPL2+
 * Text Domain: dlp-paneles
 */

if (!defined('ABSPATH')) {
    exit;
}

define('DLP_PANELES_VERSION', '1.13.1');
define('DLP_PANELES_FILE', __FILE__);
define('DLP_PANELES_DIR', plugin_dir_path(__FILE__));
define('DLP_PANELES_URL', plugin_dir_url(__FILE__));

require_once DLP_PANELES_DIR . 'includes/geo.php';
require_once DLP_PANELES_DIR . 'includes/statuses.php';
require_once DLP_PANELES_DIR . 'includes/rest.php';
require_once DLP_PANELES_DIR . 'includes/history.php';
require_once DLP_PANELES_DIR . 'includes/shortcode.php';
require_once DLP_PANELES_DIR . 'includes/app_mode.php';
require_once DLP_PANELES_DIR . 'includes/supervisor-profile.php';

// Compatible con el almacenamiento de pedidos de alto rendimiento (HPOS): las metas se leen y escriben por el objeto del pedido.
add_action('before_woocommerce_init', function () {
    if (class_exists('\\Automattic\\WooCommerce\\Utilities\\FeaturesUtil')) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', DLP_PANELES_FILE, true);
    }
});

add_action('plugins_loaded', function () {
    DLP_Paneles_Statuses::init();
    DLP_Paneles_REST::init();
    DLP_Paneles_History::init();
    DLP_Paneles_Shortcode::init();
    DLP_Paneles_App_Mode::init();
    DLP_Paneles_Supervisor_Profile::init();
});
