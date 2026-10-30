<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Escritor minimo de .xlsx en streaming (ZipArchive + XMLWriter, sin librerias).
 * Las filas se escriben a un archivo temporal a medida que llegan, asi la
 * memoria no crece con el tamano del reporte. Textos como inlineStr.
 */
class DLP_Paneles_Xlsx_Writer {
    private $headers;
    private $widths;
    private $sheet_path;
    private $xml;
    private $rows = 0;

    public function __construct(array $headers, array $widths) {
        $this->headers = array_values($headers);
        $this->widths = $widths;
        $this->sheet_path = wp_tempnam('dlp-xlsx-sheet');
        $this->xml = new XMLWriter();
        $this->xml->openUri($this->sheet_path);
        $this->xml->startDocument('1.0', 'UTF-8', 'yes');
        $this->xml->startElement('worksheet');
        $this->xml->writeAttribute('xmlns', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        $this->xml->startElement('sheetViews');
        $this->xml->startElement('sheetView');
        $this->xml->writeAttribute('workbookViewId', '0');
        $this->xml->startElement('pane');
        $this->xml->writeAttribute('ySplit', '1');
        $this->xml->writeAttribute('topLeftCell', 'A2');
        $this->xml->writeAttribute('activePane', 'bottomLeft');
        $this->xml->writeAttribute('state', 'frozen');
        $this->xml->endElement();
        $this->xml->endElement();
        $this->xml->endElement();

        $this->xml->startElement('cols');
        foreach ($this->headers as $i => $unused) {
            $this->xml->startElement('col');
            $this->xml->writeAttribute('min', (string) ($i + 1));
            $this->xml->writeAttribute('max', (string) ($i + 1));
            $this->xml->writeAttribute('width', (string) (isset($this->widths[$i]) ? $this->widths[$i] : 16));
            $this->xml->writeAttribute('customWidth', '1');
            $this->xml->endElement();
        }
        $this->xml->endElement();

        $this->xml->startElement('sheetData');
        $this->write_row($this->headers, 1);
    }

    public function add_row(array $cells) {
        $this->write_row(array_values($cells), 0);
    }

    public function row_count() {
        return $this->rows;
    }

    private static function col_letter($index) {
        $letter = '';
        $n = $index + 1;
        while ($n > 0) {
            $mod = ($n - 1) % 26;
            $letter = chr(65 + $mod) . $letter;
            $n = intdiv($n - $mod - 1, 26);
        }
        return $letter;
    }

    // Quita los caracteres que XML 1.0 no admite (rompen el archivo en Excel).
    private static function clean($text) {
        return (string) preg_replace('/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u', '', (string) $text);
    }

    // $style: 1 = encabezado. Los float se escriben con 2 decimales (estilo 2).
    private function write_row(array $cells, $style) {
        $this->rows++;
        $r = $this->rows;
        $this->xml->startElement('row');
        $this->xml->writeAttribute('r', (string) $r);

        foreach ($cells as $i => $value) {
            if ($value === '' || $value === null) {
                continue;
            }
            $this->xml->startElement('c');
            $this->xml->writeAttribute('r', self::col_letter($i) . $r);
            if ($style) {
                $this->xml->writeAttribute('s', (string) $style);
            }
            if (is_int($value) || is_float($value)) {
                if (is_float($value) && !$style) {
                    $this->xml->writeAttribute('s', '2');
                }
                $this->xml->writeElement('v', (string) $value);
            } else {
                $this->xml->writeAttribute('t', 'inlineStr');
                $this->xml->startElement('is');
                $this->xml->startElement('t');
                $this->xml->writeAttribute('xml:space', 'preserve');
                $this->xml->text(self::clean($value));
                $this->xml->endElement();
                $this->xml->endElement();
            }
            $this->xml->endElement();
        }

        $this->xml->endElement();

        if (($r % 200) === 0) {
            $this->xml->flush();
        }
    }

    // Cierra la hoja y empaqueta el .xlsx. Devuelve la ruta del archivo temporal.
    public function finish() {
        $this->xml->endElement(); // sheetData
        $this->xml->startElement('autoFilter');
        $this->xml->writeAttribute('ref', 'A1:' . self::col_letter(count($this->headers) - 1) . max(1, $this->rows));
        $this->xml->endElement();
        $this->xml->endElement(); // worksheet
        $this->xml->endDocument();
        $this->xml->flush();

        $xlsx_path = wp_tempnam('dlp-xlsx');
        $zip = new ZipArchive();
        if ($zip->open($xlsx_path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            @unlink($this->sheet_path);
            return false;
        }

        $zip->addFromString('[Content_Types].xml',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' .
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' .
            '<Default Extension="xml" ContentType="application/xml"/>' .
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' .
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' .
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' .
            '</Types>');
        $zip->addFromString('_rels/.rels',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' .
            '</Relationships>');
        $zip->addFromString('xl/workbook.xml',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' .
            '<sheets><sheet name="Pedidos" sheetId="1" r:id="rId1"/></sheets></workbook>');
        $zip->addFromString('xl/_rels/workbook.xml.rels',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' .
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' .
            '</Relationships>');
        $zip->addFromString('xl/styles.xml',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' .
            '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' .
            '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' .
            '<fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF3"/><bgColor indexed="64"/></patternFill></fill></fills>' .
            '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' .
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' .
            '<cellXfs count="3">' .
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' .
            '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' .
            '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' .
            '</cellXfs></styleSheet>');
        $zip->addFile($this->sheet_path, 'xl/worksheets/sheet1.xml');
        $zip->close();

        @unlink($this->sheet_path);
        return $xlsx_path;
    }

    public function abort() {
        @unlink($this->sheet_path);
    }
}

/**
 * Exportacion de pedidos a Excel. Un solo exportador para el historial del
 * panel (REST, descarga directa) y para el admin (admin-post).
 *
 * Una fila por pedido. Los extras de cada producto se agrupan en una celda por
 * grupo (Carne, Bebida, Complemento...) para que el archivo no crezca a lo
 * ancho. Los pedidos se leen por lotes y se escriben en streaming.
 */
class DLP_Paneles_Export {
    const PANEL_MAX_DAYS = 92;
    const ADMIN_MAX_DAYS = 183;
    const MAX_ROWS = 20000;
    const CHUNK = 200;
    const LOCK_SECONDS = 180;

    private static $store_titles = array();

    public static function init() {
        add_action('rest_api_init', array(__CLASS__, 'register_routes'));
    }

    public static function register_routes() {
        register_rest_route('dlp-paneles/v1', '/historial/exportar', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array(__CLASS__, 'rest_export'),
            'permission_callback' => array('DLP_Paneles_REST', 'can_access_panel'),
            'args' => array(
                'desde' => array('required' => true, 'type' => 'string'),
                'hasta' => array('required' => true, 'type' => 'string'),
                'tienda' => array('required' => false, 'type' => 'integer'),
            ),
        ));
    }

    // ---- entrada desde el panel (REST) ----

    public static function rest_export(WP_REST_Request $request) {
        $user_id = get_current_user_id();
        $supervisor = DLP_Paneles_REST::is_supervisor_user($user_id);
        $accessible = DLP_Paneles_REST::get_accessible_store_ids($user_id);

        $range = self::parse_range($request->get_param('desde'), $request->get_param('hasta'), self::PANEL_MAX_DAYS);
        if (is_wp_error($range)) {
            return $range;
        }

        // El servidor decide que tiendas puede exportar este usuario: el
        // supervisor todas (sin filtro) o una; una tienda solo las suyas.
        $requested = absint($request->get_param('tienda'));
        $store_ids = null;
        if ($requested) {
            if (!in_array($requested, $accessible, true)) {
                return new WP_Error('dlp_export_forbidden', 'No tienes acceso a esa tienda.', array('status' => 403));
            }
            $store_ids = array($requested);
        } elseif (!$supervisor) {
            $store_ids = $accessible;
            if (empty($store_ids)) {
                return new WP_Error('dlp_export_forbidden', 'No tienes tiendas asignadas.', array('status' => 403));
            }
        }

        $result = self::run($user_id, array_merge($range, array(
            'statuses' => array('completed'),
            'store_ids' => $store_ids,
            'with_status' => false,
            'label' => $requested ? self::store_title($requested) : 'todas',
        )));
        if (is_wp_error($result)) {
            return $result;
        }

        self::send_file($result['path'], $result['filename']);
    }

    // ---- nucleo ----

    // Valida "YYYY-MM-DD" en America/Guatemala (zona del sitio) y devuelve las marcas de tiempo.
    public static function parse_range($desde, $hasta, $max_days) {
        $desde = trim((string) $desde);
        $hasta = trim((string) $hasta);
        $ok = function ($d) {
            return preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $d, $m) && checkdate((int) $m[2], (int) $m[3], (int) $m[1]);
        };
        if (!$ok($desde) || !$ok($hasta)) {
            return new WP_Error('dlp_export_dates', 'Fechas no validas.', array('status' => 400));
        }

        $tz = wp_timezone();
        $from = new DateTimeImmutable($desde . ' 00:00:00', $tz);
        $to = new DateTimeImmutable($hasta . ' 23:59:59', $tz);
        if ($to < $from) {
            return new WP_Error('dlp_export_dates', 'La fecha final es anterior a la inicial.', array('status' => 400));
        }

        $days = (int) floor(($to->getTimestamp() - $from->getTimestamp()) / DAY_IN_SECONDS) + 1;
        if ($days > $max_days) {
            return new WP_Error('dlp_export_range', 'El rango maximo es de ' . $max_days . ' dias.', array('status' => 400));
        }

        return array(
            'from_ts' => $from->getTimestamp(),
            'to_ts' => $to->getTimestamp(),
            'desde' => $desde,
            'hasta' => $hasta,
        );
    }

    // Genera el archivo. $args: from_ts, to_ts, desde, hasta, statuses, store_ids (null = todas), with_status, label.
    public static function run($user_id, array $args) {
        $lock_key = 'dlp_export_lock_' . (int) $user_id;
        if (get_transient($lock_key)) {
            return new WP_Error('dlp_export_busy', 'Ya hay una exportacion en curso. Espera unos segundos e intenta de nuevo.', array('status' => 429));
        }
        set_transient($lock_key, 1, self::LOCK_SECONDS);
        register_shutdown_function(function () use ($lock_key) {
            delete_transient($lock_key);
        });

        if (function_exists('wp_raise_memory_limit')) {
            wp_raise_memory_limit('admin');
        }
        @set_time_limit(300);

        $ids = self::order_ids($args['from_ts'], $args['to_ts'], $args['statuses'], $args['store_ids']);
        if (count($ids) > self::MAX_ROWS) {
            return new WP_Error('dlp_export_too_big', 'Hay ' . count($ids) . ' pedidos en ese rango; acota las fechas o la tienda.', array('status' => 400));
        }

        $columns = self::columns($args['with_status']);
        $writer = new DLP_Paneles_Xlsx_Writer(array_keys($columns), array_values($columns));

        foreach (array_chunk($ids, self::CHUNK) as $slice) {
            foreach ($slice as $id) {
                $order = wc_get_order($id);
                if ($order) {
                    $writer->add_row(self::build_row($order, $args['with_status']));
                }
            }
            unset($order);
            if (function_exists('wp_cache_flush_runtime')) {
                wp_cache_flush_runtime();
            }
        }

        $path = $writer->finish();
        if (!$path) {
            return new WP_Error('dlp_export_zip', 'No se pudo generar el archivo.', array('status' => 500));
        }

        $label = sanitize_title($args['label']);
        return array(
            'path' => $path,
            'rows' => count($ids),
            'filename' => 'Pedidos-' . ($label !== '' ? $label : 'todas') . '-' . $args['desde'] . '-' . $args['hasta'] . '.xlsx',
        );
    }

    // Ids de pedidos por fecha de creacion (igual que el historial), orden cronologico.
    private static function order_ids($from_ts, $to_ts, array $statuses, $store_ids) {
        $query = array(
            'status' => $statuses,
            'date_created' => $from_ts . '...' . $to_ts,
            'orderby' => 'date',
            'order' => 'ASC',
            'limit' => -1,
            'return' => 'ids',
        );

        if (empty($store_ids)) {
            return array_map('absint', wc_get_orders($query));
        }

        if (DLP_Paneles_REST::hpos_enabled()) {
            $query['meta_query'] = array(array('key' => 'extra_store_name', 'value' => array_values($store_ids), 'compare' => 'IN', 'type' => 'NUMERIC'));
            return array_map('absint', wc_get_orders($query));
        }

        // Almacenamiento clasico: wc_get_orders ignora meta_query, se filtra aqui.
        $ids = array_map('absint', wc_get_orders($query));
        if (!empty($ids)) {
            update_meta_cache('post', $ids);
            $ids = array_values(array_filter($ids, function ($id) use ($store_ids) {
                return in_array(absint(get_post_meta($id, 'extra_store_name', true)), $store_ids, true);
            }));
        }
        return $ids;
    }

    // Encabezado => ancho de columna.
    private static function columns($with_status) {
        $cols = array('ID' => 10, 'Fecha y hora' => 19);
        if ($with_status) {
            $cols['Estado'] = 12;
        }
        return array_merge($cols, array(
            'Tienda' => 18,
            'Tiempo del Pedido' => 16,
            'Delivery / Pickup' => 16,
            'Device' => 14,
            'Dirección' => 42,
            'Método de pago' => 24,
            'authorizationNumber' => 18,
            'referenceNumber' => 18,
            'Nombres' => 18,
            'Apellidos' => 18,
            'Correo' => 28,
            'Nombre NIT' => 24,
            'NIT' => 14,
            'Productos' => 44,
            'Carne' => 28,
            'Bebida' => 28,
            'Complemento' => 28,
            'Carne (Box)' => 28,
            'Bebida (Box)' => 28,
            'Costilla' => 20,
            'Otros extras' => 28,
            'Total' => 12,
        ));
    }

    private static function store_title($store_id) {
        $store_id = absint($store_id);
        if (!isset(self::$store_titles[$store_id])) {
            self::$store_titles[$store_id] = $store_id ? html_entity_decode(get_the_title($store_id), ENT_QUOTES, 'UTF-8') : '';
        }
        return self::$store_titles[$store_id];
    }

    // Grupo de extras (nombre libre de Product Add-Ons / WooFood) => columna del reporte.
    private static function extra_column($group) {
        $g = mb_strtolower((string) $group);
        $box = strpos($g, 'box') !== false;
        if (strpos($g, 'carne') !== false) {
            return $box ? 'Carne (Box)' : 'Carne';
        }
        if (strpos($g, 'bebida') !== false) {
            return $box ? 'Bebida (Box)' : 'Bebida';
        }
        if (strpos($g, 'complemento') !== false) {
            return 'Complemento';
        }
        if (strpos($g, 'costilla') !== false) {
            return 'Costilla';
        }
        return 'Otros extras';
    }

    // "APP Android" / "App iOS" / "Web y otros": la app abre la web en un webview con ?origin=webview&device=...
    private static function device_label($order) {
        $landing = html_entity_decode((string) $order->get_meta('handl_landing_page', true));
        $device = strtolower((string) $order->get_meta('device', true));
        if (stripos($landing, 'origin=webview') !== false) {
            if (stripos($landing, 'device=ios') !== false) {
                return 'App iOS';
            }
            if (stripos($landing, 'device=android') !== false) {
                return 'APP Android';
            }
        } elseif ($landing === '') {
            if ($device === 'android') {
                return 'APP Android';
            }
            if ($device === 'ios') {
                return 'App iOS';
            }
        }
        return 'Web y otros';
    }

    private static function qty_label($qty) {
        $qty = (float) $qty;
        return ($qty == (int) $qty) ? (string) (int) $qty : (string) $qty;
    }

    private static function build_row($order, $with_status) {
        $created = $order->get_date_created();

        $store_id = absint($order->get_meta('extra_store_name', true));
        $store = $store_id ? self::store_title($store_id) : trim((string) $order->get_meta('tienda_asignada', true));

        $nit = (string) $order->get_meta('billing_nit', true);
        $nit_name = (string) $order->get_meta('billing_nitname', true);
        if ($nit === '') {
            $nit = (string) $order->get_meta('_billing_nit', true);
        }
        if ($nit_name === '') {
            $nit_name = (string) $order->get_meta('_billing_nitname', true);
        }

        $items = DLP_Paneles_REST::get_order_items_payload($order);
        $products = array();
        $extras = array();
        $multi = count($items) > 1;
        foreach ($items as $idx => $item) {
            $name = trim(wp_strip_all_tags($item['name']));
            $products[] = self::qty_label($item['quantity']) . 'x ' . $name;
            foreach ($item['extras'] as $extra) {
                $value = trim($extra['name']);
                if ($value === '') {
                    continue;
                }
                $extras[self::extra_column($extra['group'])][$idx][] = $value;
            }
        }

        $extra_cells = array();
        foreach (array('Carne', 'Bebida', 'Complemento', 'Carne (Box)', 'Bebida (Box)', 'Costilla', 'Otros extras') as $col) {
            $parts = array();
            foreach (isset($extras[$col]) ? $extras[$col] : array() as $idx => $values) {
                $text = implode(', ', $values);
                $parts[] = $multi ? trim(wp_strip_all_tags($items[$idx]['name'])) . ': ' . $text : $text;
            }
            $extra_cells[] = implode(' | ', $parts);
        }

        $row = array(
            $order->get_id(),
            $created ? wp_date('Y-m-d H:i:s', $created->getTimestamp()) : '',
        );
        if ($with_status) {
            $row[] = $order->get_status() === 'cancelled' ? 'Cancelado' : 'Completado';
        }

        return array_merge($row, array(
            $store,
            (string) $order->get_meta('tiempo_total', true),
            $order->get_meta('woofood_order_type', true) === 'pickup' ? 'pickup' : 'delivery',
            self::device_label($order),
            DLP_Paneles_REST::format_full_address($order),
            $order->get_payment_method_title(),
            (string) $order->get_meta('authorizationNumber', true),
            (string) $order->get_meta('referenceNumber', true),
            $order->get_billing_first_name(),
            $order->get_billing_last_name(),
            $order->get_billing_email(),
            $nit_name,
            $nit,
            implode(' | ', $products),
        ), $extra_cells, array((float) $order->get_total()));
    }

    // Entrega el archivo temporal como descarga y termina la peticion.
    public static function send_file($path, $filename) {
        while (ob_get_level()) {
            ob_end_clean();
        }
        nocache_headers();
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . str_replace('"', '', $filename) . '"; filename*=UTF-8\'\'' . rawurlencode($filename));
        header('Content-Length: ' . filesize($path));
        header('X-Content-Type-Options: nosniff');
        readfile($path);
        @unlink($path);
        exit;
    }
}
