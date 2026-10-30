<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Escritor minimo de .xlsx (ZipArchive + XMLWriter, sin librerias).
 *
 * La hoja principal se escribe en streaming a un archivo temporal, fila por
 * fila, asi la memoria no crece con el tamano del reporte. La hoja "Resumen"
 * es pequena y se arma en memoria. Textos como inlineStr.
 *
 * Estilos (indices de cellXfs, ver styles_xml):
 *  0 normal   1-4 encabezados (azul, verde, naranja, morado)   5 sombreado
 *  6 monto    7 monto sombreado   8-10 totales (texto, monto, entero)
 *  11 titulo  12 texto con ajuste   13 negrita   14 encabezado de seccion
 *  15 entero con miles   16 nota en gris
 */
class DLP_Paneles_Xlsx_Writer {
    const HEADER_STYLE = array('pedido' => 1, 'producto' => 2, 'extra' => 3, 'monto' => 4);

    private $columns;
    private $sheet_path;
    private $xml;
    private $rows = 0;
    private $data_last = 1;

    // $columns: [ ['h' => encabezado, 'w' => ancho, 'k' => pedido|producto|extra|monto, 't' => text|money], ... ]
    public function __construct(array $columns) {
        $this->columns = array_values($columns);
        $this->sheet_path = wp_tempnam('dlp-xlsx-sheet');
        $this->xml = new XMLWriter();
        $this->xml->openUri($this->sheet_path);
        $this->xml->startDocument('1.0', 'UTF-8', 'yes');
        $this->xml->startElement('worksheet');
        $this->xml->writeAttribute('xmlns', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        // Fila de encabezados y primera columna (ID) fijas al desplazarse.
        $this->xml->startElement('sheetViews');
        $this->xml->startElement('sheetView');
        $this->xml->writeAttribute('workbookViewId', '0');
        $this->xml->writeAttribute('tabSelected', '1');
        $this->xml->startElement('pane');
        $this->xml->writeAttribute('xSplit', '1');
        $this->xml->writeAttribute('ySplit', '1');
        $this->xml->writeAttribute('topLeftCell', 'B2');
        $this->xml->writeAttribute('activePane', 'bottomRight');
        $this->xml->writeAttribute('state', 'frozen');
        $this->xml->endElement();
        $this->xml->endElement();
        $this->xml->endElement();

        $this->xml->startElement('cols');
        foreach ($this->columns as $i => $col) {
            $this->xml->startElement('col');
            $this->xml->writeAttribute('min', (string) ($i + 1));
            $this->xml->writeAttribute('max', (string) ($i + 1));
            $this->xml->writeAttribute('width', (string) $col['w']);
            $this->xml->writeAttribute('customWidth', '1');
            $this->xml->endElement();
        }
        $this->xml->endElement();

        $this->xml->startElement('sheetData');
        $this->write_header();
    }

    public static function col_letter($index) {
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

    // Escribe una celda. $cell: escalar, o ['v' => valor, 's' => estilo].
    private static function write_cell(XMLWriter $xml, $ref, $cell, $default_style = 0) {
        $spec = is_array($cell) ? $cell : array('v' => $cell);
        $value = array_key_exists('v', $spec) ? $spec['v'] : null;
        $style = isset($spec['s']) ? (int) $spec['s'] : (int) $default_style;

        if (($value === '' || $value === null) && !isset($spec['s'])) {
            return;
        }

        $xml->startElement('c');
        $xml->writeAttribute('r', $ref);
        if ($style) {
            $xml->writeAttribute('s', (string) $style);
        }

        if (is_int($value) || is_float($value)) {
            $xml->writeElement('v', (string) $value);
        } elseif ($value !== '' && $value !== null) {
            $xml->writeAttribute('t', 'inlineStr');
            $xml->startElement('is');
            $xml->startElement('t');
            $xml->writeAttribute('xml:space', 'preserve');
            $xml->text(self::clean($value));
            $xml->endElement();
            $xml->endElement();
        }
        $xml->endElement();
    }

    private function write_header() {
        $this->rows++;
        $this->xml->startElement('row');
        $this->xml->writeAttribute('r', '1');
        $this->xml->writeAttribute('ht', '34');
        $this->xml->writeAttribute('customHeight', '1');
        foreach ($this->columns as $i => $col) {
            self::write_cell($this->xml, self::col_letter($i) . '1', array('v' => $col['h'], 's' => self::HEADER_STYLE[$col['k']]));
        }
        $this->xml->endElement();
    }

    // Fila de datos. $shade alterna el sombreado por pedido para agrupar visualmente sus lineas.
    public function add_row(array $values, $shade) {
        $this->rows++;
        $r = $this->rows;
        $this->xml->startElement('row');
        $this->xml->writeAttribute('r', (string) $r);
        foreach ($this->columns as $i => $col) {
            $value = isset($values[$i]) ? $values[$i] : '';
            $money = $col['t'] === 'money';
            $style = $money ? ($shade ? 7 : 6) : ($shade ? 5 : 0);
            // Las celdas vacias de una fila sombreada tambien llevan el color.
            if (($value === '' || $value === null)) {
                if ($shade) {
                    self::write_cell($this->xml, self::col_letter($i) . $r, array('v' => null, 's' => $style));
                }
                continue;
            }
            self::write_cell($this->xml, self::col_letter($i) . $r, array('v' => $value, 's' => $style));
        }
        $this->xml->endElement();

        $this->data_last = $r;
        if (($r % 200) === 0) {
            $this->xml->flush();
        }
    }

    // Cierra la hoja principal y empaqueta el .xlsx con la hoja de resumen.
    // $summary: ['rows' => [...], 'widths' => [...], 'merges' => [...]] (ver summary_xml). Devuelve la ruta del archivo temporal.
    public function finish(array $summary) {
        $this->xml->endElement(); // sheetData
        $this->xml->startElement('autoFilter');
        $this->xml->writeAttribute('ref', 'A1:' . self::col_letter(count($this->columns) - 1) . max(1, $this->data_last));
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
            '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' .
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
            '<sheets><sheet name="Pedidos" sheetId="1" r:id="rId1"/><sheet name="Resumen" sheetId="2" r:id="rId2"/></sheets>' .
            '</workbook>');
        $zip->addFromString('xl/_rels/workbook.xml.rels',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' .
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' .
            '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' .
            '</Relationships>');
        $zip->addFromString('xl/styles.xml', self::styles_xml());
        $zip->addFile($this->sheet_path, 'xl/worksheets/sheet1.xml');
        $zip->addFromString('xl/worksheets/sheet2.xml', self::summary_xml($summary));
        $zip->close();

        @unlink($this->sheet_path);
        return $xlsx_path;
    }

    public function abort() {
        @unlink($this->sheet_path);
    }

    private static function styles_xml() {
        $border = '<border><left style="thin"><color rgb="FFC9D3DC"/></left><right style="thin"><color rgb="FFC9D3DC"/></right>' .
            '<top style="thin"><color rgb="FFC9D3DC"/></top><bottom style="thin"><color rgb="FFC9D3DC"/></bottom><diagonal/></border>';
        $head = function ($fill) {
            return '<xf numFmtId="0" fontId="1" fillId="' . $fill . '" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' .
                '<alignment horizontal="center" vertical="center" wrapText="1"/></xf>';
        };

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' .
            '<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;Q&quot;#,##0.00"/><numFmt numFmtId="165" formatCode="#,##0"/></numFmts>' .
            '<fonts count="4">' .
            '<font><sz val="11"/><name val="Calibri"/></font>' .
            '<font><b/><sz val="11"/><name val="Calibri"/></font>' .
            '<font><b/><sz val="16"/><name val="Calibri"/></font>' .
            '<font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font>' .
            '</fonts>' .
            '<fills count="8">' .
            '<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' .
            '<fill><patternFill patternType="solid"><fgColor rgb="FFD6E4F0"/><bgColor indexed="64"/></patternFill></fill>' . // 2 azul
            '<fill><patternFill patternType="solid"><fgColor rgb="FFD3EBDA"/><bgColor indexed="64"/></patternFill></fill>' . // 3 verde
            '<fill><patternFill patternType="solid"><fgColor rgb="FFFBE5C8"/><bgColor indexed="64"/></patternFill></fill>' . // 4 naranja
            '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F6F9"/><bgColor indexed="64"/></patternFill></fill>' . // 5 sombreado
            '<fill><patternFill patternType="solid"><fgColor rgb="FFE3E9EF"/><bgColor indexed="64"/></patternFill></fill>' . // 6 totales
            '<fill><patternFill patternType="solid"><fgColor rgb="FFE6DFF3"/><bgColor indexed="64"/></patternFill></fill>' . // 7 morado
            '</fills>' .
            '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' . $border . '</borders>' .
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' .
            '<cellXfs count="17">' .
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' .                                                                   // 0
            $head(2) . $head(3) . $head(4) . $head(7) .                                                                                           // 1-4
            '<xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1"/>' .                                                      // 5
            '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' .                                            // 6
            '<xf numFmtId="164" fontId="0" fillId="5" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/>' .                              // 7
            '<xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' .                        // 8
            '<xf numFmtId="164" fontId="1" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' . // 9
            '<xf numFmtId="165" fontId="1" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' . // 10
            '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' .                                                      // 11
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' .    // 12
            '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' .                                                      // 13
            '<xf numFmtId="0" fontId="1" fillId="6" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' .                                        // 14
            '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' .                                            // 15
            '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' .                                                      // 16
            '</cellXfs></styleSheet>';
    }

    // Hoja de resumen. $summary: rows = [ ['cells' => [...], 'ht' => alto opcional], ... ], widths = [...], merges = ['A5:F5', ...]
    private static function summary_xml(array $summary) {
        $xml = new XMLWriter();
        $xml->openMemory();
        $xml->startDocument('1.0', 'UTF-8', 'yes');
        $xml->startElement('worksheet');
        $xml->writeAttribute('xmlns', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        $xml->startElement('sheetViews');
        $xml->startElement('sheetView');
        $xml->writeAttribute('workbookViewId', '0');
        $xml->writeAttribute('showGridLines', '0');
        $xml->endElement();
        $xml->endElement();

        $xml->startElement('cols');
        foreach ($summary['widths'] as $i => $width) {
            $xml->startElement('col');
            $xml->writeAttribute('min', (string) ($i + 1));
            $xml->writeAttribute('max', (string) ($i + 1));
            $xml->writeAttribute('width', (string) $width);
            $xml->writeAttribute('customWidth', '1');
            $xml->endElement();
        }
        $xml->endElement();

        $xml->startElement('sheetData');
        foreach ($summary['rows'] as $n => $row) {
            $r = $n + 1;
            $xml->startElement('row');
            $xml->writeAttribute('r', (string) $r);
            if (!empty($row['ht'])) {
                $xml->writeAttribute('ht', (string) $row['ht']);
                $xml->writeAttribute('customHeight', '1');
            }
            foreach ($row['cells'] as $i => $cell) {
                self::write_cell($xml, self::col_letter($i) . $r, $cell);
            }
            $xml->endElement();
        }
        $xml->endElement();

        if (!empty($summary['merges'])) {
            $xml->startElement('mergeCells');
            $xml->writeAttribute('count', (string) count($summary['merges']));
            foreach ($summary['merges'] as $ref) {
                $xml->startElement('mergeCell');
                $xml->writeAttribute('ref', $ref);
                $xml->endElement();
            }
            $xml->endElement();
        }

        $xml->endElement();
        $xml->endDocument();
        return $xml->outputMemory();
    }
}

/**
 * Exportacion de pedidos a Excel. Un solo exportador para el historial del
 * panel (REST, descarga directa) y para el admin (admin-post).
 *
 * Una fila por producto del pedido (los datos del pedido se repiten en cada
 * fila para poder filtrar y hacer tablas dinamicas). Los extras de cada
 * producto van en una celda por grupo (Carne, Bebida, Complemento y Otros
 * extras). El total del pedido sale solo en la primera fila de cada pedido,
 * asi sumar la columna no cuenta nada dos veces. Los pedidos se leen por
 * lotes y se escriben en streaming.
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
            'label' => $requested ? self::store_title($requested) : ($supervisor ? 'todas' : 'mis-tiendas'),
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
        $writer = new DLP_Paneles_Xlsx_Writer($columns);
        $stats = array(
            'orders' => 0, 'lines' => 0, 'units' => 0.0, 'total' => 0.0,
            'stores' => array(), 'items' => array(),
        );

        $shade = false;
        foreach (array_chunk($ids, self::CHUNK) as $slice) {
            foreach ($slice as $id) {
                $order = wc_get_order($id);
                if (!$order) {
                    continue;
                }
                $shade = !$shade;
                foreach (self::build_rows($order, $args['with_status'], $stats) as $row) {
                    $writer->add_row($row, $shade);
                }
            }
            unset($order);
            if (function_exists('wp_cache_flush_runtime')) {
                wp_cache_flush_runtime();
            }
        }

        $path = $writer->finish(self::summary($args, $stats));
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

    private static function extra_headers() {
        return array('Carne', 'Bebida', 'Complemento', 'Otros extras');
    }

    // Columnas de la hoja de pedidos, en orden. k = seccion (color del encabezado), t = tipo (money = formato Q).
    private static function columns($with_status) {
        $c = function ($h, $w, $k, $t = 'text') {
            return array('h' => $h, 'w' => $w, 'k' => $k, 't' => $t);
        };

        $cols = array($c('ID', 10, 'pedido'), $c('Fecha y hora', 19, 'pedido'));
        if ($with_status) {
            $cols[] = $c('Estado', 12, 'pedido');
        }
        $cols = array_merge($cols, array(
            $c('Tienda', 18, 'pedido'),
            $c('Tiempo del Pedido', 12, 'pedido'),
            $c('Delivery / Pickup', 12, 'pedido'),
            $c('Device', 14, 'pedido'),
            $c('Dirección', 42, 'pedido'),
            $c('Método de pago', 24, 'pedido'),
            $c('authorizationNumber', 16, 'pedido'),
            $c('referenceNumber', 16, 'pedido'),
            $c('Nombres', 18, 'pedido'),
            $c('Apellidos', 18, 'pedido'),
            $c('Teléfono', 14, 'pedido'),
            $c('Correo', 28, 'pedido'),
            $c('Nombre NIT', 24, 'pedido'),
            $c('NIT', 14, 'pedido'),
            $c('Producto', 36, 'producto'),
            $c('Cant.', 7, 'producto'),
            $c('Total producto', 14, 'producto', 'money'),
        ));
        foreach (self::extra_headers() as $h) {
            $cols[] = $c($h, 28, 'extra');
        }
        $cols[] = $c('Total pedido', 14, 'monto', 'money');

        return $cols;
    }

    private static function store_title($store_id) {
        $store_id = absint($store_id);
        if (!isset(self::$store_titles[$store_id])) {
            self::$store_titles[$store_id] = $store_id ? html_entity_decode(get_the_title($store_id), ENT_QUOTES, 'UTF-8') : '';
        }
        return self::$store_titles[$store_id];
    }

    // Grupo de extras (nombre libre de Product Add-Ons / WooFood) => [columna del reporte, etiqueta].
    // Carne (Box), Bebida (Box) y Costilla van a "Otros extras" con su etiqueta para no mezclarse con los aderezos.
    private static function extra_column($group) {
        $g = mb_strtolower((string) $group);
        $box = strpos($g, 'box') !== false;
        if (strpos($g, 'carne') !== false) {
            return $box ? array('Otros extras', 'Carne (Box)') : array('Carne', '');
        }
        if (strpos($g, 'bebida') !== false) {
            return $box ? array('Otros extras', 'Bebida (Box)') : array('Bebida', '');
        }
        if (strpos($g, 'complemento') !== false) {
            return array('Complemento', '');
        }
        if (strpos($g, 'costilla') !== false) {
            return array('Otros extras', 'Costilla');
        }
        return array('Otros extras', '');
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

    private static function qty_value($qty) {
        $qty = (float) $qty;
        return ($qty == (int) $qty) ? (int) $qty : $qty;
    }

    // Filas del pedido: una por producto. Acumula los totales del resumen en $stats.
    private static function build_rows($order, $with_status, array &$stats) {
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

        $base = array(
            $order->get_id(),
            $created ? wp_date('Y-m-d H:i:s', $created->getTimestamp()) : '',
        );
        if ($with_status) {
            $base[] = $order->get_status() === 'cancelled' ? 'Cancelado' : 'Completado';
        }
        $base = array_merge($base, array(
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
            $order->get_billing_phone(),
            $order->get_billing_email(),
            $nit_name,
            $nit,
        ));

        $payload = DLP_Paneles_REST::get_order_items_payload($order);
        $extra_headers = self::extra_headers();

        $lines = array();
        foreach ($payload as $idx => $line) {
            $by_col = array();
            foreach ($line['extras'] as $extra) {
                $value = trim($extra['name']);
                if ($value !== '') {
                    list($col, $label) = self::extra_column($extra['group']);
                    $by_col[$col][] = ($label !== '' ? $label . ': ' : '') . $value;
                }
            }

            $qty = self::qty_value($line['quantity']);
            $line_total = round((float) $line['total'], 2);
            $name = trim(wp_strip_all_tags($line['name']));

            $cells = array($name, $qty, $line_total);
            foreach ($extra_headers as $h) {
                $cells[] = isset($by_col[$h]) ? implode(', ', $by_col[$h]) : '';
            }
            $lines[] = $cells;

            if (!isset($stats['items'][$name])) {
                $stats['items'][$name] = array('units' => 0.0, 'total' => 0.0);
            }
            $stats['items'][$name]['units'] += (float) $qty;
            $stats['items'][$name]['total'] += $line_total;
            $stats['units'] += (float) $qty;
        }
        if (empty($lines)) {
            $lines[] = array_merge(array('', '', ''), array_fill(0, count($extra_headers), ''));
        }

        $total = round((float) $order->get_total(), 2);

        $rows = array();
        foreach ($lines as $n => $cells) {
            $rows[] = array_merge($base, $cells, $n === 0 ? array($total) : array(''));
        }

        $stats['orders']++;
        $stats['lines'] += count($payload);
        $stats['total'] += $total;
        $store_key = $store !== '' ? $store : 'Sin tienda';
        if (!isset($stats['stores'][$store_key])) {
            $stats['stores'][$store_key] = array('orders' => 0, 'total' => 0.0);
        }
        $stats['stores'][$store_key]['orders']++;
        $stats['stores'][$store_key]['total'] += $total;

        return $rows;
    }

    // Hoja "Resumen": datos del reporte, totales generales, por tienda, por producto y como leer el archivo.
    private static function summary(array $args, array $stats) {
        $rows = array();
        $merges = array();
        $add = function (array $cells, $ht = 0) use (&$rows) {
            $rows[] = array('cells' => $cells, 'ht' => $ht);
        };
        $text = function ($string, $chars_per_line = 105) use (&$rows, &$merges) {
            $n = count($rows) + 1;
            $merges[] = 'A' . $n . ':F' . $n;
            $lines = max(1, (int) ceil(mb_strlen($string) / $chars_per_line));
            $rows[] = array('cells' => array(array('v' => $string, 's' => 12)), 'ht' => 15.5 * $lines + 2);
        };

        // Tiendas del reporte: sin filtro = todas; una = su nombre; varias = la lista.
        if (empty($args['store_ids'])) {
            $store_label = 'Todas las tiendas';
        } else {
            $names = array_map(array(__CLASS__, 'store_title'), $args['store_ids']);
            sort($names, SORT_NATURAL | SORT_FLAG_CASE);
            $store_label = (count($names) > 1 && $args['label'] === 'mis-tiendas' ? 'Todas mis tiendas: ' : '') . implode(', ', $names);
        }
        $states = $args['with_status'] ? 'Completados y cancelados' : 'Completados';
        $user = get_userdata(get_current_user_id());
        $by = $user ? ($user->display_name ?: $user->user_login) : '';

        $add(array(array('v' => 'Reporte de pedidos — Del Puente', 's' => 11)), 24);
        $add(array());
        $add(array(array('v' => 'Generado por', 's' => 13), $by));
        $add(array(array('v' => 'Fecha de generación', 's' => 13), wp_date('Y-m-d H:i') . ' (hora de Guatemala)'));
        $add(array(array('v' => 'Rango de fechas', 's' => 13), 'Del ' . $args['desde'] . ' al ' . $args['hasta'] . ' (fecha de creación del pedido)'));
        $add(array(array('v' => 'Tienda(s)', 's' => 13), $store_label));
        $add(array(array('v' => 'Estados', 's' => 13), $states));
        $add(array());

        $add(array(array('v' => 'Totales generales', 's' => 14), array('v' => null, 's' => 14), array('v' => null, 's' => 14)));
        $add(array('Pedidos', array('v' => $stats['orders'], 's' => 15)));
        $add(array('Líneas de producto', array('v' => $stats['lines'], 's' => 15)));
        $add(array('Unidades vendidas', array('v' => (float) $stats['units'], 's' => 15)));
        $add(array(array('v' => 'Total de pedidos', 's' => 13), array('v' => round($stats['total'], 2), 's' => 9)));
        $add(array());

        if (count($stats['stores']) > 1) {
            uasort($stats['stores'], function ($a, $b) {
                return $b['total'] <=> $a['total'];
            });
            $add(array(array('v' => 'Por tienda', 's' => 14), array('v' => 'Pedidos', 's' => 14), array('v' => 'Total', 's' => 14)));
            foreach ($stats['stores'] as $name => $s) {
                $add(array($name, array('v' => $s['orders'], 's' => 15), array('v' => round($s['total'], 2), 's' => 6)));
            }
            $add(array());
        }

        uasort($stats['items'], function ($a, $b) {
            return $b['units'] <=> $a['units'];
        });
        $add(array(array('v' => 'Por producto', 's' => 14), array('v' => 'Unidades', 's' => 14), array('v' => 'Total', 's' => 14)));
        foreach ($stats['items'] as $name => $item) {
            $add(array($name, array('v' => (float) $item['units'], 's' => 15), array('v' => round($item['total'], 2), 's' => 6)));
        }
        $add(array());

        $add(array(array('v' => 'Cómo está armada la hoja "Pedidos"', 's' => 14), array('v' => null, 's' => 14), array('v' => null, 's' => 14), array('v' => null, 's' => 14), array('v' => null, 's' => 14), array('v' => null, 's' => 14)));
        $text('Una fila por producto del pedido. Un pedido con 3 productos ocupa 3 filas seguidas con el mismo ID; las filas de un mismo pedido llevan el mismo sombreado para verlas juntas.');
        $text('Columnas azules: datos del pedido (fecha, tienda, tipo, pago, cliente, NIT). Se repiten en cada fila del pedido para poder filtrar y armar tablas dinámicas por tienda, fecha, etc.');
        $text('Columnas verdes: el producto de esa fila: nombre, cantidad y total de esa línea.');
        $text('Columnas naranja: extras elegidos en ese producto, separados por tipo (Carne, Bebida, Complemento). "Otros extras" reúne lo demás: aderezos y las opciones de Carne (Box), Bebida (Box) y Costilla, que llevan su etiqueta delante (por ejemplo "Carne (Box): Premium"). Los extras corresponden a la línea completa: si la cantidad es mayor a 1, no se distingue qué extras eligió para cada unidad.');
        $text('Columna morada: Total pedido sale solo en la primera fila de cada pedido, así que al sumar la columna nada se cuenta dos veces.');
        $text('Para contar pedidos, cuenta los valores de la columna Total pedido (o los IDs distintos). Para contar productos vendidos, usa Producto junto con Cant. Los totales de esta hoja Resumen son siempre los del reporte completo.');
        $text('Las fechas y horas son de Guatemala. El monto de cada producto es el de la línea del pedido, con sus extras ya incluidos.');

        return array(
            'rows' => $rows,
            'widths' => array(34, 14, 16, 16, 14, 14),
            'merges' => $merges,
        );
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
