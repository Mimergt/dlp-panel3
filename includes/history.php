<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Historial de pedidos (solo lectura) para /orders/historial/.
 *
 * Estrategia: el navegador descarga una sola vez un indice liviano de los
 * pedidos de los ultimos N dias (por paginas) y despues solo pide los
 * cambios desde la ultima sincronizacion (delta por date_modified). La
 * busqueda corre en el navegador sobre ese indice, asi el servidor no
 * ejecuta una busqueda por cada tecla. El detalle completo de un pedido
 * se pide solo al abrirlo.
 */
class DLP_Paneles_History {
    const DEFAULT_DAYS = 30;
    const MAX_DAYS = 90;
    const INDEX_PAGE_SIZE = 250;
    const DELTA_LIMIT = 500;

    public static function init() {
        add_action('rest_api_init', array(__CLASS__, 'register_routes'));
    }

    public static function max_days() {
        return max(1, (int) apply_filters('dlp_paneles_history_max_days', self::MAX_DAYS));
    }

    public static function register_routes() {
        register_rest_route('dlp-paneles/v1', '/historial/indice', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array(__CLASS__, 'get_index'),
            'permission_callback' => array('DLP_Paneles_REST', 'can_access_panel'),
            'args' => array(
                'days' => array('required' => false, 'type' => 'integer'),
                'since' => array('required' => false, 'type' => 'integer'),
                'page' => array('required' => false, 'type' => 'integer'),
            ),
        ));

        register_rest_route('dlp-paneles/v1', '/historial/pedido/(?P<id>\\d+)', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array(__CLASS__, 'get_order_detail'),
            'permission_callback' => array('DLP_Paneles_REST', 'can_access_panel'),
        ));
    }

    // Estados que el usuario puede consultar: el supervisor ve completados y
    // cancelados; la tienda solo completados (mismo criterio que el tablero).
    private static function visible_statuses($supervisor) {
        return $supervisor ? array('completed', 'cancelled') : array('completed');
    }

    private static function store_id($order) {
        return absint($order->get_meta('extra_store_name'));
    }

    private static function order_type($order) {
        return $order->get_meta('woofood_order_type') === 'pickup' ? 'pickup' : 'delivery';
    }

    private static function index_row($order) {
        $created = $order->get_date_created();

        return array(
            'id' => $order->get_id(),
            'g' => $order->get_status() === 'cancelled' ? 'cancelled' : 'completed',
            't' => self::order_type($order),
            's' => self::store_id($order),
            'n' => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
            'p' => (string) $order->get_billing_phone(),
            'e' => (string) $order->get_billing_email(),
            'tot' => (float) $order->get_total(),
            'c' => $created ? $created->getTimestamp() : 0,
        );
    }

    private static function store_names($store_ids) {
        $names = array();
        foreach ($store_ids as $store_id) {
            $names[(string) $store_id] = get_the_title($store_id);
        }
        return $names;
    }

    // Indice liviano. Sin "since": descarga completa paginada de la ventana
    // de "days" dias. Con "since": solo pedidos modificados desde esa marca
    // (completados nuevos, cambios de tienda/estado) y los ids a descartar.
    public static function get_index(WP_REST_Request $request) {
        $user_id = get_current_user_id();
        $supervisor = DLP_Paneles_REST::is_supervisor_user($user_id);
        $store_ids = DLP_Paneles_REST::get_accessible_store_ids($user_id);
        $statuses = self::visible_statuses($supervisor);

        $days = absint($request->get_param('days')) ?: self::DEFAULT_DAYS;
        $days = min($days, self::max_days());
        $min_ts = time() - ($days * DAY_IN_SECONDS);
        $since = absint($request->get_param('since'));
        $server_ts = time();

        $response = array(
            'scope' => $supervisor ? 'supervisor' : 'tienda',
            'days' => $days,
            'stores' => DLP_Paneles_REST::format_store_list($store_ids),
            'server_ts' => $server_ts,
            'rows' => array(),
            'removed' => array(),
            'has_more' => false,
            'total' => 0,
            'resync' => false,
        );

        if (empty($store_ids)) {
            return new WP_REST_Response($response);
        }

        if ($since > 0) {
            // Delta: pedidos tocados desde la ultima sincronizacion, de
            // cualquier tienda, para poder avisar cuales ya no corresponden
            // (ej. reasignados a otra tienda).
            $modified = wc_get_orders(array(
                'date_modified' => '>=' . max(0, $since - 5),
                'orderby' => 'modified',
                'order' => 'DESC',
                'limit' => self::DELTA_LIMIT + 1,
                'return' => 'objects',
            ));

            if (count($modified) > self::DELTA_LIMIT) {
                $response['resync'] = true;
                return new WP_REST_Response($response);
            }

            foreach ($modified as $order) {
                $created = $order->get_date_created();
                $eligible = in_array($order->get_status(), $statuses, true)
                    && $created && $created->getTimestamp() >= $min_ts
                    && ($supervisor || in_array(self::store_id($order), $store_ids, true));

                if ($eligible) {
                    $response['rows'][] = self::index_row($order);
                } else {
                    $response['removed'][] = $order->get_id();
                }
            }

            $response['total'] = count($response['rows']);
            return new WP_REST_Response($response);
        }

        // wc_get_orders ignora meta_query en el almacenamiento clasico, asi
        // que el filtro por tienda se aplica aqui sobre los ids (consulta
        // barata: solo ids + una carga de metas) y solo se hidratan los
        // pedidos de la pagina pedida.
        $ids = wc_get_orders(array(
            'status' => $statuses,
            'date_created' => '>=' . $min_ts,
            'orderby' => 'date',
            'order' => 'DESC',
            'limit' => -1,
            'return' => 'ids',
        ));

        if (!$supervisor && !empty($ids)) {
            update_meta_cache('post', $ids);
            $ids = array_values(array_filter($ids, function ($id) use ($store_ids) {
                return in_array(absint(get_post_meta($id, 'extra_store_name', true)), $store_ids, true);
            }));
        }

        $page = max(1, absint($request->get_param('page')) ?: 1);
        $slice = array_slice($ids, ($page - 1) * self::INDEX_PAGE_SIZE, self::INDEX_PAGE_SIZE);

        foreach ($slice as $order_id) {
            $order = wc_get_order($order_id);
            if ($order) {
                $response['rows'][] = self::index_row($order);
            }
        }

        $response['total'] = count($ids);
        $response['has_more'] = ($page * self::INDEX_PAGE_SIZE) < count($ids);

        return new WP_REST_Response($response);
    }

    // Detalle completo de un pedido (mismos campos que usa el tablero), con
    // el tiempo total congelado y sin datos de geolocalizacion ni acciones.
    public static function get_order_detail(WP_REST_Request $request) {
        $order_id = absint($request['id']);
        $order = wc_get_order($order_id);

        if (!$order) {
            return new WP_REST_Response(array('message' => 'Pedido no encontrado'), 404);
        }

        $user_id = get_current_user_id();
        $supervisor = DLP_Paneles_REST::is_supervisor_user($user_id);

        if (!DLP_Paneles_REST::user_can_access_order($order, $user_id)
            || !in_array($order->get_status(), self::visible_statuses($supervisor), true)) {
            return new WP_REST_Response(array('message' => 'No autorizado para este pedido'), 403);
        }

        $status = $order->get_status();
        $created = $order->get_date_created();
        $completed = $order->get_date_completed();
        $store_id = self::store_id($order);
        $type = self::order_type($order);
        $elapsed = ($created && $completed && $status === 'completed')
            ? max(0, $completed->getTimestamp() - $created->getTimestamp())
            : 0;

        $pt = get_post_meta($order_id, 'woofood_time_to_deliver', true);

        return new WP_REST_Response(array(
            'id' => $order_id,
            'status' => $status,
            'group' => $status === 'cancelled' ? 'cancelled' : 'completed',
            'order_type' => $type,
            'pickup_time' => ($type === 'pickup' && is_numeric($pt) && (int) $pt > 1000000000) ? wp_date('g:i a', (int) $pt) : '',
            'store_id' => $store_id,
            'store_name' => $store_id ? get_the_title($store_id) : '',
            'customer_name' => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
            'phone' => $order->get_billing_phone(),
            'email' => $order->get_billing_email(),
            'full_address' => DLP_Paneles_REST::format_full_address($order),
            'elapsed_seconds' => $elapsed,
            'created_label' => $created ? wp_date('d/m/Y H:i', $created->getTimestamp()) : '',
            'completed_label' => ($completed && $status === 'completed') ? wp_date('d/m/Y H:i', $completed->getTimestamp()) : '',
            'notes' => $order->get_customer_note(),
            'payment_method_title' => $order->get_payment_method_title(),
            'total' => (float) $order->get_total(),
            'items' => DLP_Paneles_REST::get_order_items_payload($order),
            'items_count' => count($order->get_items()),
            'nit' => (string) get_post_meta($order_id, 'billing_nit', true),
            'nit_nombre' => (string) get_post_meta($order_id, 'billing_nitname', true),
            'cancel_reason' => $status === 'cancelled' ? (string) get_post_meta($order_id, '_motivo_cancelacion_tienda', true) : '',
        ));
    }
}
