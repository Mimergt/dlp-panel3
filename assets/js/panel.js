(function () {
  var root = document.getElementById('dlp-paneles-root');
  if (!root || !window.DLP_PANELES_CONFIG) {
    return;
  }

  // Umbrales de tiempo operativo (minutos), acordados con el usuario:
  // 45 min = primera alerta ("Por vencer" / warning), 60 min = "Atrasado".
  // Pendiente: evaluar si deben variar por tienda/tipo de pedido.
  var TIME_WARNING_MINUTES = 45;
  var TIME_LATE_MINUTES = 60;

  // Paginacion por columna: se muestran solo los primeros N pedidos para no
  // saturar el render cuando una columna acumula muchos pedidos; "Cargar mas"
  // suma de a COLUMN_LOAD_MORE.
  var COLUMN_INITIAL_LIMIT = 12;
  var COLUMN_LOAD_MORE = 20;

  // Carga progresiva de /panel: la primera llamada pide pocos pedidos (rapida
  // de pintar) y si el backend indica que faltan mas (has_more), se vuelve a
  // pedir con el siguiente tamano de la lista hasta traer todo. Pensado sobre
  // todo para el panel de supervisor, que junta pedidos de todas las tiendas.
  var PAGE_SIZE_STEPS = [10, 25, 50, 100, 200, 330];

  var state = {
    orders: [],
    selectedOrderId: null,
    counts: { processing: 0, shipped: 0, completed: 0 },
    stores: [],
    scope: 'tienda',
    networkWarning: '',
    firstLoadDone: false,
    loadedAt: 0,
    typeFilter: 'all',
    storeFilter: '',
    expandedOrderId: null,
    columnLimits: { processing: COLUMN_INITIAL_LIMIT, shipped: COLUMN_INITIAL_LIMIT, completed: COLUMN_INITIAL_LIMIT },
    currentPageSize: PAGE_SIZE_STEPS[0],
  };

  var ICON = {
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"></path><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"></path><path d="M2 7h20"></path></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" x2="8" y1="13" y2="13"></line><line x1="16" x2="8" y1="17" y2="17"></line></svg>',
    chevrons: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>',
    sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V9c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v8c0 .6-.4 1-1 1H9"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"></path></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" x2="23" y1="10" y2="10"></line></svg>',
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="3"></circle><path d="M6 12h.01M18 12h.01"></path></svg>',
    expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" x2="14" y1="3" y2="10"></line><line x1="3" x2="10" y1="21" y2="14"></line></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="5" y1="12" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    userBlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="17" x2="22" y1="8" y2="13"></line><line x1="22" x2="17" y1="8" y2="13"></line></svg>',
  };

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getStoreLabel() {
    if (!Array.isArray(state.stores) || state.stores.length === 0) {
      return 'Sin tienda asignada';
    }

    if (state.stores.length === 1) {
      return state.stores[0].name || 'Tienda';
    }

    return state.stores[0].name + ' +' + (state.stores.length - 1);
  }

  function formatNowTime() {
    return new Date().toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatNowDate() {
    return new Date().toLocaleDateString('es-GT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    });
  }

  function formatMoney(amount) {
    return 'Q' + Number(amount || 0).toFixed(2);
  }

  // Elapsed en vivo: el servidor manda elapsed_seconds al momento del ultimo
  // fetch (state.loadedAt); entre refrescos se le suma el tiempo real
  // transcurrido en el navegador para que el reloj corra sin esperar el
  // siguiente polling.
  function liveElapsed(order) {
    var base = Number(order.elapsed_seconds || 0);
    // El pedido Completado ya trae un elapsed_seconds congelado (calculado en
    // el servidor contra la fecha de finalizacion guardada) y no debe seguir
    // corriendo en el navegador.
    if (order.group === 'completed' || !state.loadedAt) {
      return base;
    }
    return base + Math.max(0, Math.floor((Date.now() - state.loadedAt) / 1000));
  }

  function timeTier(seconds) {
    if (seconds >= TIME_LATE_MINUTES * 60) return 'critical';
    if (seconds >= TIME_WARNING_MINUTES * 60) return 'warning';
    return 'neutral';
  }

  function fmtCardTime(seconds) {
    seconds = Number(seconds || 0);
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;

    if (h > 0) {
      return h + 'h ' + String(m).padStart(2, '0') + 'm';
    }
    if (seconds >= TIME_WARNING_MINUTES * 60) {
      return m + 'm ' + s + 's';
    }
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function fmtBigTime(seconds) {
    seconds = Number(seconds || 0);
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;

    if (h > 0) {
      return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function statusLabel(status) {
    if (status === 'processing') return 'Procesando';
    if (status === 'prep') return 'Procesando';
    if (status === 'dlv') return 'Enviada / LPR';
    if (status === 'rtp') return 'Enviada / LPR';
    if (status === 'completed') return 'Completada';
    return status;
  }

  function statusColor(status) {
    if (status === 'processing' || status === 'prep') return 'amber';
    if (status === 'dlv' || status === 'rtp') return 'blue';
    if (status === 'completed') return 'green';
    return 'gray';
  }

  function nextStatus(status) {
    if (status === 'processing') return 'dlv';
    if (status === 'prep') return 'dlv';
    if (status === 'dlv') return 'completed';
    if (status === 'rtp') return 'completed';
    return null;
  }

  function nextLabel(status) {
    if (status === 'processing' || status === 'prep') return 'Pasar a Enviada / LPR (Paso 2 de 3)';
    if (status === 'dlv' || status === 'rtp') return 'Completar pedido (Paso 3 de 3)';
    return 'Sin accion';
  }

  function flowStep(status) {
    if (status === 'processing' || status === 'prep') return 1;
    if (status === 'dlv' || status === 'rtp') return 2;
    return 3;
  }

  function isFinalStatus(status) {
    return status === 'completed';
  }

  function isPickup(order) {
    return order.order_type === 'pickup';
  }

  function orderTypeLabel(order) {
    return isPickup(order) ? 'Pickup' : 'Delivery';
  }

  function renderTypePill(order, mini) {
    var pickup = isPickup(order);
    var cls = pickup ? 'dlp2-type-pickup' : 'dlp2-type-delivery';
    var sizeClass = mini ? ' dlp2-type-pill-mini' : '';
    var icon = pickup ? ICON.bag : ICON.truck;
    return '<span class="dlp2-type-pill' + sizeClass + ' ' + cls + '">' + icon + '<span>' + orderTypeLabel(order) + '</span></span>';
  }

  // Heuristica provisional para distinguir pago ya cobrado (en linea/tarjeta)
  // de pago pendiente de cobrar en mano (efectivo/contra entrega). Pendiente
  // confirmar con el usuario si hay una forma mas confiable de saberlo.
  function isCashPayment(order) {
    var title = (order.payment_method_title || '').toLowerCase();
    return title.indexOf('efectivo') !== -1 ||
      title.indexOf('contra entrega') !== -1 ||
      title.indexOf('cash') !== -1;
  }

  function renderPaymentBanner(order) {
    var title = order.payment_method_title || 'Forma de pago no especificada';
    var cash = isCashPayment(order);
    var cls = cash ? 'dlp2-payment-cash' : 'dlp2-payment-paid';
    var icon = cash ? ICON.cash : ICON.card;
    var caption = cash ? 'Cobrar en efectivo' : 'Pago ya realizado';

    return '' +
      '<div class="dlp2-payment-banner ' + cls + '">' +
        icon +
        '<div class="dlp2-payment-text">' +
          '<span class="dlp2-payment-title">' + esc(title) + '</span>' +
          '<span class="dlp2-payment-caption">' + caption + '</span>' +
        '</div>' +
      '</div>';
  }

  function filteredOrders() {
    return state.orders.filter(function (order) {
      var typeOk = state.typeFilter === 'all' || order.order_type === state.typeFilter;
      var storeOk = !state.storeFilter || Number(order.store_id) === Number(state.storeFilter);
      return typeOk && storeOk;
    });
  }

  // Filtro de tienda: solo tiene sentido mostrarlo cuando el usuario ve
  // pedidos de mas de una tienda (supervisor, o multistore_user con varias
  // tiendas asignadas). Se pinta junto a los tabs de Delivery/Pickup.
  function renderStoreFilter() {
    if (!Array.isArray(state.stores) || state.stores.length <= 1) {
      return '';
    }

    var options = '<option value="">Todas las tiendas</option>' +
      state.stores.map(function (store) {
        var selected = String(Number(store.id)) === String(state.storeFilter) ? ' selected' : '';
        return '<option value="' + Number(store.id) + '"' + selected + '>' + esc(store.name) + '</option>';
      }).join('');

    return '<select class="dlp2-store-filter" data-action="store-filter">' + options + '</select>';
  }

  function renderTypeTabs() {
    var all = state.orders.length;
    var deliveryCount = state.orders.filter(function (o) { return o.order_type !== 'pickup'; }).length;
    var pickupCount = state.orders.filter(function (o) { return o.order_type === 'pickup'; }).length;

    function tab(key, label, icon, count, countClass) {
      var active = state.typeFilter === key ? ' dlp2-type-tab-active' : '';
      return '' +
        '<button class="dlp2-type-tab' + active + '" data-type-filter="' + key + '" type="button">' +
          (icon || '') +
          '<span>' + label + '</span>' +
          '<span class="dlp2-type-tab-count ' + countClass + '">' + count + '</span>' +
        '</button>';
    }

    return '' +
      '<div class="dlp2-header-center">' +
        '<div class="dlp2-type-tabs">' +
          tab('all', 'Todos', '', all, 'dlp2-type-tab-count-all') +
          tab('delivery', 'Delivery', ICON.truck, deliveryCount, 'dlp2-type-tab-count-delivery') +
          tab('pickup', 'Pickup', ICON.bag, pickupCount, 'dlp2-type-tab-count-pickup') +
        '</div>' +
        renderStoreFilter() +
      '</div>';
  }

  function api(path, method, payload, opts) {
    var options = opts || {};
    var retries = typeof options.retries === 'number' ? options.retries : 0;
    var retryDelayMs = typeof options.retryDelayMs === 'number' ? options.retryDelayMs : 900;

    return fetch(window.DLP_PANELES_CONFIG.apiBase + path, {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': window.DLP_PANELES_CONFIG.nonce,
      },
      credentials: 'same-origin',
      body: payload ? JSON.stringify(payload) : undefined,
    }).then(function (res) {
      var contentType = res.headers.get('content-type') || '';

      if (contentType.indexOf('application/json') !== -1) {
        return res.json().then(function (data) {
          if (!res.ok) {
            throw new Error((data && data.message) || 'Error de API');
          }
          return data;
        });
      }

      return res.text().then(function () {
        if (!res.ok) {
          throw new Error('Error de API (' + res.status + ')');
        }
        return {};
      });
    }).catch(function (error) {
      if (retries > 0) {
        return new Promise(function (resolve) {
          setTimeout(resolve, retryDelayMs);
        }).then(function () {
          return api(path, method, payload, {
            retries: retries - 1,
            retryDelayMs: retryDelayMs
          });
        });
      }
      throw error;
    });
  }

  function forceRefresh(button) {
    var icon = button ? button.querySelector('svg') : null;
    if (icon) {
      icon.classList.add('dlp2-spin');
    }

    return loadPanel().finally(function () {
      if (icon) {
        icon.classList.remove('dlp2-spin');
      }
    });
  }

  function renderTimeBadge(order, seconds, mini) {
    var tier = timeTier(seconds);
    var sizeClass = mini ? ' dlp2-time-badge-mini' : '';
    return '<span class="dlp2-time-badge' + sizeClass + ' dlp2-time-' + tier + '" data-time-badge="' + order.id + '">' +
      ICON.clock + '<span>' + fmtCardTime(seconds) + '</span></span>';
  }

  function renderCards(status) {
    var isMini = status === 'completed';

    var all = filteredOrders().filter(function (order) {
      return order.group === status;
    });

    var limit = state.columnLimits[status] || COLUMN_INITIAL_LIMIT;
    var visible = all.slice(0, limit);
    var remaining = all.length - visible.length;

    var cardsHtml = visible.map(function (order) {
        var active = order.id === state.selectedOrderId ? ' dlp2-card-active' : '';
        var priorityClass = order.priority ? ' dlp2-card-priority' : '';
        var seconds = liveElapsed(order);

        if (isMini) {
          return '' +
            '<article class="dlp2-card dlp2-card-mini' + active + priorityClass + '" data-order-id="' + order.id + '">' +
              '<div class="dlp2-card-top">' +
                '<span class="dlp2-card-id dlp2-card-id-mini">#' + order.id + '</span>' +
                renderTypePill(order, true) +
                renderTimeBadge(order, seconds, true) +
              '</div>' +
              '<div class="dlp2-card-mini-row">' +
                '<span>' + ICON.user + '<span>' + esc(order.customer_name || 'Consumidor final') + '</span></span>' +
                '<span>' + ICON.phone + '<span>' + esc(order.phone || '-') + '</span></span>' +
              '</div>' +
            '</article>';
        }

        return '' +
          '<article class="dlp2-card' + active + priorityClass + '" data-order-id="' + order.id + '">' +
            '<div class="dlp2-card-top">' +
              '<span class="dlp2-card-id">#' + order.id + '</span>' +
              renderTypePill(order, false) +
              renderTimeBadge(order, seconds, false) +
            '</div>' +
            '<div class="dlp2-card-row">' + ICON.user + '<span>' + esc(order.customer_name || 'Consumidor final') + '</span></div>' +
            '<div class="dlp2-card-row">' + ICON.phone + '<span>' + esc(order.phone || '-') + '</span></div>' +
            '<div class="dlp2-card-bottom">' +
              '<span class="dlp2-badge-store">' + ICON.store + '<span>' + esc(order.store_name || 'Sin tienda') + '</span></span>' +
              (order.priority ? '<span class="dlp2-badge-priority">' + ICON.flag + '<span>Prioridad</span></span>' : '') +
            '</div>' +
          '</article>';
      })
      .join('');

    var loadMoreHtml = remaining > 0 ?
      '<button class="dlp2-load-more" data-action="load-more" data-column="' + status + '" type="button">Cargar ' + Math.min(remaining, COLUMN_LOAD_MORE) + ' mas (' + remaining + ' restantes)</button>' :
      '';

    return cardsHtml + loadMoreHtml;
  }

  function capitalizeFirst(str) {
    str = String(str || '');
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
  }

  // Extrae el numero de un texto tipo "Q5.00" o "Papas grandes +Q10.00".
  // Devuelve 0 si el texto no trae un numero (ej. una opcion sin costo extra).
  function parseMoneyString(str) {
    var match = String(str || '').match(/(\d+(?:[.,]\d{1,2})?)/);
    if (!match) {
      return 0;
    }
    return parseFloat(match[1].replace(',', '.')) || 0;
  }

  // WooFood entrega los modificadores en pares: una meta sin label (la
  // descripcion del grupo, ej. "aqui tu carne favorita") seguida de la meta
  // con la opcion elegida y su precio (ej. "Premium Blend: Q0.00"). Se
  // agrupan como titulo + subtitulo en vez de mostrar ambas como filas sueltas.
  // El precio de cada extra tambien se suma en modifiersTotal: item.total de
  // WooCommerce ya incluye esos extras, y se necesita restarlos para mostrar
  // el precio base del producto por separado (ver renderProductRow).
  function renderProductMeta(meta) {
    var rows = [];
    var modifiersTotal = 0;
    var i = 0;

    while (i < meta.length) {
      var current = meta[i];
      var next = meta[i + 1];

      if (!current.label && next) {
        modifiersTotal += parseMoneyString(next.value);
        rows.push(
          '<div class="dlp2-product-mod">' +
            '<div class="dlp2-product-mod-title">' + esc(capitalizeFirst(current.value)) + '</div>' +
            '<div class="dlp2-product-mod-row"><span>&bull; ' + esc(next.label) + '</span><span class="dlp2-product-mod-price">' + esc(next.value) + '</span></div>' +
          '</div>'
        );
        i += 2;
        continue;
      }

      var isUpgrade = /upgrade/i.test(current.label || '');
      if (isUpgrade) {
        modifiersTotal += parseMoneyString(current.value);
      }
      var rowClass = isUpgrade ? ' dlp2-product-meta-upgrade' : '';
      var label = isUpgrade ? '&#9733; ' + esc(current.label) + ': ' + esc(current.value) : '&bull; ' + esc(current.label) + ': <strong>' + esc(current.value) + '</strong>';
      rows.push('<div class="dlp2-product-meta-row' + rowClass + '"><span>' + label + '</span></div>');
      i += 1;
    }

    return { html: rows.join(''), modifiersTotal: modifiersTotal };
  }

  function renderProductRow(item) {
    var metaResult = renderProductMeta(item.meta || []);

    var qty = Number(item.quantity || 1);
    var lineTotal = Number(item.total || 0);
    // item.total ya incluye los extras (modificadores); se restan para
    // mostrar el precio base del producto por separado del total final.
    var baseTotal = Math.max(0, lineTotal - metaResult.modifiersTotal);
    var baseUnit = qty > 0 ? baseTotal / qty : baseTotal;

    return '' +
      '<div class="dlp2-product">' +
        '<div class="dlp2-product-top">' +
          '<span class="dlp2-product-qty">' + qty + '</span>' +
          '<span class="dlp2-product-name">' + esc(item.name) + '</span>' +
          '<span class="dlp2-product-baseprice">' + esc(formatMoney(baseUnit)) + ' x ' + qty + '</span>' +
        '</div>' +
        (metaResult.html ? '<div class="dlp2-product-meta">' + metaResult.html + '</div>' : '') +
        '<div class="dlp2-product-linetotal"><span>Total del Producto</span><span class="dlp2-product-price">' + esc(formatMoney(lineTotal)) + '</span></div>' +
      '</div>';
  }

  function renderProducts(order) {
    var items = Array.isArray(order.items) ? order.items : [];

    if (!items.length) {
      return '';
    }

    var rows = items.map(renderProductRow).join('');

    return '' +
      '<div class="dlp2-section">' +
        '<div class="dlp2-section-title-row">' +
          '<span class="dlp2-section-title">Detalle de Productos</span>' +
          '<span class="dlp2-items-count">' + Number(order.items_count || items.length) + ' items</span>' +
        '</div>' +
        '<div class="dlp2-products">' + rows + '</div>' +
        '<div class="dlp2-total-row"><span>Total del Pedido</span><span class="dlp2-total-amount">' + esc(formatMoney(order.total)) + '</span></div>' +
      '</div>';
  }


  function renderPrepProgress(order) {
    var step = flowStep(order.status);
    var final = isFinalStatus(order.status);
    var labels = ['1. Cocina', '2. Enviar/LPR', '3. Entregado'];

    var stepsHtml = labels.map(function (label, idx) {
      var stepNum = idx + 1;
      var done = final || stepNum <= step;
      var current = !final && stepNum === step;
      var barClass = !done ? 'dlp2-prep-bar-pending' : (current ? 'dlp2-prep-bar-current' : 'dlp2-prep-bar-done');
      var labelClass = done ? 'dlp2-prep-label-done' : 'dlp2-prep-label-pending';

      return '' +
        '<div class="dlp2-prep-step">' +
          '<div class="dlp2-prep-bar ' + barClass + '"></div>' +
          '<span class="' + labelClass + '">' + label + '</span>' +
        '</div>';
    }).join('');

    return '' +
      '<div class="dlp2-prep-progress">' +
        '<div class="dlp2-prep-top">' +
          '<span>Progreso de preparacion</span>' +
          '<span class="dlp2-prep-step-text">' + (final ? 'Completado' : 'Paso ' + step + ' de 3 en curso') + '</span>' +
        '</div>' +
        '<div class="dlp2-prep-steps">' + stepsHtml + '</div>' +
      '</div>';
  }

  function renderTimeCard(order, secondsOverride) {
    var seconds = typeof secondsOverride === 'number' ? secondsOverride : liveElapsed(order);
    var elapsedMinutes = seconds / 60;
    var pct = Math.min(100, Math.round((elapsedMinutes / TIME_LATE_MINUTES) * 100));
    var slaState = 'ok';
    var slaLabel = 'En tiempo';

    if (elapsedMinutes >= TIME_LATE_MINUTES) {
      slaState = 'late';
      slaLabel = 'Atrasado';
    } else if (elapsedMinutes >= TIME_WARNING_MINUTES) {
      slaState = 'warning';
      slaLabel = 'Por vencer';
    }

    return '' +
      '<div class="dlp2-time-card">' +
        '<div class="dlp2-time-card-top">' +
          '<div class="dlp2-time-card-value">' +
            '<span class="dlp2-time-icon">' + ICON.clock + '</span>' +
            '<span class="dlp2-time-digits">' + fmtBigTime(seconds) + '</span>' +
            '<span class="dlp2-time-unit">min</span>' +
          '</div>' +
          '<div class="dlp2-time-tags">' +
            '<span class="dlp2-sla-pill dlp2-sla-' + slaState + '">' + esc(slaLabel) + '</span>' +
            '<div class="dlp2-goal-pill"><span>Atrasado a los</span><strong>' + TIME_LATE_MINUTES + ' min</strong></div>' +
          '</div>' +
        '</div>' +
        '<div class="dlp2-time-progress"><div class="dlp2-time-progress-fill dlp2-sla-fill-' + slaState + '" style="width:' + pct + '%"></div></div>' +
      '</div>';
  }

  // Solo visible para supervisores: bloquea/desbloquea la cuenta del cliente
  // (via el meta que usa el plugin User Blocker), no solo este pedido.
  function renderBlockCustomerButton(order) {
    if (state.scope !== 'supervisor') {
      return '';
    }

    var hasAccount = !!order.customer_id;
    var blocked = !!order.customer_blocked;
    var label = !hasAccount ? 'Cliente invitado (sin cuenta)' : (blocked ? 'Desbloquear Cliente' : 'Bloquear Cliente');
    var disabledAttr = hasAccount ? '' : ' disabled title="Este pedido no tiene una cuenta de cliente asociada"';
    var extraClass = blocked ? ' dlp2-block-btn-active' : '';

    return '' +
      '<label class="dlp2-field">' +
        '<span>Cuenta del cliente</span>' +
        '<button class="dlp2-toggle-btn' + extraClass + '" data-action="toggle-block-customer" data-order-id="' + order.id + '"' + disabledAttr + '>' + ICON.userBlock + '<span>' + label + '</span></button>' +
      '</label>';
  }

  function renderDetail(order) {
    if (!order) {
      return '<aside class="dlp2-detail"><div class="dlp2-detail-header">' + ICON.file + '<span>Detalle del pedido</span></div><div class="dlp2-detail-body"><p class="dlp2-empty">Selecciona un pedido para operar.</p></div></aside>';
    }

    var storeOptions = (state.stores || []).map(function (store) {
      var selected = Number(store.id) === Number(order.store_id) ? ' selected' : '';
      return '<option value="' + Number(store.id) + '"' + selected + '>' + esc(store.name) + '</option>';
    }).join('');

    var pickup = isPickup(order);
    var addressLabel = pickup ? 'Retiro en tienda (Pickup)' : 'Entrega a domicilio (Delivery)';

    return '' +
      '<aside class="dlp2-detail">' +
        '<div class="dlp2-detail-header">' + ICON.file + '<span>Detalle del pedido</span>' +
          '<div class="dlp2-detail-header-actions">' +
            '<button class="dlp2-expand-btn" data-action="expand-order" data-order-id="' + order.id + '" title="Abrir pedido" type="button">' + ICON.expand + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="dlp2-detail-body">' +

          '<div class="dlp2-detail-top">' +
            '<div class="dlp2-detail-title-row">' +
              '<span class="dlp2-detail-order-id">Pedido #' + order.id + '</span>' +
              renderTypePill(order, false) +
              '<span class="dlp2-status-pill dlp2-status-' + statusColor(order.status) + '"><span class="dlp2-status-dot"></span>' + esc(statusLabel(order.status)) + '</span>' +
              (order.priority ? '<span class="dlp2-priority-pill">' + ICON.flag + '<span>Prioridad</span></span>' : '') +
            '</div>' +
            (order.entry_time ? '<div class="dlp2-detail-meta">Ingreso: ' + esc(order.entry_time) + '</div>' : '') +
          '</div>' +

          renderPaymentBanner(order) +

          renderTimeCard(order) +

          (isFinalStatus(order.status) ?
            '<p class="dlp-final-note">Pedido completado. No requiere mas acciones.</p>' :
            '<div class="dlp2-flow-card">' +
              '<div class="dlp2-flow-top"><span>Flujo operativo</span><span>Paso ' + flowStep(order.status) + ' de 3 en curso</span></div>' +
              '<button class="dlp2-flow-btn" data-action="advance" data-order-id="' + order.id + '">' + ICON.chevrons + '<span>' + esc(nextLabel(order.status)) + '</span></button>' +
            '</div>') +

          renderProducts(order) +

          '<div class="dlp2-section">' +
            '<span class="dlp2-section-title">Datos de Entrega y Cliente</span>' +
            '<div class="dlp2-customer-card">' +
              '<div class="dlp2-customer-top">' +
                '<div class="dlp2-customer-name">' + ICON.user + '<span>' + esc(order.customer_name || 'Consumidor final') + '</span></div>' +
                (order.phone ? '<a class="dlp2-phone-link" href="tel:' + esc(order.phone) + '">' + ICON.phone + '<span>' + esc(order.phone) + '</span></a>' : '') +
              '</div>' +
              (order.full_address ? '<div class="dlp2-customer-address">' + ICON.pin + '<div><span class="dlp2-address-label">' + esc(addressLabel) + '</span><span class="dlp2-address-value">' + esc(order.full_address) + '</span></div></div>' : '') +
              (order.notes ? '<div class="dlp2-customer-note">' + ICON.alert + '<span>Nota: ' + esc(order.notes) + '</span></div>' : '') +
            '</div>' +
          '</div>' +

          '<div class="dlp2-section">' +
            '<span class="dlp2-section-title">Gestion de Tienda y Supervisor</span>' +
            '<div class="dlp2-management-grid">' +
              '<label class="dlp2-field">' +
                '<span>Tienda asignada</span>' +
                '<select data-field="store_id" data-action="reassign" data-order-id="' + order.id + '">' + storeOptions + '</select>' +
              '</label>' +
              '<label class="dlp2-field">' +
                '<span>Prioridad de orden</span>' +
                '<button class="dlp2-toggle-btn" data-action="toggle-priority" data-order-id="' + order.id + '">' + ICON.flag + '<span>' + (order.priority ? 'Quitar Prioridad' : 'Marcar Prioridad') + '</span></button>' +
              '</label>' +
              renderBlockCustomerButton(order) +
            '</div>' +
            '<div class="dlp2-note-row">' +
              '<input type="text" data-field="internal_note" placeholder="Agregar nota interna rapida..." value="' + esc(order.internal_note || '') + '" />' +
              '<button class="dlp2-note-save" data-action="save-note" data-order-id="' + order.id + '">Guardar</button>' +
            '</div>' +
          '</div>' +

          (isFinalStatus(order.status) ? '' :
            '<button class="dlp2-cancel-link" data-action="cancel" data-order-id="' + order.id + '">Cancelar pedido</button>') +

        '</div>' +
      '</aside>';
  }

  function renderActionsCard(order) {
    var storeOptions = (state.stores || []).map(function (store) {
      var selected = Number(store.id) === Number(order.store_id) ? ' selected' : '';
      return '<option value="' + Number(store.id) + '"' + selected + '>' + esc(store.name) + '</option>';
    }).join('');

    return '' +
      '<div class="dlp2-panel-card">' +
        '<div class="dlp2-panel-card-header">' +
          '<div class="dlp2-panel-card-header-left"><span>Acciones</span></div>' +
        '</div>' +
        '<div class="dlp2-actions-card-body">' +
          '<label class="dlp2-field">' +
            '<span>Tienda asignada</span>' +
            '<select data-field="store_id" data-action="reassign" data-order-id="' + order.id + '">' + storeOptions + '</select>' +
          '</label>' +
          '<label class="dlp2-field">' +
            '<span>Prioridad de orden</span>' +
            '<button class="dlp2-toggle-btn" data-action="toggle-priority" data-order-id="' + order.id + '">' + ICON.flag + '<span>' + (order.priority ? 'Quitar Prioridad' : 'Marcar Prioridad') + '</span></button>' +
          '</label>' +
          renderBlockCustomerButton(order) +
          '<label class="dlp2-field">' +
            '<span>Bitacora interna</span>' +
            '<div class="dlp2-note-row">' +
              '<input type="text" data-field="internal_note" placeholder="Agregar nota interna rapida..." value="' + esc(order.internal_note || '') + '" />' +
              '<button class="dlp2-note-save" data-action="save-note" data-order-id="' + order.id + '">Guardar</button>' +
            '</div>' +
          '</label>' +
          (isFinalStatus(order.status) ? '' :
            '<button class="dlp2-cancel-link dlp2-cancel-link-block" data-action="cancel" data-order-id="' + order.id + '">Cancelar pedido</button>') +
        '</div>' +
      '</div>';
  }

  function renderExpandedOrder(order) {
    var pickup = isPickup(order);
    var addressLabel = pickup ? 'Retiro en tienda (Pickup)' : 'Entrega a domicilio (Delivery)';
    var items = Array.isArray(order.items) ? order.items : [];
    var comboCount = items.length;
    var subtotal = items.reduce(function (sum, item) { return sum + Number(item.total || 0); }, 0);

    var metaParts = [];
    if (order.entry_time) {
      metaParts.push('<span><strong>Ingreso:</strong> ' + esc(order.entry_time) + '</span>');
    }
    if (order.payment_method_title) {
      metaParts.push('<span class="dlp2-expanded-paid">' + ICON.check + '<span>' + esc(order.payment_method_title) + '</span></span>');
    }
    if (order.store_name) {
      metaParts.push('<span><strong>Tienda asignada:</strong> ' + esc(order.store_name) + '</span>');
    }

    return '' +
      '<button class="dlp2-expanded-close" data-action="collapse-order" title="Cerrar vista" type="button">' + ICON.close + '</button>' +

      '<div class="dlp2-expanded-topbar">' +
        '<div class="dlp2-expanded-top-row">' +
          '<div class="dlp2-expanded-left">' +
            '<h1 class="dlp2-expanded-title">Pedido #' + order.id + '</h1>' +
            '<div class="dlp2-expanded-badges">' +
              renderTypePill(order, false) +
              '<span class="dlp2-status-pill dlp2-status-' + statusColor(order.status) + '"><span class="dlp2-status-dot"></span>' + esc(statusLabel(order.status)) + '</span>' +
              (order.priority ? '<span class="dlp2-priority-pill">' + ICON.flag + '<span>Prioridad</span></span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="dlp2-expanded-right">' +
            (isFinalStatus(order.status) ? '' :
              '<button class="dlp2-flow-btn dlp2-expanded-flow-btn" data-action="advance" data-order-id="' + order.id + '">' + ICON.chevrons + '<span>' + esc(nextLabel(order.status)) + '</span></button>') +
          '</div>' +
        '</div>' +
        (metaParts.length ? '<div class="dlp2-expanded-meta">' + metaParts.join('<span class="dlp2-expanded-meta-sep">&bull;</span>') + '</div>' : '') +
      '</div>' +

      '<div class="dlp2-expanded-grid">' +

          '<div class="dlp2-expanded-col">' +
            renderTimeCard(order) +
            renderPrepProgress(order) +
            '<div class="dlp2-customer-card">' +
              '<div class="dlp2-section-title-row">' +
                '<span class="dlp2-section-title">Datos de Entrega y Cliente</span>' +
                renderTypePill(order, false) +
              '</div>' +
              '<div class="dlp2-customer-top">' +
                '<div class="dlp2-customer-name">' + ICON.user + '<span>' + esc(order.customer_name || 'Consumidor final') + '</span></div>' +
                (order.phone ? '<a class="dlp2-phone-link" href="tel:' + esc(order.phone) + '">' + ICON.phone + '<span>' + esc(order.phone) + '</span></a>' : '') +
              '</div>' +
              (order.full_address ? '<div class="dlp2-customer-address">' + ICON.pin + '<div><span class="dlp2-address-label">' + esc(addressLabel) + '</span><span class="dlp2-address-value">' + esc(order.full_address) + '</span></div></div>' : '') +
              (order.notes ? '<div class="dlp2-customer-note">' + ICON.alert + '<span>Nota: ' + esc(order.notes) + '</span></div>' : '') +
            '</div>' +
            '<div class="dlp2-expanded-totals">' +
              '<div class="dlp2-expanded-totals-row"><span>Cantidad de items</span><span>' + Number(order.items_count || items.length) + '</span></div>' +
              '<div class="dlp2-expanded-totals-divider"></div>' +
              '<div class="dlp2-expanded-totals-row dlp2-expanded-totals-final"><span>Total del Pedido</span><span class="dlp2-total-amount">' + esc(formatMoney(order.total)) + '</span></div>' +
            '</div>' +
            renderActionsCard(order) +
          '</div>' +

          '<div class="dlp2-expanded-col dlp2-expanded-col-mid">' +
            '<div class="dlp2-section-title-row dlp2-expanded-products-title">' +
              '<div class="dlp2-section-title-row">' +
                '<span class="dlp2-section-title">Detalle de Productos</span>' +
                '<span class="dlp2-items-count">' + Number(order.items_count || items.length) + ' items</span>' +
              '</div>' +
              '<span class="dlp2-expanded-combo-count">' + comboCount + ' combos</span>' +
            '</div>' +
            '<div class="dlp2-products dlp2-expanded-products">' + items.map(renderProductRow).join('') + '</div>' +
          '</div>' +

      '</div>';
  }

  // El esqueleto se crea una sola vez: el overlay del pedido expandido debe
  // ser un nodo estable (no recreado en cada render) para que la transicion
  // CSS de abrir/cerrar pueda animarse. Los renders posteriores solo
  // actualizan el contenido interno de cada slot.
  function ensureSkeleton() {
    if (root.querySelector('#dlp2-app')) {
      return;
    }

    root.innerHTML = '' +
      '<div id="dlp2-app">' +
        '<div id="dlp2-header-slot"></div>' +
        '<div id="dlp2-netwarn-slot"></div>' +
        '<div class="dlp2-stage">' +
          '<div id="dlp2-board-slot"></div>' +
          '<div class="dlp2-expanded-overlay" id="dlp2-expanded-overlay"></div>' +
        '</div>' +
      '</div>';
  }

  function render() {
    ensureSkeleton();

    var selected = state.orders.find(function (order) {
      return order.id === state.selectedOrderId;
    }) || null;

    var expandedOrder = state.expandedOrderId ? (state.orders.find(function (order) {
      return order.id === state.expandedOrderId;
    }) || null) : null;

    var visible = filteredOrders();
    var countFor = function (status) {
      return visible.filter(function (o) { return o.group === status; }).length;
    };

    document.getElementById('dlp2-header-slot').innerHTML = '' +
      '<div class="dlp2-header">' +
        '<div class="dlp2-header-left">' +
          '<span class="dlp2-brand">' + esc(window.DLP_PANELES_CONFIG.brandTitle || 'DEL PUENTE') + '</span>' +
          '<span class="dlp2-location">' + ICON.pin + '<span>' + esc(getStoreLabel()) + '</span></span>' +
          (window.DLP_PANELES_CONFIG.currentUserName ?
            '<span class="dlp2-location dlp2-current-user">' + ICON.user + '<span>' + esc(window.DLP_PANELES_CONFIG.currentUserName) + '</span></span>' : '') +
        '</div>' +
        renderTypeTabs() +
        '<div class="dlp2-header-right">' +
          '<div class="dlp2-datetime">' +
            '<strong>' + esc(formatNowTime()) + '</strong>' +
            '<span>' + esc(formatNowDate()) + '</span>' +
          '</div>' +
          '<button class="dlp2-btn-ghost" data-action="force-refresh" type="button">' + ICON.sync + '<span>Sincronizar</span></button>' +
          '<a class="dlp2-btn-dark" href="' + esc(window.DLP_PANELES_CONFIG.logoutUrl || '#') + '">' + ICON.logout + '<span>Cerrar Sesion</span></a>' +
        '</div>' +
      '</div>';

    document.getElementById('dlp2-netwarn-slot').innerHTML =
      state.networkWarning ? '<div class="dlp-netwarn">' + esc(state.networkWarning) + '</div>' : '';

    document.getElementById('dlp2-board-slot').innerHTML = '' +
      '<div class="dlp2-layout">' +
        '<section class="dlp2-board">' +
          '<div class="dlp2-column">' +
            '<div class="dlp2-column-header"><span class="dlp2-dot dlp2-dot-amber"></span><span class="dlp2-column-title">Procesando</span><span class="dlp2-column-count dlp2-count-amber">' + countFor('processing') + '</span></div>' +
            '<div class="dlp2-column-cards">' + renderCards('processing') + '</div>' +
          '</div>' +
          '<div class="dlp2-column">' +
            '<div class="dlp2-column-header"><span class="dlp2-dot dlp2-dot-blue"></span><span class="dlp2-column-title">Enviada / LPR</span><span class="dlp2-column-count dlp2-count-blue">' + countFor('shipped') + '</span></div>' +
            '<div class="dlp2-column-cards">' + renderCards('shipped') + '</div>' +
          '</div>' +
          '<div class="dlp2-column dlp2-column-narrow">' +
            '<div class="dlp2-column-header"><span class="dlp2-dot dlp2-dot-green"></span><span class="dlp2-column-title">Completada</span><span class="dlp2-column-count dlp2-count-green">' + countFor('completed') + '</span></div>' +
            '<div class="dlp2-column-cards">' + renderCards('completed') + '</div>' +
          '</div>' +
        '</section>' +
        renderDetail(selected) +
      '</div>';

    // El overlay del pedido expandido es un nodo persistente: se anima con
    // una transicion CSS de "left" (crece hacia la izquierda desde el ancho
    // de la columna de detalle hasta ocupar todo el tablero, y viceversa al
    // cerrar), en vez de destruirse y recrearse como el resto del panel.
    var overlay = document.getElementById('dlp2-expanded-overlay');
    var wasOpen = overlay.classList.contains('is-open');

    if (expandedOrder) {
      overlay.innerHTML = renderExpandedOrder(expandedOrder);
      overlay.classList.add('is-visible');

      if (!wasOpen) {
        overlay.classList.remove('is-open');
        void overlay.offsetWidth; // fuerza reflow para que el navegador registre el estado "cerrado" antes de animar
        requestAnimationFrame(function () {
          overlay.classList.add('is-open');
        });
      }
    } else if (wasOpen) {
      overlay.classList.remove('is-open');
      overlay.addEventListener('transitionend', function clearOverlay(e) {
        if (e.target !== overlay || e.propertyName !== 'left') {
          return;
        }
        overlay.removeEventListener('transitionend', clearOverlay);
        if (!overlay.classList.contains('is-open')) {
          overlay.innerHTML = '';
          overlay.classList.remove('is-visible');
        }
      });
    } else {
      overlay.innerHTML = '';
      overlay.classList.remove('is-visible');
    }
  }

  // Ticker en vivo: recalcula solo los nodos de tiempo (badges de tarjeta +
  // tarjeta de tiempo del detalle) cada segundo, sin re-renderizar todo el
  // panel (evita perder foco en inputs y es mas barato que un render() completo).
  function updateLiveTimes() {
    if (!state.orders.length) {
      return;
    }

    state.orders.forEach(function (order) {
      var badge = root.querySelector('[data-time-badge="' + order.id + '"]');
      if (!badge) {
        return;
      }
      var mini = badge.classList.contains('dlp2-time-badge-mini');
      badge.outerHTML = renderTimeBadge(order, liveElapsed(order), mini);
    });

    // La tarjeta de tiempo del tablero (.dlp2-detail) y la del overlay
    // expandido pueden coexistir en el DOM a la vez (el overlay ya no se
    // destruye al abrir/cerrar), asi que se actualizan por separado.
    function refreshTimeCard(containerEl, orderId) {
      if (!containerEl || !orderId) {
        return;
      }
      var timeCardEl = containerEl.querySelector('.dlp2-time-card');
      if (!timeCardEl) {
        return;
      }
      var order = state.orders.find(function (o) { return o.id === orderId; });
      if (order) {
        timeCardEl.outerHTML = renderTimeCard(order, liveElapsed(order));
      }
    }

    refreshTimeCard(document.getElementById('dlp2-board-slot'), state.selectedOrderId);
    refreshTimeCard(document.getElementById('dlp2-expanded-overlay'), state.expandedOrderId);
  }

  function loadPanel(pageSize) {
    var size = pageSize || state.currentPageSize || PAGE_SIZE_STEPS[0];
    var path = '/panel?page=1&per_page=' + size;

    return api(path, 'GET', null, { retries: 2, retryDelayMs: 1200 })
      .then(function (data) {
        state.networkWarning = '';
        state.orders = Array.isArray(data.orders) ? data.orders : [];
        state.counts = data.counts || { processing: 0, shipped: 0, completed: 0 };
        state.stores = Array.isArray(data.stores) ? data.stores : [];
        state.scope = data.scope || 'tienda';
        state.loadedAt = Date.now();

        var pagination = data.pagination || null;
        state.currentPageSize = pagination ? pagination.per_page : size;

        if (!state.selectedOrderId && state.orders.length) {
          state.selectedOrderId = state.orders[0].id;
        }

        if (state.selectedOrderId) {
          var exists = state.orders.some(function (order) {
            return order.id === state.selectedOrderId;
          });
          if (!exists) {
            state.selectedOrderId = state.orders.length ? state.orders[0].id : null;
          }
        }

        if (state.expandedOrderId) {
          var expandedExists = state.orders.some(function (order) {
            return order.id === state.expandedOrderId;
          });
          if (!expandedExists) {
            state.expandedOrderId = null;
          }
        }

        state.firstLoadDone = true;
        render();

        // Si el backend indica que quedan mas pedidos por traer, se sigue
        // escalando al siguiente tamano de pagina (10 -> 25 -> 50 -> ...)
        // en vez de esperar al proximo refresco automatico de 30s.
        if (pagination && pagination.has_more) {
          var idx = PAGE_SIZE_STEPS.indexOf(size);
          var nextSize = (idx > -1 && idx < PAGE_SIZE_STEPS.length - 1) ? PAGE_SIZE_STEPS[idx + 1] : size * 2;
          return loadPanel(nextSize);
        }
      })
      .catch(function (error) {
        console.error(error);

        if (!state.firstLoadDone) {
          state.networkWarning = 'No se pudo cargar el panel. Revisa tu sesion o conexion e intenta recargar.';
          render();
        } else {
          state.networkWarning = 'Conexion inestable. Reintentando refresco automatico...';
          render();
        }
      });
  }

  root.addEventListener('change', function (event) {
    var storeFilterSelect = event.target.closest('[data-action="store-filter"]');
    if (storeFilterSelect) {
      state.storeFilter = storeFilterSelect.value ? Number(storeFilterSelect.value) : '';
      render();
      return;
    }

    var select = event.target.closest('[data-action="reassign"]');
    if (!select || !select.dataset.orderId) {
      return;
    }

    var orderId = Number(select.dataset.orderId);
    var targetStoreId = Number(select.value);

    if (!targetStoreId) {
      return;
    }

    api('/pedido/' + orderId + '/tienda', 'POST', { store_id: targetStoreId })
      .then(function () { loadPanel(); })
      .catch(function (error) {
        alert('No se pudo reasignar tienda: ' + error.message);
      });
  });

  root.addEventListener('click', function (event) {
    var typeTab = event.target.closest('[data-type-filter]');
    if (typeTab) {
      state.typeFilter = typeTab.dataset.typeFilter;
      render();
      return;
    }

    var card = event.target.closest('.dlp2-card');
    if (card && card.dataset.orderId) {
      state.selectedOrderId = Number(card.dataset.orderId);
      render();
      return;
    }

    var loadMoreBtn = event.target.closest('[data-action="load-more"]');
    if (loadMoreBtn && loadMoreBtn.dataset.column) {
      var column = loadMoreBtn.dataset.column;
      state.columnLimits[column] = (state.columnLimits[column] || COLUMN_INITIAL_LIMIT) + COLUMN_LOAD_MORE;
      render();
      return;
    }

    var refreshBtn = event.target.closest('[data-action="force-refresh"]');
    if (refreshBtn) {
      forceRefresh(refreshBtn);
      return;
    }

    var expandBtn = event.target.closest('[data-action="expand-order"]');
    if (expandBtn && expandBtn.dataset.orderId) {
      state.expandedOrderId = Number(expandBtn.dataset.orderId);
      render();
      return;
    }

    var collapseBtn = event.target.closest('[data-action="collapse-order"]');
    if (collapseBtn) {
      state.expandedOrderId = null;
      render();
      return;
    }

    var actionBtn = event.target.closest('[data-action]');
    if (!actionBtn || !actionBtn.dataset.orderId) {
      return;
    }

    var orderId = Number(actionBtn.dataset.orderId);
    var action = actionBtn.dataset.action;

    if (action === 'advance') {
      var order = state.orders.find(function (item) { return item.id === orderId; });
      if (!order) {
        return;
      }

      var target = nextStatus(order.status);
      if (!target) {
        return;
      }

      api('/pedido/' + orderId + '/estado', 'POST', { new_status: target })
        .then(function () { loadPanel(); })
        .catch(function (error) {
          alert('No se pudo cambiar estado: ' + error.message);
        });
      return;
    }

    if (action === 'cancel') {
      var motivo = prompt('Motivo de cancelacion:');
      if (!motivo || !motivo.trim()) {
        return;
      }

      api('/pedido/' + orderId + '/cancelar', 'POST', { motivo: motivo.trim() })
        .then(function () { loadPanel(); })
        .catch(function (error) {
          alert('No se pudo cancelar: ' + error.message);
        });
      return;
    }

    if (action === 'toggle-priority') {
      var priorityOrder = state.orders.find(function (item) { return item.id === orderId; });
      if (!priorityOrder) {
        return;
      }

      api('/pedido/' + orderId + '/meta', 'POST', { priority: !priorityOrder.priority })
        .then(function () { loadPanel(); })
        .catch(function (error) {
          alert('No se pudo cambiar prioridad: ' + error.message);
        });
      return;
    }

    if (action === 'toggle-block-customer') {
      var blockOrder = state.orders.find(function (item) { return item.id === orderId; });
      if (!blockOrder) {
        return;
      }

      if (!blockOrder.customer_id) {
        alert('Este pedido no tiene una cuenta de cliente asociada (compra como invitado), no se puede bloquear.');
        return;
      }

      var nextBlocked = !blockOrder.customer_blocked;
      var confirmMsg = nextBlocked ?
        'Bloquear la cuenta de este cliente? No podra iniciar sesion en el sitio hasta que se desbloquee.' :
        'Desbloquear la cuenta de este cliente?';

      if (!confirm(confirmMsg)) {
        return;
      }

      api('/pedido/' + orderId + '/cliente-bloqueo', 'POST', { block: nextBlocked })
        .then(function () { loadPanel(); })
        .catch(function (error) {
          alert('No se pudo actualizar el bloqueo del cliente: ' + error.message);
        });
      return;
    }

    if (action === 'save-note') {
      var detailNote = actionBtn.closest('.dlp2-detail, .dlp2-expanded-overlay');
      var noteInput = detailNote ? detailNote.querySelector('[data-field="internal_note"]') : null;

      api('/pedido/' + orderId + '/meta', 'POST', {
        internal_note: noteInput ? noteInput.value : ''
      })
        .then(function () { loadPanel(); })
        .catch(function (error) {
          alert('No se pudo guardar nota: ' + error.message);
        });
    }
  });

  loadPanel();
  setInterval(loadPanel, Number(window.DLP_PANELES_CONFIG.refreshSeconds || 30) * 1000);
  setInterval(updateLiveTimes, 1000);
})();
