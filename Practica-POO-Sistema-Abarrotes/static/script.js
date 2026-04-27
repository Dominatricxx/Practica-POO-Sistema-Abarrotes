// Estado global
let productos = [];
let ventaActual = null;
let folioContador = 100;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    cargarClientes();
    nuevaVenta();

    // Event listeners
    document.getElementById('formProducto').addEventListener('submit', registrarProducto);
    document.getElementById('formCliente').addEventListener('submit', registrarCliente);
    document.getElementById('tipoDescuento').addEventListener('change', toggleCamposDescuento);
});

// ==================== FUNCIONES DE PRODUCTOS ====================
async function cargarProductos() {
    try {
        const response = await fetch('/api/productos');
        productos = await response.json();
        mostrarProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarNotificacion('Error al cargar productos', 'error');
    }
}

function mostrarProductos() {
    const grid = document.getElementById('productosGrid');
    if (productos.length === 0) {
        grid.innerHTML = '<div class="no-productos">No hay productos registrados</div>';
        return;
    }

    grid.innerHTML = productos.map(producto => `
        <div class="producto-card">
            <div class="producto-header">
                <h3>${escapeHtml(producto.nombre)}</h3>
                <span class="producto-tipo">${producto.tipo === 'ProductoUnitario' ? 'Unitario' : 'Granel'}</span>
            </div>
            <div class="producto-info">
                <p><i class="fas fa-barcode"></i> ${escapeHtml(producto.codigoBarra)}</p>
                <p><i class="fas fa-tag"></i> ${escapeHtml(producto.categoria)}</p>
                <p><i class="fas fa-dollar-sign"></i> $${producto.precioVenta.toFixed(2)}</p>
                <p class="stock ${producto.stock < 5 ? 'stock-bajo' : ''}">
                    <i class="fas fa-cubes"></i> Stock: ${producto.stock}
                </p>
            </div>
            <button onclick="agregarAlCarrito('${producto.codigoBarra}')" class="btn-agregar-carrito" ${producto.stock <= 0 ? 'disabled' : ''}>
                <i class="fas fa-cart-plus"></i> ${producto.stock <= 0 ? 'Sin Stock' : 'Agregar'}
            </button>
        </div>
    `).join('');
}

async function registrarProducto(event) {
    event.preventDefault();

    const producto = {
        tipo: document.getElementById('tipoProducto').value,
        codigoBarra: document.getElementById('codigoProducto').value,
        nombre: document.getElementById('nombreProducto').value,
        categoria: document.getElementById('categoriaProducto').value,
        precioCompra: parseFloat(document.getElementById('precioCompraProducto').value),
        precioVenta: parseFloat(document.getElementById('precioVentaProducto').value),
        stock: parseFloat(document.getElementById('stockProducto').value)
    };

    // Validaciones
    if (!producto.codigoBarra || !producto.nombre || !producto.categoria) {
        mostrarNotificacion('Por favor completa todos los campos', 'error');
        return;
    }

    if (producto.precioVenta <= producto.precioCompra) {
        mostrarNotificacion('El precio de venta debe ser mayor al precio de compra', 'error');
        return;
    }

    try {
        const response = await fetch('/api/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(producto)
        });

        if (response.ok) {
            mostrarNotificacion('Producto registrado exitosamente', 'success');
            cerrarModalProducto();
            document.getElementById('formProducto').reset();
            await cargarProductos();
        } else {
            const error = await response.json();
            mostrarNotificacion('Error: ' + error.detail, 'error');
        }
    } catch (error) {
        console.error('Error registrando producto:', error);
        mostrarNotificacion('Error al registrar producto', 'error');
    }
}

async function eliminarProducto(codigoBarra) {
    const confirmar = confirm('¿Estás seguro de eliminar este producto?');
    if (!confirmar) return;

    try {
        const response = await fetch(`/api/productos/${codigoBarra}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            mostrarNotificacion('Producto eliminado', 'success');
            await cargarProductos();
        } else {
            mostrarNotificacion('Error al eliminar producto', 'error');
        }
    } catch (error) {
        console.error('Error eliminando producto:', error);
        mostrarNotificacion('Error al eliminar producto', 'error');
    }
}

// ==================== FUNCIONES DE CLIENTES ====================
async function cargarClientes() {
    try {
        const response = await fetch('/api/clientes');
        const clientes = await response.json();
        const select = document.getElementById('clienteSelect');
        const clienteActual = select.value;

        select.innerHTML = '<option value="">Público General</option>' +
            clientes.map(cliente => `<option value="${cliente.telefono}" ${clienteActual === cliente.telefono ? 'selected' : ''}>
                ${escapeHtml(cliente.nombre)} (${cliente.puntos} pts)
            </option>`).join('');
    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}

async function registrarCliente(event) {
    event.preventDefault();

    const cliente = {
        nombre: document.getElementById('nombreCliente').value,
        telefono: document.getElementById('telefonoCliente').value,
        puntos_iniciales: parseInt(document.getElementById('puntosCliente').value) || 0
    };

    if (!cliente.nombre || !cliente.telefono) {
        mostrarNotificacion('Por favor completa todos los campos', 'error');
        return;
    }

    try {
        const response = await fetch('/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cliente)
        });

        if (response.ok) {
            mostrarNotificacion('Cliente registrado exitosamente', 'success');
            cerrarModalCliente();
            await cargarClientes();
            document.getElementById('formCliente').reset();
        } else {
            const error = await response.json();
            mostrarNotificacion('Error: ' + error.detail, 'error');
        }
    } catch (error) {
        console.error('Error registrando cliente:', error);
        mostrarNotificacion('Error al registrar cliente', 'error');
    }
}

// ==================== FUNCIONES DE VENTAS ====================
async function nuevaVenta() {
    folioContador++;
    const folio = `F-${folioContador}`;
    const telefonoCliente = document.getElementById('clienteSelect').value;

    try {
        const response = await fetch('/api/ventas/nueva', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                folio: folio,
                telefono_cliente: telefonoCliente || null
            })
        });

        const data = await response.json();
        if (data.success) {
            ventaActual = data.venta;
            document.getElementById('folioVenta').textContent = `Folio: ${folio}`;
            actualizarCarrito();
            // Limpiar campos de descuento
            document.getElementById('tipoDescuento').value = 'ninguno';
            document.getElementById('valorDescuento').value = '';
            document.getElementById('categoriaDescuento').value = '';
            toggleCamposDescuento();
        } else {
            mostrarNotificacion('Error al crear nueva venta', 'error');
        }
    } catch (error) {
        console.error('Error creando nueva venta:', error);
        mostrarNotificacion('Error al crear nueva venta', 'error');
    }
}

async function agregarAlCarrito(codigoBarra) {
    const producto = productos.find(p => p.codigoBarra === codigoBarra);
    if (!producto) {
        mostrarNotificacion('Producto no encontrado', 'error');
        return;
    }

    let cantidad;
    if (producto.tipo === 'ProductoUnitario') {
        cantidad = prompt(`¿Cuántas unidades de ${producto.nombre} deseas agregar?`, '1');
    } else {
        cantidad = prompt(`¿Cuántos kilos/gramos de ${producto.nombre} deseas agregar?`, '1');
    }

    if (!cantidad || isNaN(cantidad) || cantidad <= 0) return;

    if (cantidad > producto.stock) {
        mostrarNotificacion(`Stock insuficiente. Solo hay ${producto.stock} disponibles`, 'error');
        return;
    }

    const item = {
        codigoBarra: codigoBarra,
        cantidad: parseFloat(cantidad)
    };

    try {
        const response = await fetch('/api/ventas/agregar-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });

        const result = await response.json();

        if (result.error) {
            mostrarNotificacion(result.error, 'error');
        } else {
            if (result.alertas && result.alertas.length > 0) {
                result.alertas.forEach(alerta => mostrarNotificacion(alerta, 'warning'));
            }
            ventaActual.carrito = result.carrito_actual;
            // Recalcular totales
            await recalcularTotales();
            actualizarCarrito();
            // Recargar productos para actualizar stock
            await cargarProductos();
        }
    } catch (error) {
        console.error('Error agregando al carrito:', error);
        mostrarNotificacion('Error al agregar producto', 'error');
    }
}

async function recalcularTotales() {
    if (!ventaActual.carrito || ventaActual.carrito.length === 0) {
        ventaActual.subtotal = 0;
        ventaActual.impuestos = 0;
        ventaActual.total = 0;
        return;
    }

    ventaActual.subtotal = ventaActual.carrito.reduce((sum, item) => sum + item.subtotal_detalle, 0);
    ventaActual.impuestos = ventaActual.carrito.reduce((sum, item) => sum + (item.impuesto_detalle || 0), 0);
    ventaActual.total = ventaActual.subtotal + ventaActual.impuestos - (ventaActual.descuento || 0);
}

function actualizarCarrito() {
    const carritoDiv = document.getElementById('carritoItems');

    if (!ventaActual.carrito || ventaActual.carrito.length === 0) {
        carritoDiv.innerHTML = '<div class="carrito-vacio">Agrega productos al carrito</div>';
        document.getElementById('subtotal').textContent = '$0.00';
        document.getElementById('impuestos').textContent = '$0.00';
        document.getElementById('descuento').textContent = '-$0.00';
        document.getElementById('total').textContent = '$0.00';
        return;
    }

    carritoDiv.innerHTML = ventaActual.carrito.map((item, index) => `
        <div class="carrito-item">
            <div class="item-info">
                <strong>${escapeHtml(item.producto.nombre)}</strong>
                <small>$${item.precio_unitario.toFixed(2)} c/u</small>
            </div>
            <div class="item-cantidad">
                x${item.cantidad}
            </div>
            <div class="item-subtotal">
                $${item.subtotal_detalle.toFixed(2)}
            </div>
        </div>
    `).join('');

    document.getElementById('subtotal').textContent = `$${ventaActual.subtotal.toFixed(2)}`;
    document.getElementById('impuestos').textContent = `$${ventaActual.impuestos.toFixed(2)}`;
    document.getElementById('descuento').textContent = `-$${(ventaActual.descuento || 0).toFixed(2)}`;
    document.getElementById('total').textContent = `$${ventaActual.total.toFixed(2)}`;
}

function toggleCamposDescuento() {
    const tipo = document.getElementById('tipoDescuento').value;
    const valorInput = document.getElementById('valorDescuento');
    const categoriaInput = document.getElementById('categoriaDescuento');

    if (tipo === 'ninguno') {
        valorInput.disabled = true;
        categoriaInput.disabled = true;
        valorInput.placeholder = 'Selecciona un descuento';
        categoriaInput.placeholder = 'Categoría (para 3x2)';
    } else if (tipo === 'porcentaje' || tipo === 'fijo') {
        valorInput.disabled = false;
        categoriaInput.disabled = true;
        valorInput.placeholder = tipo === 'porcentaje' ? 'Ej: 10 (10%)' : 'Ej: 50 ($50)';
        categoriaInput.placeholder = 'No aplica';
        categoriaInput.value = '';
    } else if (tipo === '3x2') {
        valorInput.disabled = true;
        categoriaInput.disabled = false;
        valorInput.placeholder = 'No aplica';
        categoriaInput.placeholder = 'Ej: Lacteos, Granos, etc.';
        valorInput.value = '';
    }
}

async function aplicarDescuento() {
    const tipo = document.getElementById('tipoDescuento').value;
    if (tipo === 'ninguno') {
        // Quitar descuento
        ventaActual.descuento = 0;
        await recalcularTotales();
        actualizarCarrito();
        mostrarNotificacion('Descuento eliminado', 'info');
        return;
    }

    let valor = null;
    let categoria = null;

    if (tipo === 'porcentaje' || tipo === 'fijo') {
        valor = parseFloat(document.getElementById('valorDescuento').value);
        if (isNaN(valor) || valor <= 0) {
            mostrarNotificacion('Ingresa un valor válido para el descuento', 'error');
            return;
        }
        if (tipo === 'porcentaje' && valor > 100) {
            mostrarNotificacion('El porcentaje no puede superar el 100%', 'error');
            return;
        }
    } else if (tipo === '3x2') {
        categoria = document.getElementById('categoriaDescuento').value;
        if (!categoria) {
            mostrarNotificacion('Ingresa una categoría para el descuento 3x2', 'error');
            return;
        }
    }

    const descuento = {
        tipo: tipo,
        valor: valor,
        categoria: categoria
    };

    try {
        const response = await fetch('/api/ventas/descuento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(descuento)
        });

        const result = await response.json();

        if (response.ok) {
            ventaActual.total = result.total_nuevo;
            ventaActual.descuento = result.descuento_aplicado;
            await recalcularTotales();
            actualizarCarrito();
            mostrarNotificacion(`Descuento aplicado: $${result.descuento_aplicado.toFixed(2)}`, 'success');
        } else {
            mostrarNotificacion('Error al aplicar descuento', 'error');
        }
    } catch (error) {
        console.error('Error aplicando descuento:', error);
        mostrarNotificacion('Error al aplicar descuento', 'error');
    }
}

async function finalizarVenta() {
    if (!ventaActual.carrito || ventaActual.carrito.length === 0) {
        mostrarNotificacion('No hay productos en el carrito', 'error');
        return;
    }

    // Mostrar resumen para confirmar
    const totalMostrar = ventaActual.total.toFixed(2);
    const confirmar = confirm(`Total a pagar: $${totalMostrar}\n¿Confirmar venta?`);
    if (!confirmar) return;

    try {
        const response = await fetch('/api/ventas/finalizar', {
            method: 'POST'
        });

        const result = await response.json();

        if (response.ok) {
            mostrarTicket(result.ticket);
            mostrarNotificacion(`Venta completada. Puntos ganados: ${result.puntos_ganados}`, 'success');
            // Recargar productos para actualizar stocks
            await cargarProductos();
            // Recargar clientes para actualizar puntos
            await cargarClientes();
            // Iniciar nueva venta
            await nuevaVenta();
        } else {
            mostrarNotificacion(result.error || 'Error al finalizar venta', 'error');
        }
    } catch (error) {
        console.error('Error finalizando venta:', error);
        mostrarNotificacion('Error al finalizar venta', 'error');
    }
}

// ==================== FUNCIONES DE TICKET ====================
function mostrarTicket(ticket) {
    const modal = document.getElementById('modalTicket');
    const ticketContent = document.getElementById('ticketContent');
    ticketContent.textContent = ticket;
    modal.style.display = 'block';

    // Opción para imprimir
    setTimeout(() => {
        const imprimirBtn = document.createElement('button');
        imprimirBtn.innerHTML = '<i class="fas fa-print"></i> Imprimir Ticket';
        imprimirBtn.className = 'btn-print';
        imprimirBtn.onclick = () => {
            const ventana = window.open('', '_blank');
            ventana.document.write('<pre>' + ticket + '</pre>');
            ventana.print();
            ventana.close();
        };
        const modalContent = modal.querySelector('.modal-content');
        if (!modalContent.querySelector('.btn-print')) {
            modalContent.appendChild(imprimirBtn);
        }
    }, 100);
}

// ==================== FUNCIONES DE MODALES ====================
function mostrarModalProducto() {
    const modal = document.getElementById('modalProducto');
    modal.style.display = 'block';
}

function cerrarModalProducto() {
    const modal = document.getElementById('modalProducto');
    modal.style.display = 'none';
    document.getElementById('formProducto').reset();
}

function mostrarModalCliente() {
    const modal = document.getElementById('modalCliente');
    modal.style.display = 'block';
}

function cerrarModalCliente() {
    const modal = document.getElementById('modalCliente');
    modal.style.display = 'none';
    document.getElementById('formCliente').reset();
}

function cerrarModalTicket() {
    const modal = document.getElementById('modalTicket');
    modal.style.display = 'none';
    const printBtn = modal.querySelector('.btn-print');
    if (printBtn) printBtn.remove();
}

// ==================== FUNCIONES DE NOTIFICACIONES ====================
function mostrarNotificacion(mensaje, tipo) {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : tipo === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
        <span>${mensaje}</span>
    `;

    document.body.appendChild(notificacion);

    // Animación de entrada
    setTimeout(() => notificacion.classList.add('mostrar'), 10);

    // Auto-cerrar después de 3 segundos
    setTimeout(() => {
        notificacion.classList.remove('mostrar');
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// ==================== FUNCIÓN UTILITARIA ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== EVENTOS GLOBALES ====================
// Cerrar modales al hacer clic fuera
window.onclick = function (event) {
    const modales = document.querySelectorAll('.modal');
    modales.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Cambiar cliente cuando se selecciona uno nuevo
document.getElementById('clienteSelect').addEventListener('change', async function () {
    if (ventaActual && ventaActual.carrito && ventaActual.carrito.length > 0) {
        const confirmar = confirm('Cambiar de cliente reiniciará la venta actual. ¿Continuar?');
        if (!confirmar) {
            this.value = ventaActual.cliente?.telefono || '';
            return;
        }
    }
    await nuevaVenta();
});