/* DLP Paneles: mapa del pedido (bajo demanda) y control de servicios (pausar delivery / pickup).
 * Depende de dlp-tiendas. Las librerias del mapa solo se descargan al pulsar "Ver mapa". */
(function () {
  'use strict';
  var C = window.DLP_PANELES_CONFIG || {};
  var geo = C.geo;
  if (!geo || !geo.enabled) return;

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(path, method, payload) {
    return fetch(C.apiBase + path, {
      method: method || 'GET', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': C.nonce },
      body: payload ? JSON.stringify(payload) : undefined
    }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error((d && d.message) || 'Error de API'); return d; }); });
  }
  function overlay(html) {
    var el = document.createElement('div');
    el.className = 'dlp2-modal-backdrop dlp2-geo-backdrop';
    el.innerHTML = html;
    document.body.appendChild(el);
    el.addEventListener('click', function (e) { if (e.target === el || e.target.closest('[data-geo-close]')) { close(el); } });
    return el;
  }
  var closers = new WeakMap();
  function close(el) { var f = closers.get(el); if (f) f(); el.remove(); }

  // ---------- Mapa del pedido ----------
  var libs = null;
  function loadCss(href) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); }
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('No se pudo cargar ' + src)); }; document.head.appendChild(s); }); }
  function loadLibs() {
    if (!libs) {
      if (window.L && window.protomapsL) { libs = Promise.resolve(); }
      else { loadCss(geo.leafletCss); libs = loadScript(geo.leafletJs).then(function () { return loadScript(geo.protomapsJs); }); }
      libs.catch(function () { libs = null; });
    }
    return libs;
  }

  function openMap(btn) {
    var d = btn.dataset, lat = parseFloat(d.lat), lng = parseFloat(d.lng), slat = parseFloat(d.slat), slng = parseFloat(d.slng);
    var hasStore = isFinite(slat) && isFinite(slng);
    var el = overlay('<div class="dlp2-modal dlp2-geo-modal">' +
      '<div class="dlp2-modal-header"><h3>Pedido #' + esc(d.orderId) + (d.zona ? ' &middot; ' + esc(d.zona) : '') + '</h3><button class="dlp2-modal-close" data-geo-close type="button">&times;</button></div>' +
      '<div class="dlp2-geo-map" id="dlp2-geo-map"><p class="dlp2-geo-loading">Cargando mapa...</p></div>' +
      '<div class="dlp2-geo-legend"><span><i class="dlp2-dot-cli"></i>Cliente</span>' + (hasStore ? '<span><i class="dlp2-dot-sto"></i>Tienda</span>' : '') + '</div></div>');
    var map;
    closers.set(el, function () { if (map) { map.remove(); } });
    loadLibs().then(function () {
      var box = el.querySelector('#dlp2-geo-map'); box.innerHTML = '';
      map = L.map(box, { center: [lat, lng], zoom: 16, minZoom: geo.minZoom, maxZoom: geo.maxZoom });
      protomapsL.leafletLayer({ url: geo.tilesUrl, flavor: 'light', lang: 'es' }).addTo(map);
      map.attributionControl.addAttribution('© OpenStreetMap · Protomaps');
      L.circleMarker([lat, lng], { radius: 10, color: '#fff', weight: 3, fillColor: '#e63946', fillOpacity: 1 }).addTo(map);
      if (hasStore) {
        L.circleMarker([slat, slng], { radius: 9, color: '#fff', weight: 3, fillColor: '#111', fillOpacity: 1 }).addTo(map);
        map.fitBounds([[lat, lng], [slat, slng]], { padding: [50, 50], maxZoom: 16 });
      }
    }).catch(function (err) {
      var box = el.querySelector('#dlp2-geo-map'); if (box) box.innerHTML = '<p class="dlp2-geo-loading">No se pudo cargar el mapa. ' + esc(err.message) + '</p>';
    });
  }

  // ---------- Servicios ----------
  var STATUS = { ok: ['Abierto', 'ok'], pausado: ['Pausado', 'pause'], fuera_de_horario: ['Fuera de horario', 'off'], sin_horario: ['Sin horario hoy', 'off'], servicio_desactivado: ['No ofrece', 'na'], tienda_inactiva: ['Tienda inactiva', 'na'] };
  function chip(svc) {
    var s = STATUS[svc.reason] || [svc.reason, 'off'];
    var txt = svc.paused ? 'Pausado' + (svc.hasta ? ' hasta ' + svc.hasta : '') : s[0];
    return '<span class="dlp2-svc-chip dlp2-svc-' + (svc.paused ? 'pause' : s[1]) + '">' + esc(txt) + '</span>' + (svc.paused && svc.motivo ? '<small class="dlp2-svc-reason">' + esc(svc.motivo) + '</small>' : '');
  }
  function cell(row, tipo) {
    var svc = row[tipo], label = tipo === 'delivery' ? 'Delivery' : 'Pickup', act = '';
    if (svc.offered && row.enabled) {
      act = svc.paused
        ? '<button type="button" class="dlp2-btn-dark dlp2-svc-btn" data-svc="resume" data-store="' + row.store_id + '" data-tipo="' + tipo + '">Reanudar</button>'
        : '<button type="button" class="dlp2-btn-ghost dlp2-svc-btn" data-svc="ask" data-store="' + row.store_id + '" data-tipo="' + tipo + '">Pausar</button>';
    }
    return '<div class="dlp2-svc-cell"><strong>' + label + '</strong>' + chip(svc) + act + '</div>';
  }
  function rowHtml(row) {
    return '<div class="dlp2-svc-row" data-row="' + row.store_id + '" data-name="' + esc(row.name.toLowerCase()) + '"><div class="dlp2-svc-name">' + esc(row.name) + '</div>' + cell(row, 'delivery') + cell(row, 'pickup') + '<div class="dlp2-svc-form" hidden></div></div>';
  }

  function openServices() {
    var el = overlay('<div class="dlp2-modal dlp2-svc-modal">' +
      '<div class="dlp2-modal-header"><h3>Servicios de tienda</h3><button class="dlp2-modal-close" data-geo-close type="button">&times;</button></div>' +
      '<div class="dlp2-modal-body"><input type="search" class="dlp2-svc-search" placeholder="Buscar tienda..." hidden><div class="dlp2-svc-list"><p class="dlp2-geo-loading">Cargando...</p></div>' +
      '<p class="dlp2-svc-hint">Pausar un servicio bloquea nuevos pedidos de ese tipo en el checkout. Los pedidos ya recibidos no se afectan.</p></div></div>');
    var list = el.querySelector('.dlp2-svc-list'), search = el.querySelector('.dlp2-svc-search');
    api('/servicios').then(function (d) {
      if (!d.stores.length) { list.innerHTML = '<p class="dlp2-geo-loading">No hay tiendas para mostrar.</p>'; return; }
      list.innerHTML = d.stores.map(rowHtml).join('');
      if (d.stores.length > 4) { search.hidden = false; }
    }).catch(function (e) { list.innerHTML = '<p class="dlp2-geo-loading">' + esc(e.message) + '</p>'; });

    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      list.querySelectorAll('.dlp2-svc-row').forEach(function (r) { r.hidden = q && r.dataset.name.indexOf(q) === -1; });
    });

    function replaceRow(row) { var old = list.querySelector('[data-row="' + row.store_id + '"]'); if (old) { old.outerHTML = rowHtml(row); } }
    function send(store, tipo, activa, motivo, minutos, btn) {
      if (btn) btn.disabled = true;
      api('/servicios/pausa', 'POST', { store_id: Number(store), tipo: tipo, activa: activa, motivo: motivo || '', minutos: minutos || 0 })
        .then(replaceRow).catch(function (e) { alert('No se pudo actualizar: ' + e.message); if (btn) btn.disabled = false; });
    }
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-svc]'); if (!b) return;
      var row = b.closest('.dlp2-svc-row'), form = row.querySelector('.dlp2-svc-form'), store = b.dataset.store, tipo = b.dataset.tipo;
      if (b.dataset.svc === 'resume') { send(store, tipo, false, '', 0, b); return; }
      if (b.dataset.svc === 'ask') {
        form.hidden = false;
        form.innerHTML = '<strong>Pausar ' + (tipo === 'delivery' ? 'Delivery' : 'Pickup') + '</strong> ' +
          '<select class="dlp2-svc-min"><option value="30">30 minutos</option><option value="60">1 hora</option><option value="120">2 horas</option><option value="0">Hasta reanudar</option></select> ' +
          '<input type="text" class="dlp2-svc-motivo" maxlength="120" placeholder="Motivo (opcional)"> ' +
          '<button type="button" class="dlp2-btn-dark dlp2-svc-btn" data-svc="confirm" data-store="' + store + '" data-tipo="' + tipo + '">Confirmar</button> ' +
          '<button type="button" class="dlp2-btn-ghost dlp2-svc-btn" data-svc="cancel">Cancelar</button>';
        return;
      }
      if (b.dataset.svc === 'cancel') { form.hidden = true; form.innerHTML = ''; return; }
      if (b.dataset.svc === 'confirm') {
        send(store, tipo, true, form.querySelector('.dlp2-svc-motivo').value, parseInt(form.querySelector('.dlp2-svc-min').value, 10), b);
      }
    });
  }

  document.addEventListener('click', function (e) {
    var m = e.target.closest('[data-action="open-geo"]'); if (m) { e.preventDefault(); openMap(m); return; }
    var s = e.target.closest('[data-action="open-services"]'); if (s) { e.preventDefault(); openServices(); }
  });
})();
