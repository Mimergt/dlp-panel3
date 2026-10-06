<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Estados de pedido propios del flujo del panel: En Preparacion (prep), Enviada / LPR (dlv) y Ready to pickup (rtp).
 *
 * Antes los registraba el plugin "WooCommerce Order Status Manager" (no compatible con HPOS). Si ese plugin esta
 * activo, este modulo no hace nada para no duplicar estados. Los estados cuentan como pagados y entran en reportes,
 * igual que antes (_is_paid = yes, _include_in_reports = yes).
 */
class DLP_Paneles_Statuses {
    public static function statuses() {
        return array(
            'wc-prep' => array('label' => 'En Preparación', 'plural' => 'En Preparación'),
            'wc-dlv' => array('label' => 'Enviada / LPR', 'plural' => 'Enviadas / LPR'),
            'wc-rtp' => array('label' => 'Ready to pickup', 'plural' => 'Ready to pickup'),
        );
    }

    public static function init() {
        if (class_exists('WC_Order_Status_Manager')) {
            return;
        }

        add_action('init', array(__CLASS__, 'register'), 5);
        add_filter('wc_order_statuses', array(__CLASS__, 'add_to_list'));
        add_filter('woocommerce_order_is_paid_statuses', array(__CLASS__, 'paid_statuses'));
        add_filter('woocommerce_reports_order_statuses', array(__CLASS__, 'report_statuses'));
        add_filter('woocommerce_analytics_excluded_order_statuses', array(__CLASS__, 'keep_in_analytics'));
        add_filter('bulk_actions-edit-shop_order', array(__CLASS__, 'bulk_actions'));
        add_filter('bulk_actions-woocommerce_page_wc-orders', array(__CLASS__, 'bulk_actions'));
        add_filter('handle_bulk_actions-edit-shop_order', array(__CLASS__, 'handle_bulk'), 10, 3);
        add_filter('handle_bulk_actions-woocommerce_page_wc-orders', array(__CLASS__, 'handle_bulk'), 10, 3);
        add_action('admin_head', array(__CLASS__, 'admin_css'));
    }

    public static function register() {
        foreach (self::statuses() as $slug => $s) {
            register_post_status($slug, array(
                'label' => $s['label'],
                'public' => false,
                'exclude_from_search' => false,
                'show_in_admin_all_list' => true,
                'show_in_admin_status_list' => true,
                'label_count' => _n_noop($s['label'] . ' <span class="count">(%s)</span>', $s['plural'] . ' <span class="count">(%s)</span>', 'dlp-paneles'),
            ));
        }
    }

    // Los inserta justo despues de "Procesando" para conservar el orden natural del flujo.
    public static function add_to_list($statuses) {
        $out = array();
        foreach ($statuses as $key => $label) {
            $out[$key] = $label;
            if ($key === 'wc-processing') {
                foreach (self::statuses() as $slug => $s) {
                    $out[$slug] = $s['label'];
                }
            }
        }
        foreach (self::statuses() as $slug => $s) {
            if (!isset($out[$slug])) {
                $out[$slug] = $s['label'];
            }
        }
        return $out;
    }

    public static function paid_statuses($paid) {
        return array_values(array_unique(array_merge((array) $paid, array('prep', 'dlv', 'rtp'))));
    }

    public static function report_statuses($statuses) {
        return array_values(array_unique(array_merge((array) $statuses, array('prep', 'dlv', 'rtp'))));
    }

    public static function keep_in_analytics($excluded) {
        return array_values(array_diff((array) $excluded, array('prep', 'dlv', 'rtp')));
    }

    public static function bulk_actions($actions) {
        foreach (self::statuses() as $slug => $s) {
            $actions['mark_' . substr($slug, 3)] = 'Cambiar estado a ' . $s['label'];
        }
        return $actions;
    }

    public static function handle_bulk($redirect, $action, $ids) {
        if (strpos((string) $action, 'mark_') !== 0) {
            return $redirect;
        }
        $status = substr($action, 5);
        if (!in_array('wc-' . $status, array_keys(self::statuses()), true)) {
            return $redirect;
        }
        $changed = 0;
        foreach ((array) $ids as $id) {
            $order = wc_get_order($id);
            if ($order && current_user_can('edit_shop_order', $id)) {
                $order->update_status($status, 'Cambio de estado masivo.', true);
                $changed++;
            }
        }
        return add_query_arg(array('changed' => $changed, 'ids' => implode(',', (array) $ids)), $redirect);
    }

    // Colores de las etiquetas de estado en la lista de pedidos (los que tenia el plugin anterior).
    public static function admin_css() {
        echo '<style>.order-status.status-prep{background:#f9d7b5;color:#8a4b08}.order-status.status-dlv{background:#8224e3;color:#fff}.order-status.status-rtp{background:#81d742;color:#1c4a05}</style>';
    }
}
