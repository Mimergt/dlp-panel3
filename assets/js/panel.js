(function () {
  var root = document.getElementById('dlp-paneles-root');
  if (!root || !window.DLP_PANELES_CONFIG) {
    return;
  }

  var state = {
    orders: [],
    selectedOrderId: null,
    counts: { processing: 0, dlv: 0, rtp: 0 },
    stores: [],
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

  function statusLabel(status) {
    if (status === 'processing') return 'Preparando';
    if (status === 'dlv') return 'Listo';
    if (status === 'rtp') return 'Para completar';
    return status;
  }

  function nextStatus(status) {
    if (status === 'processing') return 'dlv';
    if (status === 'dlv') return 'rtp';
    if (status === 'rtp') return 'completed';
    return null;
  }

  function nextLabel(status) {
    if (status === 'processing') return 'Mover a Listo';
    if (status === 'dlv') return 'Mover a Para completar';
    if (status === 'rtp') return 'Completar pedido';
    return 'Sin accion';
  }

  function api(path, method, payload) {
    return fetch(window.DLP_PANELES_CONFIG.apiBase + path, {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': window.DLP_PANELES_CONFIG.nonce,
      },
      credentials: 'same-origin',
      body: payload ? JSON.stringify(payload) : undefined,
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          throw new Error((data && data.message) || 'Error de API');
        }
        return data;
      });
    });
  }

  function renderCards(status) {
    return state.orders
      .filter(function (order) { return order.status === status; })
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
        '<h2>DLP Paneles v1.1.1</h2>' +
        '<small>Refresco automatico cada ' + Number(window.DLP_PANELES_CONFIG.refreshSeconds || 30) + 's</small>' +
      '</div>' +
      '<div class="dlp-layout">' +
        '<section class="dlp-board">' +
          '<div class="dlp-column"><h3>Preparando <span>' + state.counts.processing + '</span></h3><div>' + renderCards('processing') + '</div></div>' +
          '<div class="dlp-column"><h3>Listo <span>' + state.counts.dlv + '</span></h3><div>' + renderCards('dlv') + '</div></div>' +
          '<div class="dlp-column"><h3>Para completar <span>' + state.counts.rtp + '</span></h3><div>' + renderCards('rtp') + '</div></div>' +
        '</section>' +
        renderDetail(selected) +
      '</div>';
  }

  function loadPanel() {
    return api('/panel', 'GET')
      .then(function (data) {
        state.orders = Array.isArray(data.orders) ? data.orders : [];
        state.counts = data.counts || { processing: 0, dlv: 0, rtp: 0 };
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

        render();
      })
      .catch(function (error) {
        console.error(error);
        alert('No se pudo cargar el panel: ' + error.message);
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
