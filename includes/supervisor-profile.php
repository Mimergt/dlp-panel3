<?php

if (!defined('ABSPATH')) {
    exit;
}

// Agrega un checkbox "Supervisor del panel DLP" al perfil de usuario en
// wp-admin, para marcar supervisores sin tener que tocar la base de datos ni
// depender de un rol de WordPress especifico (roles como "Gestor de la
// tienda"/shop_manager no implican supervisor por si solos). Guarda el mismo
// meta que ya usaba DLP_Paneles_REST::is_supervisor_user() manualmente.
class DLP_Paneles_Supervisor_Profile {
    const META_KEY = '_dlp_paneles_supervisor';

    public static function init() {
        add_action('show_user_profile', array(__CLASS__, 'render_field'));
        add_action('edit_user_profile', array(__CLASS__, 'render_field'));
        add_action('personal_options_update', array(__CLASS__, 'save_field'));
        add_action('edit_user_profile_update', array(__CLASS__, 'save_field'));
    }

    public static function render_field($user) {
        // Solo un administrador puede otorgar/quitar el acceso de
        // supervisor; un gestor de tienda no deberia poder auto-asignarselo.
        if (!current_user_can('manage_options')) {
            return;
        }

        $checked = get_user_meta($user->ID, self::META_KEY, true) === '1';
        ?>
        <h2><?php esc_html_e('DLP Paneles', 'dlp-paneles'); ?></h2>
        <table class="form-table" role="presentation">
            <tr>
                <th><label for="dlp_paneles_supervisor"><?php esc_html_e('Supervisor del panel', 'dlp-paneles'); ?></label></th>
                <td>
                    <label>
                        <input type="checkbox" name="dlp_paneles_supervisor" id="dlp_paneles_supervisor" value="1" <?php checked($checked); ?> />
                        <?php esc_html_e('Este usuario ve el panel de pedidos de todas las tiendas y puede bloquear clientes (supervisor)', 'dlp-paneles'); ?>
                    </label>
                    <p class="description"><?php esc_html_e('El rol de WordPress del usuario no importa para esto: es independiente del rol (ej. Gestor de la tienda). Sin marcar, el usuario solo ve pedidos de la tienda que tenga asignada.', 'dlp-paneles'); ?></p>
                </td>
            </tr>
        </table>
        <?php
    }

    public static function save_field($user_id) {
        if (!current_user_can('manage_options') || !current_user_can('edit_user', $user_id)) {
            return;
        }

        update_user_meta($user_id, self::META_KEY, isset($_POST['dlp_paneles_supervisor']) ? '1' : '0');
    }
}
