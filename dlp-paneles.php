<?php
/**
 * Plugin Name: DLP Paneles
 * Plugin URI: https://github.com/Mimergt/dlp-panel3
 * Description: Panel operativo de pedidos para tiendas y supervisores.
 * Version: 1.1.5
 * Author: Mimer - EPIC.gt
 * License: GPL2+
 * Text Domain: dlp-paneles
 */

if (!defined('ABSPATH')) {
    exit;
}

define('DLP_PANELES_VERSION', '1.1.5');
define('DLP_PANELES_FILE', __FILE__);
define('DLP_PANELES_DIR', plugin_dir_path(__FILE__));
define('DLP_PANELES_URL', plugin_dir_url(__FILE__));

require_once DLP_PANELES_DIR . 'includes/rest.php';
require_once DLP_PANELES_DIR . 'includes/shortcode.php';

add_action('plugins_loaded', function () {
    DLP_Paneles_REST::init();
    DLP_Paneles_Shortcode::init();
});
