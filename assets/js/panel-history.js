(function () {
  var UI = window.DLP_UI;
  var cfg = window.DLP_PANELES_CONFIG;
  if (!UI || !cfg || cfg.mode !== 'history') {
    return;
  }

  var root = UI.root;
  var ICON = UI.ICON;
  var esc = UI.esc;
  var api = UI.api;

  // El indice se descarga una sola vez (por paginas) y despues solo se piden
  // los cambios desde la ultima sincronizacion. La busqueda corre aqui, sobre
  // ese indice, sin tocar el servidor en cada tecla.
  var CACHE_KEY = 'dlp_hist_v2_' + (cfg.userId || 0);
  var DELTA_MS = 60000;
  var LIST_STEP = 40;
  var DAY = 86400;
  var MIN_NUM_CHARS = 2;
  var MIN_TEXT_CHARS = 3;

  var ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" x2="16.65" y1="21" y2="16.65"></line></svg>';
  var ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-10 6L2 7"></path></svg>';

  var state = {
    rows: [],
    scope: 'tienda',
    stores: [],
    storeNames: {},
    loadedDays: 0,
    viewDays: 30,
    since: 0,
    total: 0,
    syncing: false,
    syncedAt: 0,
    error: '',
    query: '',
    typeFilter: 'all',
    storeFilter: '',
    statusFilter: 'all',
    limit: LIST_STEP,
    selectedId: null,
    details: {},
    detailError: '',
    mobileDetail: false
  };

  function norm(str) {
    return String(str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function prepare(row) {
    row._n = norm(row.n);
    row._e = String(row.e || '').toLowerCase();
    row._p = String(row.p || '').replace(/\D/g, '');
    return row;
  }

  // ---- cache de sesion (se borra al cerrar la pestana) ----

  function saveCache() {
    try {
      var slim = state.rows.map(function (r) {
        return { id: r.id, g: r.g, t: r.t, s: r.s, n: r.n, p: r.p, e: r.e, tot: r.tot, c: r.c };
      });
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        loadedDays: state.loadedDays,
        since: state.since,
        stores: state.stores,
        scope: state.scope,
        rows: slim
      }));
    } catch (e) { /* sin cache: se descarga completo */ }
  }

  function loadCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.rows) || !data.since) return false;
      state.rows = data.rows.map(prepare);
      state.loadedDays = data.loadedDays || 0;
      state.since = data.since;
      state.stores = data.stores || [];
      state.scope = data.scope || 'tienda';
      indexStores();
      return true;
    } catch (e) {
      return false;
    }
  }

  function indexStores() {
    state.storeNames = {};
    state.stores.forEach(function (s) { state.storeNames[String(s.id)] = s.name; });
  }

  // ---- sincronizacion ----

  function sortRows() {
    state.rows.sort(function (a, b) { return b.c - a.c; });
  }

  function purgeOld() {
    var min = Math.floor(Date.now() / 1000) - state.loadedDays * DAY;
    state.rows = state.rows.filter(function (r) { return r.c >= min; });
  }

  function fullLoad(days) {
    state.syncing = true;
    state.error = '';
    var collected = [];
    var firstServerTs = 0;

    function page(n) {
      return api('/historial/indice?days=' + days + '&page=' + n, 'GET', null, { retries: 2, retryDelayMs: 1200 })
        .then(function (data) {
          if (n === 1) {
            firstServerTs = data.server_ts;
            state.stores = data.stores || [];
            state.scope = data.scope || 'tienda';
            state.total = data.total || 0;
            indexStores();
          }
          (data.rows || []).forEach(function (r) { collected.push(prepare(r)); });
          // Se muestra lo descargado hasta ahora: la busqueda ya sirve
          // mientras llegan las paginas restantes.
          state.rows = collected.slice();
          if (n === 1) renderFilters();
          var partial = visibleRows();
          renderStatus(partial);
          renderList(partial);
          if (data.has_more) {
            return page(n + 1);
          }
        });
    }

    return page(1).then(function () {
      state.loadedDays = days;
      state.since = firstServerTs;
      state.syncedAt = Date.now();
      saveCache();
    }).catch(function (err) {
      console.error(err);
      state.error = 'No se pudo descargar el historial. Revisa tu conexion y pulsa Sincronizar.';
    }).then(function () {
      state.syncing = false;
      renderAll();
    });
  }

  function delta() {
    state.syncing = true;
    renderStatus();

    return api('/historial/indice?days=' + state.loadedDays + '&since=' + state.since, 'GET', null, { retries: 1 })
      .then(function (data) {
        if (data.resync) {
          state.since = 0;
          return fullLoad(state.loadedDays);
        }

        state.scope = data.scope || state.scope;
        if (Array.isArray(data.stores)) {
          state.stores = data.stores;
          indexStores();
        }

        var byId = {};
        state.rows.forEach(function (r) { byId[r.id] = r; });
        (data.removed || []).forEach(function (id) { delete byId[id]; });
        (data.rows || []).forEach(function (r) { byId[r.id] = prepare(r); delete state.details[r.id]; });

        state.rows = Object.keys(byId).map(function (k) { return byId[k]; });
        sortRows();
        purgeOld();
        state.since = data.server_ts;
        state.syncedAt = Date.now();
        state.error = '';
        saveCache();
      }).catch(function (err) {
        console.error(err);
        state.error = 'Conexion inestable. Se reintentara automaticamente.';
      }).then(function () {
        state.syncing = false;
        renderAll();
      });
  }

  function sync() {
    if (state.syncing) return Promise.resolve();
    if (!state.since || state.loadedDays < state.viewDays) {
      state.since = 0;
      return fullLoad(state.viewDays);
    }
    return delta();
  }

  // ---- filtrado y busqueda ----

  function parseQuery(raw) {
    var q = String(raw || '').trim();
    var digits = q.replace(/\D/g, '');
    var numeric = /^[#\d\s+\-()]+$/.test(q) && digits.length > 0;
    var text = norm(q);

    return {
      raw: q,
      numeric: numeric,
      digits: digits,
      tokens: text.split(/\s+/).filter(Boolean),
      active: numeric ? digits.length >= MIN_NUM_CHARS : text.length >= MIN_TEXT_CHARS,
      tooShort: q.length > 0 && (numeric ? digits.length < MIN_NUM_CHARS : text.length < MIN_TEXT_CHARS)
    };
  }

  function visibleRows() {
    var min = Math.floor(Date.now() / 1000) - state.viewDays * DAY;
    var q = parseQuery(state.query);

    var rows = state.rows.filter(function (r) {
      if (r.c < min) return false;
      if (state.typeFilter !== 'all' && r.t !== state.typeFilter) return false;
      if (state.storeFilter && Number(r.s) !== Number(state.storeFilter)) return false;
      if (state.statusFilter !== 'all' && r.g !== state.statusFilter) return false;

      if (!q.active) return true;

      if (q.numeric) {
        return String(r.id).indexOf(q.digits) !== -1 || (q.digits.length >= 3 && r._p.indexOf(q.digits) !== -1);
      }

      var hay = r._n + ' ' + r._e;
      return q.tokens.every(function (t) { return hay.indexOf(t) !== -1; });
    });

    // Numero de pedido exacto primero; el resto conserva el orden por fecha.
    if (q.active && q.numeric) {
      var exact = [];
      var rest = [];
      rows.forEach(function (r) { (String(r.id) === q.digits ? exact : rest).push(r); });
      rows = exact.concat(rest);
    }

    return { rows: rows, query: q };
  }

  // ---- render ----

  function fmtDateTime(ts) {
    return new Date(ts * 1000).toLocaleString('es-GT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function dayLabel(ts) {
    var d = new Date(ts * 1000);
    var today = new Date();
    var y = new Date();
    y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hoy';
    if (d.toDateString() === y.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-GT', { weekday: 'long', day: '2-digit', month: 'long' });
  }

  function pill(type) {
    return UI.renderTypePill({ order_type: type }, true);
  }

  function statusPill(group) {
    var cancelled = group === 'cancelled';
    return '<span class="dlp2-status-pill dlp2-status-' + (cancelled ? 'red' : 'green') + '"><span class="dlp2-status-dot"></span>' + (cancelled ? 'Cancelado' : 'Completado') + '</span>';
  }

  function skeleton() {
    if (root.querySelector('#dlp2-hist-app')) return;

    root.innerHTML = '' +
      '<div id="dlp2-hist-app">' +
        '<div id="dlp2-hist-header"></div>' +
        '<div class="dlp2-stage">' +
          '<div class="dlp2-hist" id="dlp2-hist">' +
            '<section class="dlp2-hist-list-col">' +
              '<div class="dlp2-hist-toolbar">' +
                '<div class="dlp2-hist-search">' + ICON_SEARCH +
                  '<input id="dlp2-hist-q" type="search" autocomplete="off" placeholder="Buscar por # de pedido, nombre, telefono o email" />' +
                '</div>' +
                '<div id="dlp2-hist-filters"></div>' +
                '<div id="dlp2-hist-status" class="dlp2-hist-status"></div>' +
              '</div>' +
              '<div id="dlp2-hist-list" class="dlp2-hist-list"></div>' +
            '</section>' +
            '<section id="dlp2-hist-detail" class="dlp2-hist-detail"></section>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function renderHeader() {
    document.getElementById('dlp2-hist-header').innerHTML = '' +
      '<div class="dlp2-header">' +
        '<div class="dlp2-header-left">' +
          '<span class="dlp2-brand">' + esc(cfg.brandTitle || 'DEL PUENTE') + '</span>' +
          '<span class="dlp2-location">' + ICON.file + '<span>Historial de pedidos</span></span>' +
          (cfg.currentUserName ? '<span class="dlp2-location dlp2-current-user">' + ICON.user + '<span>' + esc(cfg.currentUserName) + '</span></span>' : '') +
        '</div>' +
        '<div class="dlp2-header-right">' +
          '<a class="dlp2-btn-ghost" href="' + esc(cfg.boardUrl || '#') + '">' + ICON.back + '<span>Volver al panel</span></a>' +
          '<button class="dlp2-btn-ghost" data-h="sync" type="button">' + ICON.sync + '<span>Sincronizar</span></button>' +
          '<a class="dlp2-btn-dark" href="' + esc(cfg.logoutUrl || '#') + '">' + ICON.logout + '<span>Cerrar Sesion</span></a>' +
        '</div>' +
      '</div>';
  }

  function renderFilters() {
    var el = document.getElementById('dlp2-hist-filters');
    // No se reconstruye mientras un select tiene el foco para no cerrarlo.
    if (el.contains(document.activeElement) && document.activeElement.tagName === 'SELECT') return;

    function tab(key, label) {
      return '<button class="dlp2-type-tab' + (state.typeFilter === key ? ' dlp2-type-tab-active' : '') + '" data-type="' + key + '" type="button">' + label + '</button>';
    }

    var days = [7, 30, 90].map(function (d) {
      return '<option value="' + d + '"' + (state.viewDays === d ? ' selected' : '') + '>Ultimos ' + d + ' dias</option>';
    }).join('');

    var stores = '';
    if (state.stores.length > 1) {
      stores = '<select class="dlp2-store-filter" data-h="store">' +
        '<option value="">Todas las tiendas</option>' +
        state.stores.map(function (s) {
          return '<option value="' + Number(s.id) + '"' + (String(state.storeFilter) === String(s.id) ? ' selected' : '') + '>' + esc(s.name) + '</option>';
        }).join('') +
        '</select>';
    }

    var statuses = state.scope === 'supervisor' ?
      '<select class="dlp2-store-filter" data-h="status">' +
        '<option value="all"' + (state.statusFilter === 'all' ? ' selected' : '') + '>Todos los estados</option>' +
        '<option value="completed"' + (state.statusFilter === 'completed' ? ' selected' : '') + '>Completados</option>' +
        '<option value="cancelled"' + (state.statusFilter === 'cancelled' ? ' selected' : '') + '>Cancelados</option>' +
      '</select>' : '';

    el.innerHTML = '' +
      '<div class="dlp2-type-tabs">' + tab('all', 'Todos') + tab('delivery', 'Delivery') + tab('pickup', 'Pickup') + '</div>' +
      '<div class="dlp2-hist-selects">' +
        '<select class="dlp2-store-filter" data-h="days">' + days + '</select>' + stores + statuses +
      '</div>';
  }

  function renderStatus(result) {
    var el = document.getElementById('dlp2-hist-status');
    if (!el) return;

    var info = result || visibleRows();
    var text;
    if (state.error) {
      text = '<span class="dlp2-hist-error">' + esc(state.error) + '</span>';
    } else if (info.query.tooShort) {
      text = 'Escribe al menos ' + (info.query.numeric ? MIN_NUM_CHARS : MIN_TEXT_CHARS) + ' caracteres para buscar.';
    } else {
      var plural = info.rows.length === 1 ? '' : 's';
      text = info.rows.length + ' pedido' + plural;
      if (info.query.active) text += ' encontrado' + plural;
    }

    if (state.syncing) {
      text += ' &middot; ' + (state.since ? 'Actualizando...' : 'Descargando historial (' + state.rows.length + (state.total ? ' de ' + state.total : '') + ')...');
    } else if (state.syncedAt) {
      text += ' &middot; Actualizado ' + new Date(state.syncedAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
    }

    el.innerHTML = text;
  }

  function renderList(result) {
    var info = result || visibleRows();
    var rows = info.rows;
    var shown = rows.slice(0, state.limit);
    var multiStore = state.stores.length > 1;
    var lastDay = '';

    var html = shown.map(function (r) {
      var dayKey = new Date(r.c * 1000).toDateString();
      var divider = '';
      if (dayKey !== lastDay) {
        lastDay = dayKey;
        divider = '<div class="dlp2-hist-day">' + esc(dayLabel(r.c)) + '</div>';
      }

      return divider +
        '<article class="dlp2-card dlp2-hist-row' + (r.id === state.selectedId ? ' dlp2-card-active' : '') + '" data-h-id="' + r.id + '">' +
          '<div class="dlp2-card-top">' +
            '<span class="dlp2-card-id dlp2-card-id-mini">#' + r.id + '</span>' +
            pill(r.t) +
            (r.g === 'cancelled' ? '<span class="dlp2-hist-cancelled">Cancelado</span>' : '') +
            '<span class="dlp2-hist-time">' + esc(fmtDateTime(r.c)) + '</span>' +
          '</div>' +
          '<div class="dlp2-card-mini-row">' +
            '<span>' + ICON.user + '<span>' + esc(r.n || 'Consumidor final') + '</span></span>' +
            '<span>' + ICON.phone + '<span>' + esc(r.p || '-') + '</span></span>' +
          '</div>' +
          '<div class="dlp2-hist-row-bottom">' +
            (multiStore ? '<span class="dlp2-badge-store">' + ICON.store + '<span>' + esc(state.storeNames[String(r.s)] || 'Sin tienda') + '</span></span>' : '<span></span>') +
            '<strong>' + esc(UI.formatMoney(r.tot)) + '</strong>' +
          '</div>' +
        '</article>';
    }).join('');

    if (!rows.length) {
      html = '<p class="dlp2-empty dlp2-hist-empty">' + (state.syncing && !state.rows.length ? 'Descargando historial...' : 'No hay pedidos que coincidan.') + '</p>';
    } else if (rows.length > shown.length) {
      html += '<button class="dlp2-load-more" data-h="more" type="button">Mostrar ' + Math.min(LIST_STEP, rows.length - shown.length) + ' mas (' + (rows.length - shown.length) + ' restantes)</button>';
    }

    document.getElementById('dlp2-hist-list').innerHTML = html;
  }

  function renderDetail() {
    var el = document.getElementById('dlp2-hist-detail');
    var order = state.selectedId ? state.details[state.selectedId] : null;

    if (!state.selectedId) {
      el.innerHTML = '<div class="dlp2-hist-placeholder">' + ICON.file + '<p>Selecciona un pedido para ver su detalle.</p></div>';
      return;
    }

    if (!order) {
      el.innerHTML = '' +
        '<button class="dlp2-hist-back" data-h="back" type="button">' + ICON.back + '<span>Volver a la lista</span></button>' +
        '<div class="dlp2-hist-placeholder">' + (state.detailError ? '<p>' + esc(state.detailError) + '</p>' : '<p>Cargando pedido #' + state.selectedId + '...</p>') + '</div>';
      return;
    }

    var items = Array.isArray(order.items) ? order.items : [];
    var pickup = UI.isPickup(order);
    var addressLabel = pickup ? 'Retiro en tienda (Pickup)' : 'Entrega a domicilio (Delivery)';
    var cancelled = order.group === 'cancelled';

    var meta = [];
    if (order.created_label) meta.push('<span><strong>Ingreso:</strong> ' + esc(order.created_label) + '</span>');
    if (order.completed_label) meta.push('<span><strong>Completado:</strong> ' + esc(order.completed_label) + '</span>');
    if (order.payment_method_title) meta.push('<span class="dlp2-expanded-paid">' + ICON.check + '<span>' + esc(order.payment_method_title) + '</span></span>');
    if (order.store_name) meta.push('<span><strong>Tienda:</strong> ' + esc(order.store_name) + '</span>');

    el.innerHTML = '' +
      '<div class="dlp2-expanded-topbar">' +
        '<div class="dlp2-expanded-top-row">' +
          '<div class="dlp2-expanded-left">' +
            '<button class="dlp2-hist-back dlp2-hist-back-inline" data-h="back" type="button">' + ICON.back + '</button>' +
            '<h1 class="dlp2-expanded-title">Pedido #' + order.id + '</h1>' +
            '<div class="dlp2-expanded-badges">' + UI.renderTypePill(order, false) + statusPill(order.group) + '</div>' +
          '</div>' +
          '<div class="dlp2-expanded-right"><span class="dlp2-hist-readonly">Solo consulta</span></div>' +
        '</div>' +
        '<div class="dlp2-expanded-meta">' + meta.join('<span class="dlp2-expanded-meta-sep">&bull;</span>') + '</div>' +
      '</div>' +
      '<div class="dlp2-expanded-grid">' +
        '<div class="dlp2-expanded-col">' +
          (cancelled ?
            '<div class="dlp2-customer-note">' + ICON.alert + '<span>Pedido cancelado' + (order.cancel_reason ? ': ' + esc(order.cancel_reason) : '') + '</span></div>' :
            UI.renderTimeCard(order, Number(order.elapsed_seconds || 0))) +
          '<div class="dlp2-customer-card">' +
            '<div class="dlp2-section-title-row"><span class="dlp2-section-title">Datos de Entrega y Cliente</span>' + UI.renderTypePill(order, false) + '</div>' +
            '<div class="dlp2-customer-top">' +
              '<div class="dlp2-customer-name">' + ICON.user + '<span>' + esc(order.customer_name || 'Consumidor final') + '</span></div>' +
              (order.phone ? '<a class="dlp2-phone-link" href="tel:' + esc(order.phone) + '">' + ICON.phone + '<span>' + esc(order.phone) + '</span></a>' : '') +
            '</div>' +
            (order.email ? '<div class="dlp2-customer-address">' + ICON_MAIL + '<div><span class="dlp2-address-label">Email</span><span class="dlp2-address-value">' + esc(order.email) + '</span></div></div>' : '') +
            (order.full_address ? '<div class="dlp2-customer-address">' + ICON.pin + '<div><span class="dlp2-address-label">' + esc(addressLabel) + '</span><span class="dlp2-address-value">' + esc(order.full_address) + '</span></div></div>' : '') +
            UI.renderPickupTime(order) +
            UI.renderNitRow(order) +
            (order.notes ? '<div class="dlp2-customer-note">' + ICON.alert + '<span>Nota: ' + esc(order.notes) + '</span></div>' : '') +
          '</div>' +
          '<div class="dlp2-expanded-totals">' +
            '<div class="dlp2-expanded-totals-row"><span>Cantidad de items</span><span>' + Number(order.items_count || items.length) + '</span></div>' +
            '<div class="dlp2-expanded-totals-divider"></div>' +
            '<div class="dlp2-expanded-totals-row dlp2-expanded-totals-final"><span>Total del Pedido</span><span class="dlp2-total-amount">' + esc(UI.formatMoney(order.total)) + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="dlp2-expanded-col dlp2-expanded-col-mid">' +
          '<div class="dlp2-section-title-row dlp2-expanded-products-title">' +
            '<div class="dlp2-section-title-row"><span class="dlp2-section-title">Detalle de Productos</span><span class="dlp2-items-count">' + Number(order.items_count || items.length) + ' items</span></div>' +
            '<span class="dlp2-expanded-combo-count">' + items.length + ' combos</span>' +
          '</div>' +
          '<div class="dlp2-products dlp2-expanded-products">' + items.map(UI.renderProductRow).join('') + '</div>' +
        '</div>' +
      '</div>';
  }

  function renderAll() {
    skeleton();
    renderHeader();
    renderFilters();
    var result = visibleRows();
    renderStatus(result);
    renderList(result);
    renderDetail();
    document.getElementById('dlp2-hist').classList.toggle('is-detail', state.mobileDetail);
  }

  function openOrder(id) {
    state.selectedId = id;
    state.detailError = '';
    state.mobileDetail = true;
    renderList();
    renderDetail();
    document.getElementById('dlp2-hist').classList.add('is-detail');

    if (state.details[id]) return;

    api('/historial/pedido/' + id, 'GET', null, { retries: 1 })
      .then(function (data) {
        if (!data || !data.id) {
          throw new Error('respuesta inesperada del servidor');
        }
        state.details[id] = data;
        if (state.selectedId === id) renderDetail();
      })
      .catch(function (err) {
        if (state.selectedId === id) {
          state.detailError = 'No se pudo cargar el pedido: ' + err.message;
          renderDetail();
        }
      });
  }

  // ---- eventos ----

  var searchTimer = null;

  root.addEventListener('input', function (event) {
    if (event.target.id !== 'dlp2-hist-q') return;
    clearTimeout(searchTimer);
    var value = event.target.value;
    searchTimer = setTimeout(function () {
      state.query = value;
      state.limit = LIST_STEP;
      var result = visibleRows();
      renderStatus(result);
      renderList(result);
    }, 150);
  });

  root.addEventListener('change', function (event) {
    var sel = event.target.closest('[data-h]');
    if (!sel) return;
    var kind = sel.dataset.h;

    if (kind === 'days') {
      state.viewDays = Number(sel.value);
      state.limit = LIST_STEP;
      if (state.viewDays > state.loadedDays) {
        state.since = 0;
        fullLoad(state.viewDays);
      }
      renderAll();
    } else if (kind === 'store') {
      state.storeFilter = sel.value ? Number(sel.value) : '';
      state.limit = LIST_STEP;
      renderAll();
    } else if (kind === 'status') {
      state.statusFilter = sel.value;
      state.limit = LIST_STEP;
      renderAll();
    }
  });

  root.addEventListener('click', function (event) {
    var typeBtn = event.target.closest('[data-type]');
    if (typeBtn) {
      state.typeFilter = typeBtn.dataset.type;
      state.limit = LIST_STEP;
      renderAll();
      return;
    }

    var row = event.target.closest('[data-h-id]');
    if (row) {
      openOrder(Number(row.dataset.hId));
      return;
    }

    var action = event.target.closest('[data-h]');
    if (!action || action.tagName === 'SELECT') return;

    if (action.dataset.h === 'more') {
      state.limit += LIST_STEP;
      renderList();
    } else if (action.dataset.h === 'back') {
      state.mobileDetail = false;
      document.getElementById('dlp2-hist').classList.remove('is-detail');
    } else if (action.dataset.h === 'sync') {
      var svg = action.querySelector('svg');
      if (svg) svg.classList.add('dlp2-spin');
      sync().then(function () {
        if (svg) svg.classList.remove('dlp2-spin');
      });
    }
  });

  // ---- arranque ----

  skeleton();
  var cached = loadCache();
  if (cached && state.loadedDays >= state.viewDays) {
    state.syncedAt = Date.now();
  } else {
    state.since = 0;
    state.rows = cached ? state.rows : [];
  }
  renderAll();
  document.getElementById('dlp2-hist-q').focus();
  sync();

  setInterval(function () {
    if (!document.hidden) sync();
  }, DELTA_MS);
})();
