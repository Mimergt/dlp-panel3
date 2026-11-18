<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * URLs de assets que NO dependen del query string.
 *
 * Cloudflare (u otro CDN) puede cachear /wp-content/plugins/*.js ignorando ?ver=,
 * con lo que un despliegue nuevo nunca llega a los navegadores. Aqui el hash del
 * contenido va en el NOMBRE del archivo: assets/cache/panel.<hash>.js. Se genera
 * solo (copia) la primera vez que se pide; si el contenido cambia, cambia el nombre.
 * Si no se puede escribir, se cae a la URL con ?ver= (comportamiento anterior).
 */
class DLP_Paneles_Assets {
    public static function url($rel) {
        $src = DLP_PANELES_DIR . ltrim($rel, '/');
        if (!is_file($src)) {
            return DLP_PANELES_URL . ltrim($rel, '/');
        }
        $hash = substr((string) md5_file($src), 0, 10);
        $info = pathinfo($src);
        $name = $info['filename'] . '.' . $hash . '.' . $info['extension'];
        $dir = DLP_PANELES_DIR . 'assets/cache/';
        $dst = $dir . $name;

        if (!is_file($dst)) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0755, true);
            }
            $tmp = $dst . '.' . getmypid() . '.tmp';
            if (is_dir($dir) && @copy($src, $tmp) && @rename($tmp, $dst)) {
                // Limpia copias viejas del mismo archivo.
                foreach ((array) glob($dir . $info['filename'] . '.*.' . $info['extension']) as $old) {
                    if ($old !== $dst && preg_match('/\.[0-9a-f]{10}\.' . preg_quote($info['extension'], '/') . '$/', $old)) {
                        @unlink($old);
                    }
                }
            } else {
                @unlink($tmp);
                return DLP_PANELES_URL . ltrim($rel, '/') . '?ver=' . $hash;
            }
        }
        return DLP_PANELES_URL . 'assets/cache/' . $name;
    }
}
