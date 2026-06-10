(function () {
  var root = document.getElementById('dlp-paneles-root');
  if (!root || !window.DLP_PANELES_CONFIG) {
    return;
  }

  var state = {
    orders: [],
    selectedOrderId: null,
    counts: { processing: 0, prep: 0, shipped: 0 },
    stores: [],
    networkWarning: '',
    firstLoadDone: false,
  };

  function fmtElapsed(seconds) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

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

  function statusLabel(status) {
    if (status === 'processing') return 'Procesando';
    if (status === 'prep') return 'Preparando';
    if (status === 'lpr') return 'Enviada / LPR';
    if (status === 'rtp') return 'Enviada / LPR';
    return status;
  }

  function nextStatus(status) {
    if (status === 'processing') return 'prep';
    if (status === 'prep') return 'lpr';
    if (status === 'lpr') return 'completed';
    if (status === 'rtp') return 'completed';
    return null;
  }

  function nextLabel(status) {
    if (status === 'processing') return 'Mover a Preparacion';
    if (status === 'prep') return 'Marcar Enviada / LPR';
    if (status === 'lpr' || status === 'rtp') return 'Completar pedido';
    return 'Sin accion';
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

  function renderCards(status) {
    return state.orders
      .filter(function (order) {
        if (status === 'processing') return order.group === 'processing';
        if (status === 'prep') return order.group === 'prep';
        return order.group === 'shipped';
      })
      .map(function (order) {
        var active = order.id === state.selectedOrderId ? 'active' : '';
        return '' +
          '<article class="dlp-card ' + active + '" data-order-id="' + order.id + '">' +
            '<header class="dlp-card-header">' +
              '<strong>#' + order.id + '</strong>' +
              (order.priority ? '<span class="dlp-priority">Prioridad</span>' : '') +
            '</header>' +
            '<p><strong>' + esc(order.store_name || 'Sin tienda') + '</strong></p>' +
            '<p>' + esc(order.customer_name || 'Consumidor final') + '</p>' +
            '<p>Estado: ' + esc(statusLabel(order.status)) + '</p>' +
            '<p>Tiempo: ' + fmtElapsed(Number(order.elapsed_seconds || 0)) + '</p>' +
          '</article>';
      })
      .join('');
  }

  function renderDetail(order) {
    if (!order) {
      return '<section class="dlp-detail"><h2>Detalle</h2><p>Selecciona un pedido para operar.</p></section>';
    }

    var storeOptions = (state.stores || []).map(function (store) {
      var selected = Number(store.id) === Number(order.store_id) ? ' selected' : '';
      return '<option value="' + Number(store.id) + '"' + selected + '>' + esc(store.name) + '</option>';
    }).join('');

    return '' +
      '<section class="dlp-detail">' +
        '<h2>Pedido #' + order.id + '</h2>' +
        '<p><strong>Estado:</strong> ' + statusLabel(order.status) + '</p>' +
        '<p><strong>Tienda:</strong> ' + esc(order.store_name || 'Sin tienda') + '</p>' +
        '<p><strong>Cliente:</strong> ' + esc(order.customer_name || 'Consumidor final') + '</p>' +
        '<p><strong>Telefono:</strong> ' + esc(order.phone || '-') + '</p>' +
        '<p><strong>Direccion:</strong> ' + esc(order.address || '-') + '</p>' +
        '<p><strong>Tiempo:</strong> ' + fmtElapsed(Number(order.elapsed_seconds || 0)) + '</p>' +
        '<label class="dlp-field">' +
          '<span>Tienda asignada</span>' +
          '<select data-field="store_id">' + storeOptions + '</select>' +
          '<button class="dlp-btn" data-action="reassign" data-order-id="' + order.id + '">Reasignar tienda</button>' +
        '</label>' +
        '<label class="dlp-field dlp-check">' +
          '<input type="checkbox" data-field="priority" ' + (order.priority ? 'checked' : '') + ' />' +
          '<span>Marcar prioridad</span>' +
          '<button class="dlp-btn" data-action="save-priority" data-order-id="' + order.id + '">Guardar prioridad</button>' +
        '</label>' +
        '<label class="dlp-field">' +
          '<span>Nota interna</span>' +
          '<textarea rows="4" data-field="internal_note" placeholder="Escribe nota interna para supervisor/tienda">' + esc(order.internal_note || '') + '</textarea>' +
          '<button class="dlp-btn" data-action="save-note" data-order-id="' + order.id + '">Guardar nota</button>' +
        '</label>' +
        '<div class="dlp-actions">' +
          '<button class="dlp-btn dlp-btn-primary" data-action="advance" data-order-id="' + order.id + '">' + esc(nextLabel(order.status)) + '</button>' +
          '<button class="dlp-btn dlp-btn-danger" data-action="cancel" data-order-id="' + order.id + '">Cancelar pedido</button>' +
        '</div>' +
      '</section>';
  }

  function render() {
    var selected = state.orders.find(function (order) {
      return order.id === state.selectedOrderId;
    }) || null;

    root.innerHTML = '' +
      '<div class="dlp-toolbar">' +
        '<div class="dlp-toolbar-left">' +
          '<div class="dlp-brand">' +
            '<img src="' + esc(window.DLP_PANELES_CONFIG.brandLogoUrl || '') + '" alt="DEL PUENTE" class="dlp-brand-logo" />' +
            '<span class="dlp-brand-title">' + esc(window.DLP_PANELES_CONFIG.brandTitle || 'DEL PUENTE') + '</span>' +
          '</div>' +
          '<div class="dlp-store-name">' + esc(getStoreLabel()) + '</div>' +
        '</div>' +
        '<div class="dlp-toolbar-right">' +
          '<div class="dlp-datetime">' +
            '<strong>' + esc(formatNowTime()) + '</strong>' +
            '<span>' + esc(formatNowDate()) + '</span>' +
          '</div>' +
          '<a class="dlp-btn dlp-btn-logout" href="' + esc(window.DLP_PANELES_CONFIG.logoutUrl || '#') + '">Cerrar Sesion</a>' +
        '</div>' +
      '</div>' +
      (state.networkWarning ? '<div class="dlp-netwarn">' + esc(state.networkWarning) + '</div>' : '') +
      '<div class="dlp-layout">' +
        '<section class="dlp-board">' +
          '<div class="dlp-column dlp-col-received"><h3>Recibidos (' + Number(state.counts.processing || 0) + ')</h3><div>' + renderCards('processing') + '</div></div>' +
          '<div class="dlp-column dlp-col-prep"><h3>En preparacion (' + Number(state.counts.prep || 0) + ')</h3><div>' + renderCards('prep') + '</div></div>' +
          '<div class="dlp-column dlp-col-shipped"><h3>Enviado / LPR (' + Number(state.counts.shipped || 0) + ')</h3><div>' + renderCards('shipped') + '</div></div>' +
        '</section>' +
        renderDetail(selected) +
      '</div>';
  }

  function loadPanel() {
    return api('/panel', 'GET', null, { retries: 2, retryDelayMs: 1200 })
      .then(function (data) {
        state.networkWarning = '';
        state.orders = Array.isArray(data.orders) ? data.orders : [];
        state.counts = data.counts || { processing: 0, prep: 0, shipped: 0 };
        state.stores = Array.isArray(data.stores) ? data.stores : [];

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

  root.addEventListener('click', function (event) {
    var card = event.target.closest('.dlp-card');
    if (card && card.dataset.orderId) {
      state.selectedOrderId = Number(card.dataset.orderId);
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

    if (action === 'save-priority') {
      var detail = actionBtn.closest('.dlp-detail');
      var check = detail ? detail.querySelector('[data-field="priority"]') : null;

      api('/pedido/' + orderId + '/meta', 'POST', {
        priority: !!(check && check.checked)
      })
        .then(loadPanel)
        .catch(function (error) {
          alert('No se pudo guardar prioridad: ' + error.message);
        });
      return;
    }

    if (action === 'save-note') {
      var detailNote = actionBtn.closest('.dlp-detail');
      var textarea = detailNote ? detailNote.querySelector('[data-field="internal_note"]') : null;

      api('/pedido/' + orderId + '/meta', 'POST', {
        internal_note: textarea ? textarea.value : ''
      })
        .then(loadPanel)
        .catch(function (error) {
          alert('No se pudo guardar nota: ' + error.message);
        });
      return;
    }

    if (action === 'reassign') {
      var detailStore = actionBtn.closest('.dlp-detail');
      var storeSelect = detailStore ? detailStore.querySelector('[data-field="store_id"]') : null;
      var targetStoreId = storeSelect ? Number(storeSelect.value) : 0;

      if (!targetStoreId) {
        alert('Selecciona una tienda valida');
        return;
      }

      api('/pedido/' + orderId + '/tienda', 'POST', {
        store_id: targetStoreId
      })
        .then(loadPanel)
        .catch(function (error) {
          alert('No se pudo reasignar tienda: ' + error.message);
        });
    }
  });

  loadPanel();
  setInterval(loadPanel, Number(window.DLP_PANELES_CONFIG.refreshSeconds || 30) * 1000);
})();
