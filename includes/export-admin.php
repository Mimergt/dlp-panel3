<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Pagina de admin "Reportes DLP" (WooCommerce > Reportes DLP): descarga el
 * Excel de pedidos de cualquier tienda, o de todas, sin entrar a los paneles.
 * A diferencia del panel, aqui se pueden incluir pedidos cancelados.
 */
class DLP_Paneles_Export_Admin {
    const CAP = 'manage_woocommerce';
    const ACTION = 'dlp_paneles_export';
    const PAGE = 'dlp-reportes';

    public static function init() {
        add_action('admin_menu', array(__CLASS__, 'register_menu'));
        add_action('admin_post_' . self::ACTION, array(__CLASS__, 'handle_download'));
    }

    public static function register_menu() {
        add_submenu_page('woocommerce', 'Reportes DLP', 'Reportes DLP', self::CAP, self::PAGE, array(__CLASS__, 'render_page'));
    }

    private static function stores() {
        $stores = DLP_Paneles_REST::format_store_list(DLP_Paneles_REST::get_all_store_ids());
        usort($stores, function ($a, $b) {
            return strcasecmp($a['name'], $b['name']);
        });
        return $stores;
    }

    public static function render_page() {
        if (!current_user_can(self::CAP)) {
            wp_die('No tienes permiso para ver esta pagina.');
        }

        $today = wp_date('Y-m-d');
        $week_ago = wp_date('Y-m-d', time() - 6 * DAY_IN_SECONDS);
        $max_days = DLP_Paneles_Export::ADMIN_MAX_DAYS;
        ?>
        <div class="wrap">
            <h1>Reportes DLP</h1>
            <p>Descarga el Excel de pedidos. Una fila por producto del pedido, con los extras agrupados por tipo (Carne, Bebida, Complemento y Otros extras) y una hoja "Resumen" con los totales y la explicacion del archivo. Rango maximo: 6 meses. Las fechas son las de completado del pedido (en los cancelados, la de creacion), hora de Guatemala.</p>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" id="dlp-export-form">
                <input type="hidden" name="action" value="<?php echo esc_attr(self::ACTION); ?>">
                <?php wp_nonce_field(self::ACTION); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="dlp-export-tienda">Tienda</label></th>
                        <td>
                            <select name="tienda" id="dlp-export-tienda">
                                <option value="0">Todas las tiendas</option>
                                <?php foreach (self::stores() as $store) : ?>
                                    <option value="<?php echo (int) $store['id']; ?>"><?php echo esc_html($store['name']); ?></option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="dlp-export-desde">Desde</label></th>
                        <td><input type="date" name="desde" id="dlp-export-desde" value="<?php echo esc_attr($week_ago); ?>" max="<?php echo esc_attr($today); ?>" required></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="dlp-export-hasta">Hasta</label></th>
                        <td>
                            <input type="date" name="hasta" id="dlp-export-hasta" value="<?php echo esc_attr($today); ?>" max="<?php echo esc_attr($today); ?>" required>
                            <p>
                                <button type="button" class="button" data-dlp-range="7">Ultimos 7 dias</button>
                                <button type="button" class="button" data-dlp-range="30">Ultimos 30 dias</button>
                                <button type="button" class="button" data-dlp-range="mes">Este mes</button>
                                <button type="button" class="button" data-dlp-range="mes-pasado">Mes pasado</button>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Estados</th>
                        <td>
                            <label><input type="checkbox" name="cancelados" value="1"> Incluir pedidos cancelados (agrega la columna Estado)</label>
                            <p class="description">Sin marcar, solo salen pedidos completados.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button('Descargar Excel', 'primary', 'submit', false); ?>
                <p class="description">Con muchos pedidos puede tardar unos segundos; no cierres la pagina hasta que empiece la descarga. Maximo <?php echo (int) $max_days; ?> dias por archivo.</p>
            </form>
        </div>
        <script>
        (function () {
            var from = document.getElementById('dlp-export-desde');
            var to = document.getElementById('dlp-export-hasta');
            var today = <?php echo wp_json_encode($today); ?>;
            function iso(d) {
                return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            }
            function parse(s) {
                var p = s.split('-');
                return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
            }
            document.querySelectorAll('[data-dlp-range]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var t = parse(today);
                    var kind = btn.getAttribute('data-dlp-range');
                    if (kind === '7' || kind === '30') {
                        var s = parse(today);
                        s.setDate(s.getDate() - (Number(kind) - 1));
                        from.value = iso(s);
                        to.value = today;
                    } else if (kind === 'mes') {
                        from.value = iso(new Date(t.getFullYear(), t.getMonth(), 1));
                        to.value = today;
                    } else {
                        from.value = iso(new Date(t.getFullYear(), t.getMonth() - 1, 1));
                        to.value = iso(new Date(t.getFullYear(), t.getMonth(), 0));
                    }
                });
            });
        })();
        </script>
        <?php
    }

    public static function handle_download() {
        if (!current_user_can(self::CAP)) {
            wp_die('No tienes permiso para descargar este reporte.', '', array('response' => 403));
        }
        check_admin_referer(self::ACTION);

        $back = '<p><a href="' . esc_url(admin_url('admin.php?page=' . self::PAGE)) . '">Volver a Reportes DLP</a></p>';

        $range = DLP_Paneles_Export::parse_range(
            isset($_POST['desde']) ? wp_unslash($_POST['desde']) : '',
            isset($_POST['hasta']) ? wp_unslash($_POST['hasta']) : '',
            DLP_Paneles_Export::ADMIN_MAX_DAYS
        );
        if (is_wp_error($range)) {
            wp_die(esc_html($range->get_error_message()) . $back, 'Reporte', array('response' => 400));
        }

        $store_id = isset($_POST['tienda']) ? absint($_POST['tienda']) : 0;
        if ($store_id && !in_array($store_id, DLP_Paneles_REST::get_all_store_ids(), true)) {
            wp_die('Tienda no valida.' . $back, 'Reporte', array('response' => 400));
        }

        $with_cancelled = !empty($_POST['cancelados']);
        $result = DLP_Paneles_Export::run(get_current_user_id(), array_merge($range, array(
            'statuses' => $with_cancelled ? array('completed', 'cancelled') : array('completed'),
            'store_ids' => $store_id ? array($store_id) : null,
            'with_status' => $with_cancelled,
            'label' => $store_id ? get_the_title($store_id) : 'todas',
        )));
        if (is_wp_error($result)) {
            wp_die(esc_html($result->get_error_message()) . $back, 'Reporte', array('response' => 400));
        }

        DLP_Paneles_Export::send_file($result['path'], $result['filename']);
    }
}
