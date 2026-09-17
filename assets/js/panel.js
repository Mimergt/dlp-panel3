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

  var state = {
    orders: [],
    selectedOrderId: null,
    counts: { processing: 0, shipped: 0, completed: 0 },
    stores: [],
    networkWarning: '',
    firstLoadDone: false,
    loadedAt: 0,
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
    if (!state.loadedAt) {
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

    return state.orders
      .filter(function (order) {
        return order.group === status;
      })
      .map(function (order) {
        var active = order.id === state.selectedOrderId ? ' dlp2-card-active' : '';
        var priorityClass = order.priority ? ' dlp2-card-priority' : '';
        var seconds = liveElapsed(order);

        if (isMini) {
          return '' +
            '<article class="dlp2-card dlp2-card-mini' + active + priorityClass + '" data-order-id="' + order.id + '">' +
              '<div class="dlp2-card-top">' +
                '<span class="dlp2-card-id dlp2-card-id-mini">#' + order.id + '</span>' +
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
  }

  function renderProducts(order) {
    var items = Array.isArray(order.items) ? order.items : [];

    if (!items.length) {
      return '';
    }

    var rows = items.map(function (item) {
      var metaRows = (item.meta || []).map(function (m) {
        return '<div class="dlp2-product-meta-row"><span>&bull; ' + esc(m.label) + ': <strong>' + esc(m.value) + '</strong></span></div>';
      }).join('');

      return '' +
        '<div class="dlp2-product">' +
          '<div class="dlp2-product-top">' +
            '<span class="dlp2-product-qty">' + Number(item.quantity || 1) + '</span>' +
            '<span class="dlp2-product-name">' + esc(item.name) + '</span>' +
            '<span class="dlp2-product-price">' + esc(formatMoney(item.total)) + '</span>' +
          '</div>' +
          (metaRows ? '<div class="dlp2-product-meta">' + metaRows + '</div>' : '') +
        '</div>';
    }).join('');

    return '' +
      '<div class="dlp2-section">' +
        '<div class="dlp2-section-title-row">' +
          '<span class="dlp2-section-title">Detalle de Productos</span>' +
          '<span class="dlp2-items-count">' + Number(order.items_count || items.length) + ' items</span>' +
        '</div>' +
        '<div class="dlp2-products">' + rows + '</div>' +
        '<div class="dlp2-total-row"><span>Total</span><span class="dlp2-total-amount">' + esc(formatMoney(order.total)) + '</span></div>' +
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

  function renderDetail(order) {
    if (!order) {
      return '<aside class="dlp2-detail"><div class="dlp2-detail-header">' + ICON.file + '<span>Detalle del pedido</span></div><div class="dlp2-detail-body"><p class="dlp2-empty">Selecciona un pedido para operar.</p></div></aside>';
    }

    var storeOptions = (state.stores || []).map(function (store) {
      var selected = Number(store.id) === Number(order.store_id) ? ' selected' : '';
      return '<option value="' + Number(store.id) + '"' + selected + '>' + esc(store.name) + '</option>';
    }).join('');

    var metaLine = [];
    if (order.entry_time) {
      metaLine.push('Ingreso: ' + esc(order.entry_time));
    }
    if (order.payment_method_title) {
      metaLine.push(esc(order.payment_method_title));
    }

    return '' +
      '<aside class="dlp2-detail">' +
        '<div class="dlp2-detail-header">' + ICON.file + '<span>Detalle del pedido</span></div>' +
        '<div class="dlp2-detail-body">' +

          '<div class="dlp2-detail-top">' +
            '<div class="dlp2-detail-title-row">' +
              '<span class="dlp2-detail-order-id">Pedido #' + order.id + '</span>' +
              '<span class="dlp2-status-pill dlp2-status-' + statusColor(order.status) + '"><span class="dlp2-status-dot"></span>' + esc(statusLabel(order.status)) + '</span>' +
              (order.priority ? '<span class="dlp2-priority-pill">' + ICON.flag + '<span>Prioridad</span></span>' : '') +
            '</div>' +
            (metaLine.length ? '<div class="dlp2-detail-meta">' + metaLine.join(' &bull; ') + '</div>' : '') +
          '</div>' +

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
              (order.full_address ? '<div class="dlp2-customer-address">' + ICON.pin + '<div><span class="dlp2-address-label">Direccion de entrega</span><span class="dlp2-address-value">' + esc(order.full_address) + '</span></div></div>' : '') +
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

  function render() {
    var selected = state.orders.find(function (order) {
      return order.id === state.selectedOrderId;
    }) || null;

    root.innerHTML = '' +
      '<div class="dlp2-header">' +
        '<div class="dlp2-header-left">' +
          '<span class="dlp2-brand">' + esc(window.DLP_PANELES_CONFIG.brandTitle || 'DEL PUENTE') + '</span>' +
          '<span class="dlp2-location">' + ICON.pin + '<span>' + esc(getStoreLabel()) + '</span></span>' +
        '</div>' +
        '<div class="dlp2-header-right">' +
          '<div class="dlp2-datetime">' +
            '<strong>' + esc(formatNowTime()) + '</strong>' +
            '<span>' + esc(formatNowDate()) + '</span>' +
          '</div>' +
          '<button class="dlp2-btn-ghost" data-action="force-refresh" type="button">' + ICON.sync + '<span>Descargar Pedidos</span></button>' +
          '<a class="dlp2-btn-dark" href="' + esc(window.DLP_PANELES_CONFIG.logoutUrl || '#') + '">' + ICON.logout + '<span>Cerrar Sesion</span></a>' +
        '</div>' +
      '</div>' +
      (state.networkWarning ? '<div class="dlp-netwarn">' + esc(state.networkWarning) + '</div>' : '') +
      '<div class="dlp2-layout">' +
        '<section class="dlp2-board">' +
          '<div class="dlp2-column">' +
            '<div class="dlp2-column-header"><span class="dlp2-dot dlp2-dot-amber"></span><span class="dlp2-column-title">Procesando</span><span class="dlp2-column-count dlp2-count-amber">' + Number(state.counts.processing || 0) + '</span></div>' +
            '<div class="dlp2-column-cards">' + renderCards('processing') + '</div>' +
          '</div>' +
          '<div class="dlp2-column">' +
            '<div class="dlp2-column-header"><span class="dlp2-dot dlp2-dot-blue"></span><span class="dlp2-column-title">Enviada / LPR</span><span class="dlp2-column-count dlp2-count-blue">' + Number(state.counts.shipped || 0) + '</span></div>' +
            '<div class="dlp2-column-cards">' + renderCards('shipped') + '</div>' +
          '</div>' +
          '<div class="dlp2-column dlp2-column-narrow">' +
            '<div class="dlp2-column-header"><span class="dlp2-dot dlp2-dot-green"></span><span class="dlp2-column-title">Completada</span><span class="dlp2-column-count dlp2-count-green">' + Number(state.counts.completed || 0) + '</span></div>' +
            '<div class="dlp2-column-cards">' + renderCards('completed') + '</div>' +
          '</div>' +
        '</section>' +
        renderDetail(selected) +
      '</div>';
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

    var detailEl = root.querySelector('.dlp2-detail');
    var timeCardEl = detailEl ? detailEl.querySelector('.dlp2-time-card') : null;
    if (timeCardEl && state.selectedOrderId) {
      var selected = state.orders.find(function (order) {
        return order.id === state.selectedOrderId;
      });
      if (selected) {
        timeCardEl.outerHTML = renderTimeCard(selected, liveElapsed(selected));
      }
    }
  }

  function loadPanel() {
    return api('/panel', 'GET', null, { retries: 2, retryDelayMs: 1200 })
      .then(function (data) {
        state.networkWarning = '';
        state.orders = Array.isArray(data.orders) ? data.orders : [];
        state.counts = data.counts || { processing: 0, shipped: 0, completed: 0 };
        state.stores = Array.isArray(data.stores) ? data.stores : [];
        state.loadedAt = Date.now();

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

        state.firstLoadDone = true;
        render();
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
      .then(loadPanel)
      .catch(function (error) {
        alert('No se pudo reasignar tienda: ' + error.message);
      });
  });

  root.addEventListener('click', function (event) {
    var card = event.target.closest('.dlp2-card');
    if (card && card.dataset.orderId) {
      state.selectedOrderId = Number(card.dataset.orderId);
      render();
      return;
    }

    var refreshBtn = event.target.closest('[data-action="force-refresh"]');
    if (refreshBtn) {
      forceRefresh(refreshBtn);
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
        .then(loadPanel)
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
        .then(loadPanel)
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
        .then(loadPanel)
        .catch(function (error) {
          alert('No se pudo cambiar prioridad: ' + error.message);
        });
      return;
    }

    if (action === 'save-note') {
      var detailNote = actionBtn.closest('.dlp2-detail');
      var noteInput = detailNote ? detailNote.querySelector('[data-field="internal_note"]') : null;

      api('/pedido/' + orderId + '/meta', 'POST', {
        internal_note: noteInput ? noteInput.value : ''
      })
        .then(loadPanel)
        .catch(function (error) {
          alert('No se pudo guardar nota: ' + error.message);
        });
    }
  });

  loadPanel();
  setInterval(loadPanel, Number(window.DLP_PANELES_CONFIG.refreshSeconds || 30) * 1000);
  setInterval(updateLiveTimes, 1000);
})();
