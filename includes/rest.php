<?php

if (!defined('ABSPATH')) {
    exit;
}

class DLP_Paneles_REST {
    public static function init() {
        add_action('rest_api_init', array(__CLASS__, 'register_routes'));
    }

    public static function register_routes() {
        register_rest_route('dlp-paneles/v1', '/panel', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array(__CLASS__, 'get_panel_data'),
            'permission_callback' => array(__CLASS__, 'can_access_panel'),
        ));

        register_rest_route('dlp-paneles/v1', '/pedido/(?P<id>\\d+)/estado', array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => array(__CLASS__, 'update_order_status'),
            'permission_callback' => array(__CLASS__, 'can_access_panel'),
            'args' => array(
                'new_status' => array(
                    'required' => true,
                    'type' => 'string',
                ),
            ),
        ));

        register_rest_route('dlp-paneles/v1', '/pedido/(?P<id>\\d+)/cancelar', array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => array(__CLASS__, 'cancel_order'),
            'permission_callback' => array(__CLASS__, 'can_access_panel'),
            'args' => array(
                'motivo' => array(
                    'required' => true,
                    'type' => 'string',
                ),
            ),
        ));

        register_rest_route('dlp-paneles/v1', '/pedido/(?P<id>\\d+)/meta', array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => array(__CLASS__, 'update_order_meta'),
            'permission_callback' => array(__CLASS__, 'can_access_panel'),
        ));

        register_rest_route('dlp-paneles/v1', '/pedido/(?P<id>\\d+)/tienda', array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => array(__CLASS__, 'reassign_order_store'),
            'permission_callback' => array(__CLASS__, 'can_access_panel'),
            'args' => array(
                'store_id' => array(
                    'required' => true,
                    'type' => 'integer',
                ),
            ),
        ));
    }

    public static function can_access_panel() {
        if (!is_user_logged_in()) {
            return false;
        }

        if (self::is_supervisor_user(get_current_user_id())) {
            return true;
        }

        return !empty(self::get_user_store_ids(get_current_user_id()));
    }

    public static function is_supervisor_user($user_id) {
        if (user_can($user_id, 'manage_woocommerce') || user_can($user_id, 'manage_options')) {
            return true;
        }

        $user = get_user_by('id', $user_id);
        if (!$user) {
            return false;
        }

        $roles = (array) $user->roles;
        return in_array('shop_manager', $roles, true) || in_array('administrator', $roles, true);
    }

    public static function get_user_store_ids($user_id) {
        $stores = get_posts(array(
            'post_type' => 'extra_store',
            'fields' => 'ids',
            'post_status' => 'publish',
            'numberposts' => -1,
            'meta_query' => array(
                array(
                    'key' => 'extra_store_user',
                    'value' => $user_id,
                    'compare' => '=',
                    'type' => 'NUMERIC',
                ),
            ),
        ));

        return array_map('absint', $stores);
    }

    public static function get_accessible_store_ids($user_id) {
        if (self::is_supervisor_user($user_id)) {
            $stores = get_posts(array(
                'post_type' => 'extra_store',
                'fields' => 'ids',
                'post_status' => 'publish',
                'numberposts' => -1,
            ));

            return array_map('absint', $stores);
        }

        return self::get_user_store_ids($user_id);
    }

    public static function format_store_list($store_ids) {
        $result = array();

        foreach ($store_ids as $store_id) {
            $store_id = absint($store_id);
            if (!$store_id) {
                continue;
            }

            $result[] = array(
                'id' => $store_id,
                'name' => get_the_title($store_id),
            );
        }

        return $result;
    }

    public static function user_can_access_order($order, $user_id) {
        if (self::is_supervisor_user($user_id)) {
            return true;
        }

        $store_ids = self::get_user_store_ids($user_id);
        if (empty($store_ids)) {
            return false;
        }

        $order_store_id = absint(get_post_meta($order->get_id(), 'extra_store_name', true));
        return in_array($order_store_id, $store_ids, true);
    }

    public static function get_panel_data(WP_REST_Request $request) {
        $user_id = get_current_user_id();
        $supervisor = self::is_supervisor_user($user_id);
        $accessible_store_ids = self::get_accessible_store_ids($user_id);

        $statuses = array('processing', 'dlv', 'rtp');
        $args = array(
            'limit' => 250,
            'orderby' => 'date',
            'order' => 'DESC',
            'status' => $statuses,
            'return' => 'objects',
        );

        if (!$supervisor) {
            if (empty($accessible_store_ids)) {
                return new WP_REST_Response(array(
                    'scope' => 'tienda',
                    'orders' => array(),
                    'counts' => array('processing' => 0, 'dlv' => 0, 'rtp' => 0),
                    'stores' => array(),
                    'server_time' => current_time('mysql'),
                ));
            }

            $args['meta_query'] = array(
                array(
                    'key' => 'extra_store_name',
                    'value' => $accessible_store_ids,
                    'compare' => 'IN',
                ),
            );
        }

        $orders = wc_get_orders($args);
        $now_ts = current_time('timestamp');
        $counts = array('processing' => 0, 'dlv' => 0, 'rtp' => 0);
        $result = array();

        foreach ($orders as $order) {
            $order_id = $order->get_id();
            $status = $order->get_status();
            if (!isset($counts[$status])) {
                continue;
            }

            $created = $order->get_date_created();
            $created_ts = $created ? $created->getTimestamp() : $now_ts;
            $store_id = absint(get_post_meta($order_id, 'extra_store_name', true));

            $counts[$status]++;

            $result[] = array(
                'id' => $order_id,
                'status' => $status,
                'store_id' => $store_id,
                'store_name' => $store_id ? get_the_title($store_id) : '',
                'customer_name' => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
                'phone' => $order->get_billing_phone(),
                'address' => $order->get_billing_address_2(),
                'city' => $order->get_billing_city(),
                'elapsed_seconds' => max(0, $now_ts - $created_ts),
                'priority' => get_post_meta($order_id, '_dlp_priority', true) === '1',
                'notes' => $order->get_customer_note(),
                'internal_note' => get_post_meta($order_id, '_dlp_internal_note', true),
            );
        }

        return new WP_REST_Response(array(
            'scope' => $supervisor ? 'supervisor' : 'tienda',
            'orders' => $result,
            'counts' => $counts,
            'stores' => self::format_store_list($accessible_store_ids),
            'server_time' => current_time('mysql'),
        ));
    }

    public static function update_order_status(WP_REST_Request $request) {
        $order_id = absint($request['id']);
        $new_status = sanitize_key($request->get_param('new_status'));

        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_REST_Response(array('message' => 'Pedido no encontrado'), 404);
        }

        $user_id = get_current_user_id();
        if (!self::user_can_access_order($order, $user_id)) {
            return new WP_REST_Response(array('message' => 'No autorizado para este pedido'), 403);
        }

        $current_status = $order->get_status();

        $transitions = array(
            'processing' => array('dlv'),
            'dlv' => array('rtp'),
            'rtp' => array('completed'),
        );

        if (self::is_supervisor_user($user_id)) {
            $transitions = array(
                'processing' => array('dlv', 'rtp'),
                'dlv' => array('processing', 'rtp'),
                'rtp' => array('dlv', 'completed'),
            );
        }

        if (!isset($transitions[$current_status]) || !in_array($new_status, $transitions[$current_status], true)) {
            return new WP_REST_Response(array('message' => 'Transicion no permitida'), 409);
        }

        $order->update_status($new_status);

        return new WP_REST_Response(array(
            'ok' => true,
            'order_id' => $order_id,
            'new_status' => $order->get_status(),
        ));
    }

    public static function cancel_order(WP_REST_Request $request) {
        $order_id = absint($request['id']);
        $motivo = sanitize_textarea_field((string) $request->get_param('motivo'));

        if ($motivo === '') {
            return new WP_REST_Response(array('message' => 'El motivo es obligatorio'), 400);
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_REST_Response(array('message' => 'Pedido no encontrado'), 404);
        }

        $user_id = get_current_user_id();
        if (!self::user_can_access_order($order, $user_id)) {
            return new WP_REST_Response(array('message' => 'No autorizado para este pedido'), 403);
        }

        if (!in_array($order->get_status(), array('processing', 'dlv', 'rtp'), true)) {
            return new WP_REST_Response(array('message' => 'No se puede cancelar en este estado'), 409);
        }

        $order->update_status('cancelled');
        $order->add_order_note('Motivo de cancelacion: ' . $motivo);
        update_post_meta($order_id, '_motivo_cancelacion_tienda', $motivo);

        return new WP_REST_Response(array(
            'ok' => true,
            'order_id' => $order_id,
            'new_status' => $order->get_status(),
        ));
    }

    public static function update_order_meta(WP_REST_Request $request) {
        $order_id = absint($request['id']);
        $order = wc_get_order($order_id);

        if (!$order) {
            return new WP_REST_Response(array('message' => 'Pedido no encontrado'), 404);
        }

        $user_id = get_current_user_id();
        if (!self::user_can_access_order($order, $user_id)) {
            return new WP_REST_Response(array('message' => 'No autorizado para este pedido'), 403);
        }

        $priority_param = $request->get_param('priority');
        if ($priority_param !== null) {
            update_post_meta($order_id, '_dlp_priority', $priority_param ? '1' : '0');
        }

        $internal_note_param = $request->get_param('internal_note');
        if ($internal_note_param !== null) {
            $internal_note = sanitize_textarea_field((string) $internal_note_param);
            update_post_meta($order_id, '_dlp_internal_note', $internal_note);
        }

        return new WP_REST_Response(array(
            'ok' => true,
            'order_id' => $order_id,
            'priority' => get_post_meta($order_id, '_dlp_priority', true) === '1',
            'internal_note' => (string) get_post_meta($order_id, '_dlp_internal_note', true),
        ));
    }

    public static function reassign_order_store(WP_REST_Request $request) {
        $order_id = absint($request['id']);
        $store_id = absint($request->get_param('store_id'));

        if (!$store_id) {
            return new WP_REST_Response(array('message' => 'Tienda invalida'), 400);
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_REST_Response(array('message' => 'Pedido no encontrado'), 404);
        }

        $user_id = get_current_user_id();
        if (!self::user_can_access_order($order, $user_id)) {
            return new WP_REST_Response(array('message' => 'No autorizado para este pedido'), 403);
        }

        $allowed_store_ids = self::get_accessible_store_ids($user_id);
        if (!in_array($store_id, $allowed_store_ids, true)) {
            return new WP_REST_Response(array('message' => 'No autorizado para asignar esa tienda'), 403);
        }

        update_post_meta($order_id, 'extra_store_name', $store_id);
        update_post_meta($order_id, 'tienda_asignada', get_the_title($store_id));

        return new WP_REST_Response(array(
            'ok' => true,
            'order_id' => $order_id,
            'store_id' => $store_id,
            'store_name' => get_the_title($store_id),
        ));
    }
}
