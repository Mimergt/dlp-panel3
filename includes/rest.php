<?php

if (!defined('ABSPATH')) {
    exit;
}

class DLP_Paneles_REST {
    public static function get_panel_statuses() {
        return array('processing', 'prep', 'dlv', 'rtp', 'completed');
    }

    public static function is_processing_status($status) {
        return in_array($status, array('processing', 'prep'), true);
    }

    public static function is_shipped_status($status) {
        return in_array($status, array('dlv', 'rtp'), true);
    }

    public static function is_completed_status($status) {
        return $status === 'completed';
    }

    // Mismo dato que usa el panel v2 via wc_display_item_meta(): WooCommerce ya
    // trae los modificadores (carne, complemento, bebida, upgrades) formateados
    // por producto en get_formatted_meta_data().
    public static function get_order_items_payload($order) {
        $items = array();

        foreach ($order->get_items() as $item) {
            $meta = array();
            foreach ($item->get_formatted_meta_data() as $meta_item) {
                $meta[] = array(
                    'label' => wp_strip_all_tags($meta_item->display_key),
                    'value' => wp_strip_all_tags($meta_item->display_value),
                );
            }

            $items[] = array(
                'name' => $item->get_name(),
                'quantity' => $item->get_quantity(),
                'total' => (float) $item->get_total(),
                'meta' => $meta,
            );
        }

        return $items;
    }

    public static function format_full_address($order) {
        $parts = array(
            $order->get_billing_address_1(),
            $order->get_billing_address_2(),
            $order->get_billing_city(),
        );

        return implode(', ', array_filter(array_map('trim', $parts)));
    }

    public static function parse_store_ids_from_value($value) {
        $result = array();

        if (is_array($value)) {
            foreach ($value as $item) {
                $result = array_merge($result, self::parse_store_ids_from_value($item));
            }
            return array_values(array_unique(array_filter(array_map('absint', $result))));
        }

        if (is_numeric($value)) {
            $store_id = absint($value);
            return $store_id ? array($store_id) : array();
        }

        if (is_string($value) && $value !== '') {
            $tokens = preg_split('/[^0-9]+/', $value);
            if (!is_array($tokens)) {
                return array();
            }

            return array_values(array_unique(array_filter(array_map('absint', $tokens))));
        }

        return array();
    }

    public static function get_user_assigned_store_ids_from_meta($user_id) {
        $store_ids = array();

        $meta_keys = array('extra_store_name', 'tienda_asignada');
        foreach ($meta_keys as $meta_key) {
            $raw_value = get_user_meta($user_id, $meta_key, true);
            $store_ids = array_merge($store_ids, self::parse_store_ids_from_value($raw_value));
        }

        return array_values(array_unique(array_filter(array_map('absint', $store_ids))));
    }

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
        $user = get_user_by('id', $user_id);
        if (!$user) {
            return false;
        }

        $roles = (array) $user->roles;
        if (in_array('multistore_user', $roles, true)) {
            return false;
        }

        if (user_can($user_id, 'manage_options')) {
            return true;
        }

        // Permite marcar supervisores sin depender de roles compartidos como shop_manager.
        return get_user_meta($user_id, '_dlp_paneles_supervisor', true) === '1';
    }

    public static function get_user_store_ids($user_id) {
        $by_user_meta = self::get_user_assigned_store_ids_from_meta($user_id);
        if (!empty($by_user_meta)) {
            return $by_user_meta;
        }

        // Fallback legacy: tiendas asociadas por meta en post extra_store.
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

        $base_args = array(
            'orderby' => 'date',
            'order' => 'DESC',
            'return' => 'ids',
        );

        if (!$supervisor) {
            if (empty($accessible_store_ids)) {
                return new WP_REST_Response(array(
                    'scope' => 'tienda',
                    'orders' => array(),
                    'counts' => array('processing' => 0, 'shipped' => 0, 'completed' => 0),
                    'stores' => array(),
                    'server_time' => current_time('mysql'),
                ));
            }

            $base_args['meta_query'] = array(
                array(
                    'key' => 'extra_store_name',
                    'value' => $accessible_store_ids,
                    'compare' => 'IN',
                    'type' => 'NUMERIC',
                ),
            );
        }

        // Mismo calculo que el panel v2 (manejoPedidos.php): current_time('timestamp')
        // vs WC_DateTime::getTimestamp() desalinea zonas horarias y produce elapsed_seconds
        // desbordado. Se usa hora local de servidor comparada contra el string formateado
        // de la fecha de creacion, igual que el panel v2, para mantener consistencia.
        $now_ts = strtotime(date('Y-m-d H:i:s')) - (3600 * 6);

        // Pedidos activos (Procesando / Enviada-LPR): sin limite de fecha, hasta 180 recientes.
        $active_args = array_merge($base_args, array(
            'limit' => 180,
            'status' => array('processing', 'prep', 'dlv', 'rtp'),
        ));
        $active_ids = wc_get_orders($active_args);

        // Completados: solo del dia operativo actual, para que la columna
        // "Completada" no crezca sin limite ni desplace pedidos activos.
        $today_start_ts = strtotime(date('Y-m-d') . ' 00:00:00') - (3600 * 6);
        $completed_args = array_merge($base_args, array(
            'limit' => 150,
            'status' => array('completed'),
            'date_created' => '>=' . $today_start_ts,
        ));
        $completed_ids = wc_get_orders($completed_args);

        $order_ids = array_merge($active_ids, $completed_ids);
        $counts = array('processing' => 0, 'shipped' => 0, 'completed' => 0);
        $result = array();

        foreach ($order_ids as $order_id) {
            $order = wc_get_order($order_id);
            if (!$order) {
                continue;
            }

            $status = $order->get_status();

            if (!self::is_processing_status($status) && !self::is_shipped_status($status) && !self::is_completed_status($status)) {
                continue;
            }

            $created = $order->get_date_created();
            $created_ts = $created ? strtotime($created->format('Y-m-d H:i:s')) : $now_ts;
            $store_id = absint(get_post_meta($order_id, 'extra_store_name', true));

            if (!$supervisor && !in_array($store_id, $accessible_store_ids, true)) {
                continue;
            }

            // Procesando incluye 'processing' y 'prep' (legacy): el panel ya no
            // distingue un paso intermedio de preparacion.
            if (self::is_processing_status($status)) {
                $group = 'processing';
            } elseif (self::is_shipped_status($status)) {
                $group = 'shipped';
            } else {
                $group = 'completed';
            }

            $counts[$group]++;

            $result[] = array(
                'id' => $order_id,
                'status' => $status,
                'group' => $group,
                'store_id' => $store_id,
                'store_name' => $store_id ? get_the_title($store_id) : '',
                'customer_name' => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
                'phone' => $order->get_billing_phone(),
                'address' => $order->get_billing_address_2(),
                'full_address' => self::format_full_address($order),
                'city' => $order->get_billing_city(),
                'elapsed_seconds' => max(0, $now_ts - $created_ts),
                'entry_time' => $created ? $created->format('H:i:s') : '',
                'priority' => get_post_meta($order_id, '_dlp_priority', true) === '1',
                'notes' => $order->get_customer_note(),
                'internal_note' => get_post_meta($order_id, '_dlp_internal_note', true),
                'payment_method_title' => $order->get_payment_method_title(),
                'total' => (float) $order->get_total(),
                'items' => self::get_order_items_payload($order),
                'items_count' => count($order->get_items()),
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

        // Flujo operativo: Procesando -> Enviada/LPR -> Completada.
        // 'prep' se mantiene como origen valido solo por compatibilidad con
        // pedidos legacy que hayan quedado en ese estado.
        $transitions = array(
            'processing' => array('dlv', 'rtp'),
            'prep' => array('dlv', 'rtp'),
            'dlv' => array('completed'),
            'rtp' => array('completed'),
        );

        if (self::is_supervisor_user($user_id)) {
            $transitions = array(
                'processing' => array('dlv', 'rtp'),
                'prep' => array('processing', 'dlv', 'rtp'),
                'dlv' => array('processing', 'completed'),
                'rtp' => array('processing', 'completed'),
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
