<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Roles propios del panel de pedidos, para no depender del rol heredado de
 * WooFood Multistore (`multistore_user`), que ademas de operar pedidos da
 * acceso a WooCommerce en wp-admin.
 *
 * - dlp_tienda: opera el panel de su tienda. Solo `read`.
 * - dlp_supervisor: ve el panel de todas las tiendas y la pagina de reportes. Solo `read`.
 *
 * Los administradores (manage_options) siguen siendo supervisores sin necesitar
 * ningun rol adicional (ver DLP_Paneles_REST::is_supervisor_user).
 */
class DLP_Paneles_Roles {
    const SUPERVISOR = 'dlp_supervisor';
    const STORE = 'dlp_tienda';
    const LEGACY_STORE = 'multistore_user';

    public static function init() {
        add_action('init', array(__CLASS__, 'ensure_roles'), 5);

        if (defined('WP_CLI') && WP_CLI) {
            WP_CLI::add_command('dlp-paneles migrar-roles', array(__CLASS__, 'cli_migrate'));
        }
    }

    public static function ensure_roles() {
        if (!get_role(self::SUPERVISOR)) {
            add_role(self::SUPERVISOR, 'Supervisor DLP', array('read' => true));
        }
        if (!get_role(self::STORE)) {
            add_role(self::STORE, 'Tienda DLP', array('read' => true));
        }
    }

    // Roles que cuentan como "usuario de tienda" (el nuevo y el heredado, mientras convivan).
    public static function store_roles() {
        return array(self::STORE, self::LEGACY_STORE);
    }

    /**
     * Pasa a los usuarios del rol heredado `multistore_user` al rol `dlp_tienda`.
     * La tienda asignada no cambia (vive en la tienda, meta `extra_store_user`).
     * Sin --ejecutar solo muestra lo que haria.
     *
     * ## OPTIONS
     *
     * [--ejecutar]
     * : Aplica el cambio. Sin esta opcion es una simulacion.
     *
     * @when after_wp_load
     */
    public static function cli_migrate($args, $assoc_args) {
        self::ensure_roles();
        $apply = !empty($assoc_args['ejecutar']);

        $users = get_users(array('role' => self::LEGACY_STORE, 'fields' => 'ID', 'number' => -1));
        WP_CLI::log(count($users) . ' usuario(s) con el rol ' . self::LEGACY_STORE . ($apply ? '' : ' (simulacion, usa --ejecutar para aplicar)'));

        $done = 0;
        foreach ($users as $user_id) {
            $user = get_userdata($user_id);
            if (!$user) {
                continue;
            }
            WP_CLI::log('  ' . $user_id . ' ' . $user->user_login . ' -> ' . self::STORE);
            if ($apply) {
                $user->add_role(self::STORE);
                $user->remove_role(self::LEGACY_STORE);
                $done++;
            }
        }

        WP_CLI::success($apply ? $done . ' usuario(s) migrados.' : 'Nada se modifico.');
    }
}
