let productos = [];
let ventaActual = null;
let folioContador = 100;
let rolActual = null;
let productoPendiente = null;
let productosFiltrados = [];
let contrasenaAdmin = "";

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('formProducto').addEventListener('submit', registrarProducto);
    document.getElementById('formCliente').addEventListener('submit', registrarCliente);
    document.getElementById('tipoDescuento').addEventListener('change', toggleCamposDescuento);
});

function seleccionarRol(rol) {
    rolActual = rol;
    document.getElementById('menuInicial').style.display = 'none';
    document.getElementById('contenidoPrincipal').style.display = 'block';

    const rolText = rol === 'empleado' ? 'Empleado - Modo Administración' : 'Cliente';
    document.getElementById('rolActual').innerHTML = `<i class="fas ${rol === 'empleado' ? 'fa-user-tie' : 'fa-user'}"></i> ${rolText}`;

    if (rol === 'empleado') {
        document.getElementById('mainContentCliente').style.display = 'none';
        document.getElementById('mainContentEmpleado').style.display = 'grid';
        cargarInventarioEmpleado();
        cargarReporteEmpleado('dia');
    } else {
        document.getElementById('mainContentCliente').style.display = 'grid';
        document.getElementById('mainContentEmpleado').style.display = 'none';
        document.getElementById('btnAgregarProducto').style.display = 'none';
        document.getElementById('btnNuevoCliente').style.display = 'none';
        document.getElementById('descuentoSection').style.display = 'none';
        cargarProductos();
        cargarClientes();
        nuevaVenta();
    }
}

function mostrarPuntoDeVenta() {
    if (rolActual === 'empleado') {
        document.getElementById('mainContentEmpleado').style.display = 'none';
        document.getElementById('mainContentCliente').style.display = 'grid';
        document.getElementById('btnControlVentas').style.display = 'block';
        cargarProductos();
        cargarClientes();
        nuevaVenta();
    }
}

function solicitarContrasena() {
    const modal = document.getElementById('modalPassword');
    modal.style.display = 'block';
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordError').innerHTML = '';
    document.getElementById('passwordInput').focus();
}

function mostrarLoginEmpleado() {
    const modal = document.getElementById('modalLoginEmpleado');
    modal.style.display = 'block';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').innerHTML = '';
}

function cerrarModalLoginEmpleado() {
    const modal = document.getElementById('modalLoginEmpleado');
    modal.style.display = 'none';
}

function mostrarLoginEmpleado() {
    const modal = document.getElementById('modalLoginEmpleado');
    modal.style.display = 'block';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').innerHTML = '';
}

function cerrarModalLoginEmpleado() {
    const modal = document.getElementById('modalLoginEmpleado');
    modal.style.display = 'none';
}

function verificarLoginEmpleado() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        document.getElementById('loginError').innerHTML = 'Por favor ingresa usuario y contraseña';
        return;
    }

    fetch('/api/empleados/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cerrarModalLoginEmpleado();
                seleccionarRol('empleado');
            } else {
                document.getElementById('loginError').innerHTML = data.message || 'Usuario o contraseña incorrectos';
                document.getElementById('loginPassword').value = '';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('loginError').innerHTML = 'Error al verificar credenciales';
        });
}

function mostrarRegistroEmpleado() {
    const modal = document.getElementById('modalRegistroEmpleado');
    modal.style.display = 'block';
    document.getElementById('formRegistroEmpleado').reset();
}

function cerrarModalRegistroEmpleado() {
    const modal = document.getElementById('modalRegistroEmpleado');
    modal.style.display = 'none';
}

function verificarPasswordAdmin() {
    const password = document.getElementById('passwordInput').value;
    const loadingOverlay = document.getElementById('loadingOverlay');

    if (!password) {
        document.getElementById('passwordError').innerHTML = 'Por favor ingresa la contraseña';
        return;
    }

    loadingOverlay.style.display = 'flex';

    fetch('/api/empleados/verificar-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
    })
        .then(response => response.json())
        .then(data => {
            loadingOverlay.style.display = 'none';
            if (data.success) {
                cerrarModalPassword();
                mostrarRegistroEmpleado();
            } else {
                document.getElementById('passwordError').innerHTML = 'Contraseña incorrecta. Intenta nuevamente.';
                document.getElementById('passwordInput').value = '';
                document.getElementById('passwordInput').focus();
            }
        })
        .catch(error => {
            loadingOverlay.style.display = 'none';
            document.getElementById('passwordError').innerHTML = 'Error al verificar contraseña';
        });
}

document.getElementById('formRegistroEmpleado').addEventListener('submit', function (e) {
    e.preventDefault();

    const nombre = document.getElementById('regNombre').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    if (!nombre || !username || !password) {
        mostrarNotificacion('Completa todos los campos', 'error');
        return;
    }

    fetch('/api/empleados/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre, username: username, password: password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarNotificacion('Empleado registrado exitosamente', 'success');
                cerrarModalRegistroEmpleado();
            } else {
                mostrarNotificacion('Error: ' + data.detail, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarNotificacion('Error al registrar empleado', 'error');
        });
});

function verificarLoginEmpleado() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        document.getElementById('loginError').innerHTML = 'Por favor ingresa usuario y contraseña';
        return;
    }

    fetch('/api/empleados/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cerrarModalLoginEmpleado();
                seleccionarRol('empleado');
            } else {
                document.getElementById('loginError').innerHTML = data.message || 'Usuario o contraseña incorrectos';
                document.getElementById('loginPassword').value = '';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('loginError').innerHTML = 'Error al verificar credenciales';
        });
}

function mostrarRegistroEmpleado() {
    const modal = document.getElementById('modalRegistroEmpleado');
    modal.style.display = 'block';
    document.getElementById('formRegistroEmpleado').reset();
}

function cerrarModalRegistroEmpleado() {
    const modal = document.getElementById('modalRegistroEmpleado');
    modal.style.display = 'none';
}

document.getElementById('formRegistroEmpleado').addEventListener('submit', function (e) {
    e.preventDefault();

    const nombre = document.getElementById('regNombre').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    if (!nombre || !username || !password) {
        mostrarNotificacion('Completa todos los campos', 'error');
        return;
    }

    fetch('/api/empleados/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre, username: username, password: password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarNotificacion('Empleado registrado exitosamente', 'success');
                cerrarModalRegistroEmpleado();
            } else {
                mostrarNotificacion('Error: ' + data.detail, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarNotificacion('Error al registrar empleado', 'error');
        });
});

function verificarPasswordAdmin() {
    const password = document.getElementById('passwordInput').value;
    const loadingOverlay = document.getElementById('loadingOverlay');

    if (!password) {
        document.getElementById('passwordError').innerHTML = 'Por favor ingresa la contraseña';
        return;
    }

    loadingOverlay.style.display = 'flex';

    setTimeout(() => {
        loadingOverlay.style.display = 'none';

        if (password === contrasenaAdmin) {
            cerrarModalPassword();
            mostrarRegistroEmpleado();
        } else {
            document.getElementById('passwordError').innerHTML = 'Contraseña incorrecta. Intenta nuevamente.';
            document.getElementById('passwordInput').value = '';
            document.getElementById('passwordInput').focus();
        }
    }, 500);
}

function cerrarModalPassword() {
    const modal = document.getElementById('modalPassword');
    modal.style.display = 'none';
    document.getElementById('passwordError').innerHTML = '';
}

function verificarPassword() {
    const password = document.getElementById('passwordInput').value;
    const loadingOverlay = document.getElementById('loadingOverlay');

    if (!password) {
        document.getElementById('passwordError').innerHTML = 'Por favor ingresa la contraseña';
        return;
    }

    loadingOverlay.style.display = 'flex';

    setTimeout(() => {
        loadingOverlay.style.display = 'none';

        if (password === contrasenaCorrecta) {
            cerrarModalPassword();
            seleccionarRol('empleado');
        } else {
            document.getElementById('passwordError').innerHTML = 'Contraseña incorrecta. Intenta nuevamente.';
            document.getElementById('passwordInput').value = '';
            document.getElementById('passwordInput').focus();
        }
    }, 1500);
}

document.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        const modalLogin = document.getElementById('modalLoginEmpleado');
        if (modalLogin && modalLogin.style.display === 'block') {
            verificarLoginEmpleado();
        }
        const modalPassword = document.getElementById('modalPassword');
        if (modalPassword && modalPassword.style.display === 'block') {
            verificarPasswordAdmin();
        }
    }
});

function cerrarSesion() {
    rolActual = null;
    document.getElementById('contenidoPrincipal').style.display = 'none';
    document.getElementById('menuInicial').style.display = 'flex';
    productos = [];
    ventaActual = null;
}

async function cargarProductos() {
    try {
        const response = await fetch('/api/productos');
        productos = await response.json();
        productosFiltrados = [...productos];
        mostrarProductosFiltrados();
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarNotificacion('Error al cargar productos', 'error');
    }
}

function filtrarProductos() {
    const categoria = document.getElementById('filtroCategoria').value;

    if (categoria === 'todas') {
        productosFiltrados = [...productos];
    } else {
        productosFiltrados = productos.filter(p => p.categoria === categoria);
    }

    mostrarProductosFiltrados();
}

function mostrarProductosFiltrados() {
    const grid = document.getElementById('productosGrid');
    if (productosFiltrados.length === 0) {
        grid.innerHTML = '<div class="no-productos">No hay productos en esta categoría</div>';
        return;
    }

    const categorias = {};
    productosFiltrados.forEach(producto => {
        if (!categorias[producto.categoria]) {
            categorias[producto.categoria] = [];
        }
        categorias[producto.categoria].push(producto);
    });

    let html = '';
    for (const categoria in categorias) {
        html += `<div class="categoria-seccion">
            <h3 class="categoria-titulo"><i class="fas fa-tag"></i> ${escapeHtml(categoria)}</h3>
            <div class="productos-grid-inner">`;

        html += categorias[categoria].map(producto => {
            const imagenUrl = producto.imagen_url && producto.imagen_url !== ""
                ? producto.imagen_url
                : 'https://via.placeholder.com/150x150?text=Producto';

            return `
            <div class="producto-card">
                <div class="producto-imagen">
                    <img src="${imagenUrl}" 
                         alt="${escapeHtml(producto.nombre)}"
                         onerror="this.src='https://via.placeholder.com/150x150?text=No+Image'">
                </div>
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
                ${rolActual === 'empleado' ? `<button onclick="eliminarProducto('${producto.codigoBarra}')" class="btn-eliminar"><i class="fas fa-trash"></i> Eliminar</button>` : ''}
            </div>
        `}).join('');

        html += `</div></div>`;
    }

    grid.innerHTML = html;
}

async function registrarProducto(event) {
    event.preventDefault();

    if (rolActual !== 'empleado') {
        mostrarNotificacion('No tienes permisos para registrar productos', 'error');
        return;
    }

    const imagenFileName = document.getElementById('imagenProducto').value.trim();
    const stockValue = parseFloat(document.getElementById('stockProducto').value);

    // Validación de cantidad negativa
    if (stockValue < 0) {
        mostrarNotificacion('El stock no puede ser negativo', 'error');
        return;
    }

    const producto = {
        tipo: document.getElementById('tipoProducto').value,
        codigoBarra: document.getElementById('codigoProducto').value,
        nombre: document.getElementById('nombreProducto').value,
        categoria: document.getElementById('categoriaProducto').value,
        precioCompra: parseFloat(document.getElementById('precioCompraProducto').value),
        precioVenta: parseFloat(document.getElementById('precioVentaProducto').value),
        stock: stockValue,
        imagen_url: imagenFileName ? imagenFileName : "default.jpg"
    };

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
            document.getElementById('imagenProducto').value = 'default.jpg';
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
    if (rolActual !== 'empleado') {
        mostrarNotificacion('No tienes permisos para eliminar productos', 'error');
        return;
    }

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

    if (rolActual !== 'empleado') {
        mostrarNotificacion('No tienes permisos para registrar clientes', 'error');
        return;
    }

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

    productoPendiente = producto;

    const mensaje = producto.tipo === 'ProductoUnitario'
        ? `¿Cuántas unidades de ${producto.nombre} deseas agregar?`
        : `¿Cuántos kilos/gramos de ${producto.nombre} deseas agregar?`;

    document.getElementById('mensajeCantidad').textContent = mensaje;
    document.getElementById('inputCantidad').value = '1';
    document.getElementById('inputCantidad').step = producto.tipo === 'ProductoUnitario' ? '1' : '0.1';
    document.getElementById('modalCantidad').style.display = 'block';
    document.getElementById('inputCantidad').focus();
}

function cerrarModalCantidad() {
    document.getElementById('modalCantidad').style.display = 'none';
    productoPendiente = null;
}

async function confirmarCantidad() {
    const cantidad = parseFloat(document.getElementById('inputCantidad').value);

    if (!productoPendiente) {
        mostrarNotificacion('Error: producto no seleccionado', 'error');
        cerrarModalCantidad();
        return;
    }

    if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
        mostrarNotificacion('Ingresa una cantidad válida', 'error');
        return;
    }

    if (cantidad > productoPendiente.stock) {
        mostrarNotificacion(`Stock insuficiente. Solo hay ${productoPendiente.stock} disponibles`, 'error');
        cerrarModalCantidad();
        return;
    }

    const codigoBarra = productoPendiente.codigoBarra;
    cerrarModalCantidad();

    const item = {
        codigoBarra: codigoBarra,
        cantidad: cantidad
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
            await recalcularTotales();
            actualizarCarrito();
            await cargarProductos();
            mostrarNotificacion(`${productoPendiente.nombre} agregado al carrito`, 'success');
        }
    } catch (error) {
        console.error('Error agregando al carrito:', error);
        mostrarNotificacion('Error al agregar producto', 'error');
    }

    productoPendiente = null;
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
    if (rolActual !== 'empleado') {
        mostrarNotificacion('Los descuentos solo pueden ser aplicados por empleados', 'error');
        return;
    }

    const tipo = document.getElementById('tipoDescuento').value;
    if (tipo === 'ninguno') {
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

    const totalMostrar = ventaActual.total.toFixed(2);
    document.getElementById('totalConfirmar').textContent = `$${totalMostrar}`;
    document.getElementById('modalConfirmarCompra').style.display = 'block';
}

function cerrarModalConfirmarCompra() {
    document.getElementById('modalConfirmarCompra').style.display = 'none';
}

async function confirmarCompra() {
    cerrarModalConfirmarCompra();

    try {
        const response = await fetch('/api/ventas/finalizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.success) {
            mostrarTicket(result.ticket);
            mostrarNotificacion(`Venta completada. Puntos ganados: ${result.puntos_ganados}`, 'success');
            await cargarProductos();
            await cargarClientes();
            await nuevaVenta();

            if (rolActual === 'empleado' && document.getElementById('mainContentEmpleado').style.display === 'block') {
                let periodoActivo = 'dia';
                const botonActivo = document.querySelector('.btn-periodo[style*="background: #764ba2"]');
                if (botonActivo) {
                    if (botonActivo.textContent.includes('Hoy')) periodoActivo = 'dia';
                    else if (botonActivo.textContent.includes('Semana')) periodoActivo = 'semana';
                    else if (botonActivo.textContent.includes('Mes')) periodoActivo = 'mes';
                }
                await cargarReporte(periodoActivo);
            }
        } else {
            mostrarNotificacion(result.error || 'Error al finalizar venta', 'error');
        }
    } catch (error) {
        console.error('Error finalizando venta:', error);
        mostrarNotificacion('Error al finalizar venta', 'error');
    }
}

function mostrarTicket(ticket) {
    const modal = document.getElementById('modalTicket');
    const ticketContent = document.getElementById('ticketContent');
    ticketContent.textContent = ticket;
    modal.style.display = 'block';

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

function mostrarModalProducto() {
    if (rolActual !== 'empleado') {
        mostrarNotificacion('No tienes permisos', 'error');
        return;
    }
    const modal = document.getElementById('modalProducto');
    modal.style.display = 'block';
}

function cerrarModalProducto() {
    const modal = document.getElementById('modalProducto');
    modal.style.display = 'none';
    document.getElementById('formProducto').reset();
}

function mostrarModalCliente() {
    if (rolActual !== 'empleado') {
        mostrarNotificacion('No tienes permisos', 'error');
        return;
    }
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

function mostrarNotificacion(mensaje, tipo) {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : tipo === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
        <span>${mensaje}</span>
    `;

    document.body.appendChild(notificacion);

    setTimeout(() => notificacion.classList.add('mostrar'), 10);

    setTimeout(() => {
        notificacion.classList.remove('mostrar');
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function actualizarReporteSiVisible() {
    const modalReporte = document.getElementById('modalReporteVentas');
    if (modalReporte && modalReporte.style.display === 'block') {
        let periodoActivo = 'dia';
        const botonActivo = document.querySelector('.btn-periodo[style*="background: #764ba2"]');
        if (botonActivo) {
            if (botonActivo.textContent.includes('Hoy')) periodoActivo = 'dia';
            else if (botonActivo.textContent.includes('Semana')) periodoActivo = 'semana';
            else if (botonActivo.textContent.includes('Mes')) periodoActivo = 'mes';
            else if (botonActivo.textContent.includes('Todas')) periodoActivo = 'todas';
        }
        await cargarReporte(periodoActivo);
    }
}

function cerrarModalReporteVentas() {
    const modal = document.getElementById('modalReporteVentas');
    if (modal) {
        modal.remove();
    }
}

function cerrarModalReporteVentas() {
    const modal = document.getElementById('modalReporteVentas');
    if (modal) {
        modal.remove();
    }
}

async function cargarReporte(periodo) {
    try {
        const response = await fetch(`/api/reportes/ventas_detalle?periodo=${periodo}`);
        const data = await response.json();

        const contenido = document.getElementById('reporteContenido');

        let periodoTexto = '';
        switch (periodo) {
            case 'dia': periodoTexto = 'Hoy'; break;
            case 'semana': periodoTexto = 'Esta Semana'; break;
            case 'mes': periodoTexto = 'Este Mes'; break;
        }

        let html = `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 10px; color: white;">
                    <h4 style="margin-bottom: 10px;"><i class="fas fa-chart-line"></i> Ventas Netas</h4>
                    <p style="font-size: 1.5em; font-weight: bold;">$${data.total_ventas_neto.toFixed(2)}</p>
                    <small>${data.cantidad_ventas} ventas</small>
                </div>
                <div style="background: linear-gradient(135deg, #48bb78, #38a169); padding: 20px; border-radius: 10px; color: white;">
                    <h4 style="margin-bottom: 10px;"><i class="fas fa-dollar-sign"></i> Ganancia Real</h4>
                    <p style="font-size: 1.5em; font-weight: bold;">$${data.ganancia_real.toFixed(2)}</p>
                    <small>Ingreso - Costo</small>
                </div>
                <div style="background: linear-gradient(135deg, #ed8936, #dd6b20); padding: 20px; border-radius: 10px; color: white;">
                    <h4 style="margin-bottom: 10px;"><i class="fas fa-tags"></i> Costo Productos</h4>
                    <p style="font-size: 1.5em; font-weight: bold;">$${data.total_costo_productos.toFixed(2)}</p>
                    <small>Lo invertido en inventario</small>
                </div>
                <div style="background: linear-gradient(135deg, #f56565, #e53e3e); padding: 20px; border-radius: 10px; color: white;">
                    <h4 style="margin-bottom: 10px;"><i class="fas fa-percent"></i> Margen de Ganancia</h4>
                    <p style="font-size: 1.5em; font-weight: bold;">${data.total_ventas_bruto > 0 ? ((data.ganancia_real / data.total_ventas_bruto) * 100).toFixed(1) : 0}%</p>
                    <small>Ganancia / Ventas Brutas</small>
                </div>
            </div>
            
            <h3 style="margin-bottom: 15px; color: #333;"><i class="fas fa-boxes"></i> Productos Vendidos (${periodoTexto})</h3>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="background: #667eea; color: white;">
                            <th style="padding: 12px; text-align: left;">Producto</th>
                            <th style="padding: 12px; text-align: center;">Cantidad Vendida</th>
                            <th style="padding: 12px; text-align: right;">Ingreso</th>
                            <th style="padding: 12px; text-align: right;">Costo</th>
                            <th style="padding: 12px; text-align: right;">Ganancia</th>
                            <th style="padding: 12px; text-align: center;">Stock Actual</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (data.productos_vendidos.length === 0) {
            html += `
                <tr>
                    <td colspan="6" style="padding: 30px; text-align: center; color: #999;">
                        <i class="fas fa-inbox" style="font-size: 2em; margin-bottom: 10px;"></i>
                        <p>No hay productos vendidos en este período</p>
                    </td>
                </tr>
            `;
        } else {
            data.productos_vendidos.forEach((p, index) => {
                html += `
                    <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                        <td style="padding: 12px;">${escapeHtml(p.nombre)}</td>
                        <td style="padding: 12px; text-align: center;">${p.total_vendido}</td>
                        <td style="padding: 12px; text-align: right;">$${p.total_ventas.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: right;">$${p.costo_total.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: right; color: #48bb78; font-weight: bold;">$${p.ganancia.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: center; color: ${p.stock_actual < 5 ? '#e74c3c' : '#48bb78'};">
                            ${p.stock_actual}
                            ${p.stock_actual < 5 ? ' ⚠️' : ''}
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
            
            <h3 style="margin-bottom: 15px; color: #333;"><i class="fas fa-receipt"></i> Últimas Ventas</h3>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #764ba2; color: white;">
                            <th style="padding: 12px; text-align: left;">Folio</th>
                            <th style="padding: 12px; text-align: left;">Fecha</th>
                            <th style="padding: 12px; text-align: left;">Cliente</th>
                            <th style="padding: 12px; text-align: right;">Total</th>
                            <th style="padding: 12px; text-align: center;">Puntos</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (data.ventas.length === 0) {
            html += `
                <tr>
                    <td colspan="5" style="padding: 30px; text-align: center; color: #999;">
                        <i class="fas fa-inbox" style="font-size: 2em; margin-bottom: 10px;"></i>
                        <p>No hay ventas en este período</p>
                    </td>
                </tr>
            `;
        } else {
            data.ventas.forEach((v, index) => {
                html += `
                    <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                        <td style="padding: 12px;">${v.folio}</td>
                        <td style="padding: 12px;">${v.fecha}</td>
                        <td style="padding: 12px;">${escapeHtml(v.cliente)}</td>
                        <td style="padding: 12px; text-align: right; font-weight: bold;">$${v.total.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: center;">${v.puntos_ganados}</td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        contenido.innerHTML = html;

        const botones = document.querySelectorAll('.btn-periodo');
        botones.forEach(btn => {
            btn.style.background = '#667eea';
        });

        let botonActivo;
        switch (periodo) {
            case 'dia': botonActivo = botones[0]; break;
            case 'semana': botonActivo = botones[1]; break;
            case 'mes': botonActivo = botones[2]; break;
        }
        if (botonActivo) {
            botonActivo.style.background = '#764ba2';
        }

    } catch (error) {
        console.error('Error cargando reporte:', error);
        mostrarNotificacion('Error al cargar el reporte', 'error');
    }
}

let inventarioProductos = [];

async function cargarInventario() {
    try {
        const response = await fetch('/api/productos');
        inventarioProductos = await response.json();
        mostrarInventario();
    } catch (error) {
        console.error('Error cargando inventario:', error);
        mostrarNotificacion('Error al cargar inventario', 'error');
    }
}

function mostrarInventario() {
    const tbody = document.getElementById('inventarioBody');
    const filtroTexto = document.getElementById('filtroInventario')?.value.toLowerCase() || '';
    const filtroCategoria = document.getElementById('filtroCategoriaInventario')?.value || '';

    let productosFiltrados = inventarioProductos.filter(p => {
        const matchTexto = p.nombre.toLowerCase().includes(filtroTexto) ||
            p.codigoBarra.toLowerCase().includes(filtroTexto);
        const matchCategoria = !filtroCategoria || p.categoria === filtroCategoria;
        return matchTexto && matchCategoria;
    });

    if (productosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay productos registrados</td></tr>';
        return;
    }

    tbody.innerHTML = productosFiltrados.map(p => `
        <tr>
            <td>${escapeHtml(p.codigoBarra)}</td>
            <td>${escapeHtml(p.nombre)}</td>
            <td>${escapeHtml(p.categoria)}</td>
            <td>$${p.precioVenta.toFixed(2)}</td>
            <td class="${p.stock < 5 ? 'stock-bajo-inventario' : ''}">${p.stock} ${p.stock < 5 ? '⚠️' : ''}</td>
            <td>
                <button onclick="editarProductoInventario('${p.codigoBarra}')" class="btn-editar-inventario">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="eliminarProductoInventario('${p.codigoBarra}')" class="btn-eliminar-inventario">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filtrarInventario() {
    mostrarInventario();
}

function mostrarModalAgregarProductoInventario() {
    if (rolActual !== 'empleado') {
        mostrarNotificacion('No tienes permisos', 'error');
        return;
    }
    document.getElementById('modalAgregarProductoInventario').style.display = 'block';
}

function cerrarModalAgregarProductoInventario() {
    document.getElementById('modalAgregarProductoInventario').style.display = 'none';
    document.getElementById('formAgregarProductoInventario').reset();
}

document.getElementById('formAgregarProductoInventario')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const producto = {
        tipo: document.getElementById('tipoProductoInventario').value,
        codigoBarra: document.getElementById('codigoProductoInventario').value,
        nombre: document.getElementById('nombreProductoInventario').value,
        categoria: document.getElementById('categoriaProductoInventario').value,
        precioCompra: 0,
        precioVenta: parseFloat(document.getElementById('precioProductoInventario').value),
        stock: parseFloat(document.getElementById('stockProductoInventario').value),
        imagen_url: "default.jpg"
    };

    if (!producto.codigoBarra || !producto.nombre || !producto.categoria) {
        mostrarNotificacion('Completa todos los campos', 'error');
        return;
    }

    if (producto.stock < 0) {
        mostrarNotificacion('El stock no puede ser negativo', 'error');
        return;
    }

    try {
        const response = await fetch('/api/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(producto)
        });

        if (response.ok) {
            mostrarNotificacion('Producto agregado exitosamente', 'success');
            cerrarModalAgregarProductoInventario();
            await cargarInventario();
            await cargarProductos();
        } else {
            const error = await response.json();
            mostrarNotificacion('Error: ' + error.detail, 'error');
        }
    } catch (error) {
        console.error('Error agregando producto:', error);
        mostrarNotificacion('Error al agregar producto', 'error');
    }
});

async function editarProductoInventario(codigoBarra) {
    const producto = inventarioProductos.find(p => p.codigoBarra === codigoBarra);
    if (!producto) return;

    document.getElementById('editCodigoOriginal').value = codigoBarra;
    document.getElementById('editCodigoProducto').value = producto.codigoBarra;
    document.getElementById('editNombreProducto').value = producto.nombre;
    document.getElementById('editCategoriaProducto').value = producto.categoria;
    document.getElementById('editPrecioProducto').value = producto.precioVenta;
    document.getElementById('editStockProducto').value = producto.stock;
    document.getElementById('editTipoProducto').value = producto.tipo === 'ProductoUnitario' ? 'unitario' : 'granel';

    document.getElementById('modalEditarProductoInventario').style.display = 'block';
}

function cerrarModalEditarProductoInventario() {
    document.getElementById('modalEditarProductoInventario').style.display = 'none';
    document.getElementById('formEditarProductoInventario').reset();
}

document.getElementById('formEditarProductoInventario')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const codigoOriginal = document.getElementById('editCodigoOriginal').value;

    const producto = {
        tipo: document.getElementById('editTipoProducto').value,
        codigoBarra: document.getElementById('editCodigoProducto').value,
        nombre: document.getElementById('editNombreProducto').value,
        categoria: document.getElementById('editCategoriaProducto').value,
        precioCompra: 0,
        precioVenta: parseFloat(document.getElementById('editPrecioProducto').value),
        stock: parseFloat(document.getElementById('editStockProducto').value),
        imagen_url: "default.jpg"
    };

    try {
        if (codigoOriginal !== producto.codigoBarra) {
            await fetch(`/api/productos/${codigoOriginal}`, { method: 'DELETE' });
        }

        const response = await fetch('/api/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(producto)
        });

        if (response.ok) {
            mostrarNotificacion('Producto actualizado exitosamente', 'success');
            cerrarModalEditarProductoInventario();
            await cargarInventario();
            await cargarProductos();
        } else {
            const error = await response.json();
            mostrarNotificacion('Error: ' + error.detail, 'error');
        }
    } catch (error) {
        console.error('Error actualizando producto:', error);
        mostrarNotificacion('Error al actualizar producto', 'error');
    }
});

async function eliminarProductoInventario(codigoBarra) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
        const response = await fetch(`/api/productos/${codigoBarra}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            mostrarNotificacion('Producto eliminado', 'success');
            await cargarInventario();
            await cargarProductos();
        } else {
            mostrarNotificacion('Error al eliminar producto', 'error');
        }
    } catch (error) {
        console.error('Error eliminando producto:', error);
        mostrarNotificacion('Error al eliminar producto', 'error');
    }
}

let ventaActualEmpleado = null;
let folioContadorEmpleado = 100;

async function cargarInventarioEmpleado() {
    try {
        const response = await fetch('/api/productos');
        const productos = await response.json();
        mostrarInventarioEmpleado(productos);
    } catch (error) {
        console.error('Error cargando inventario:', error);
    }
}

function mostrarInventarioEmpleado(productos) {
    const tbody = document.getElementById('inventarioBodyEmpleado');
    const filtro = document.getElementById('filtroInventarioEmpleado')?.value.toLowerCase() || '';

    let productosFiltrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(filtro) ||
        p.codigoBarra.toLowerCase().includes(filtro)
    );

    if (productosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay productos registrados</td></tr>';
        return;
    }

    tbody.innerHTML = productosFiltrados.map(p => `
        <tr>
            <td>${escapeHtml(p.codigoBarra)}</td>
            <td>${escapeHtml(p.nombre)}</td>
            <td>${escapeHtml(p.categoria)}</td>
            <td>$${p.precioVenta.toFixed(2)}</td>
            <td class="${p.stock < 5 ? 'stock-critico' : ''}">${p.stock} ${p.stock < 5 ? '⚠️' : ''}</td>
            <td>
                <button onclick="editarProductoInventarioEmpleado('${p.codigoBarra}')" class="boton-editar-inventario">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="eliminarProductoInventarioEmpleado('${p.codigoBarra}')" class="boton-eliminar-inventario">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filtrarInventarioEmpleado() {
    cargarInventarioEmpleado();
}

async function editarProductoInventarioEmpleado(codigoBarra) {
    const response = await fetch('/api/productos');
    const productos = await response.json();
    const producto = productos.find(p => p.codigoBarra === codigoBarra);
    if (!producto) return;

    document.getElementById('editCodigoOriginal').value = codigoBarra;
    document.getElementById('editCodigoProducto').value = producto.codigoBarra;
    document.getElementById('editNombreProducto').value = producto.nombre;
    document.getElementById('editCategoriaProducto').value = producto.categoria;
    document.getElementById('editPrecioProducto').value = producto.precioVenta;
    document.getElementById('editStockProducto').value = producto.stock;
    document.getElementById('editTipoProducto').value = producto.tipo === 'ProductoUnitario' ? 'unitario' : 'granel';

    document.getElementById('modalEditarProductoInventario').style.display = 'block';
}

async function eliminarProductoInventarioEmpleado(codigoBarra) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
        const response = await fetch(`/api/productos/${codigoBarra}`, { method: 'DELETE' });
        if (response.ok) {
            mostrarNotificacion('Producto eliminado', 'success');
            cargarInventarioEmpleado();
            cargarProductos();
        }
    } catch (error) {
        mostrarNotificacion('Error al eliminar', 'error');
    }
}

async function nuevaVentaEmpleado() {
    folioContadorEmpleado++;
    const folio = `F-${folioContadorEmpleado}`;
    const telefonoCliente = document.getElementById('clienteSelectEmpleado').value;

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
            ventaActualEmpleado = data.venta;
            document.getElementById('folioVentaEmpleado').textContent = `Folio: ${folio}`;
            actualizarCarritoEmpleado();
        }
    } catch (error) {
        mostrarNotificacion('Error al crear venta', 'error');
    }
}

async function agregarAlCarritoEmpleado(codigoBarra) {
    const response = await fetch('/api/productos');
    const productos = await response.json();
    const producto = productos.find(p => p.codigoBarra === codigoBarra);
    if (!producto) return;

    const cantidad = prompt(`¿Cuántos ${producto.nombre} deseas agregar?`, "1");
    if (!cantidad || isNaN(cantidad) || cantidad <= 0) return;

    if (cantidad > producto.stock) {
        mostrarNotificacion(`Stock insuficiente. Solo hay ${producto.stock}`, 'error');
        return;
    }

    try {
        const res = await fetch('/api/ventas/agregar-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigoBarra: codigoBarra, cantidad: parseFloat(cantidad) })
        });

        const result = await res.json();
        if (result.error) {
            mostrarNotificacion(result.error, 'error');
        } else {
            ventaActualEmpleado.carrito = result.carrito_actual;
            await recalcularTotalesEmpleado();
            actualizarCarritoEmpleado();
            cargarInventarioEmpleado();
            mostrarNotificacion(`${producto.nombre} agregado`, 'success');
        }
    } catch (error) {
        mostrarNotificacion('Error al agregar', 'error');
    }
}

async function recalcularTotalesEmpleado() {
    if (!ventaActualEmpleado?.carrito?.length) {
        if (ventaActualEmpleado) {
            ventaActualEmpleado.subtotal = 0;
            ventaActualEmpleado.impuestos = 0;
            ventaActualEmpleado.total = 0;
        }
        return;
    }

    ventaActualEmpleado.subtotal = ventaActualEmpleado.carrito.reduce((sum, item) => sum + item.subtotal_detalle, 0);
    ventaActualEmpleado.impuestos = ventaActualEmpleado.carrito.reduce((sum, item) => sum + (item.impuesto_detalle || 0), 0);
    ventaActualEmpleado.total = ventaActualEmpleado.subtotal + ventaActualEmpleado.impuestos - (ventaActualEmpleado.descuento || 0);
}

function actualizarCarritoEmpleado() {
    const carritoDiv = document.getElementById('carritoItemsEmpleado');

    if (!ventaActualEmpleado?.carrito?.length) {
        carritoDiv.innerHTML = '<div class="carrito-vacio">Agrega productos al carrito</div>';
        document.getElementById('subtotalEmpleado').textContent = '$0.00';
        document.getElementById('impuestosEmpleado').textContent = '$0.00';
        document.getElementById('descuentoEmpleado').textContent = '-$0.00';
        document.getElementById('totalEmpleado').textContent = '$0.00';
        return;
    }

    carritoDiv.innerHTML = ventaActualEmpleado.carrito.map(item => `
        <div class="carrito-item">
            <div class="item-info">
                <strong>${escapeHtml(item.producto.nombre)}</strong>
                <small>$${item.precio_unitario.toFixed(2)} c/u</small>
            </div>
            <div class="item-cantidad">x${item.cantidad}</div>
            <div class="item-subtotal">$${item.subtotal_detalle.toFixed(2)}</div>
        </div>
    `).join('');

    document.getElementById('subtotalEmpleado').textContent = `$${ventaActualEmpleado.subtotal.toFixed(2)}`;
    document.getElementById('impuestosEmpleado').textContent = `$${ventaActualEmpleado.impuestos.toFixed(2)}`;
    document.getElementById('descuentoEmpleado').textContent = `-$${(ventaActualEmpleado.descuento || 0).toFixed(2)}`;
    document.getElementById('totalEmpleado').textContent = `$${ventaActualEmpleado.total.toFixed(2)}`;
}

async function aplicarDescuentoEmpleado() {
    const tipo = document.getElementById('tipoDescuentoEmpleado').value;
    if (tipo === 'ninguno') {
        ventaActualEmpleado.descuento = 0;
        await recalcularTotalesEmpleado();
        actualizarCarritoEmpleado();
        return;
    }

    let valor = null;
    let categoria = null;

    if (tipo === 'porcentaje' || tipo === 'fijo') {
        valor = parseFloat(document.getElementById('valorDescuentoEmpleado').value);
        if (isNaN(valor) || valor <= 0) {
            mostrarNotificacion('Valor válido requerido', 'error');
            return;
        }
    } else if (tipo === '3x2') {
        categoria = document.getElementById('categoriaDescuentoEmpleado').value;
        if (!categoria) {
            mostrarNotificacion('Categoría requerida', 'error');
            return;
        }
    }

    try {
        const response = await fetch('/api/ventas/descuento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo, valor, categoria })
        });

        const result = await response.json();
        if (response.ok) {
            ventaActualEmpleado.total = result.total_nuevo;
            ventaActualEmpleado.descuento = result.descuento_aplicado;
            await recalcularTotalesEmpleado();
            actualizarCarritoEmpleado();
            mostrarNotificacion(`Descuento aplicado: $${result.descuento_aplicado.toFixed(2)}`, 'success');
        }
    } catch (error) {
        mostrarNotificacion('Error al aplicar descuento', 'error');
    }
}

async function finalizarVentaEmpleado() {
    if (!ventaActualEmpleado?.carrito?.length) {
        mostrarNotificacion('No hay productos en el carrito', 'error');
        return;
    }

    if (!confirm(`Total a pagar: $${ventaActualEmpleado.total.toFixed(2)}\n¿Confirmar compra?`)) return;

    try {
        const response = await fetch('/api/ventas/finalizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        if (result.success) {
            mostrarTicket(result.ticket);
            mostrarNotificacion(`Venta completada. Puntos: ${result.puntos_ganados}`, 'success');
            await cargarInventarioEmpleado();
            await nuevaVentaEmpleado();
        } else {
            mostrarNotificacion(result.error || 'Error al finalizar', 'error');
        }
    } catch (error) {
        mostrarNotificacion('Error al finalizar venta', 'error');
    }
}

async function cargarClientesEmpleado() {
    try {
        const response = await fetch('/api/clientes');
        const clientes = await response.json();
        const select = document.getElementById('clienteSelectEmpleado');
        select.innerHTML = '<option value="">Público General</option>' +
            clientes.map(c => `<option value="${c.telefono}">${escapeHtml(c.nombre)} (${c.puntos} pts)</option>`).join('');
    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}

function mostrarReportesCompletos() {
    mostrarControlVentas();
}

async function cargarReporteEmpleado(periodo) {
    try {
        const response = await fetch(`/api/reportes/ventas_detalle?periodo=${periodo}`);
        const data = await response.json();

        const contenido = document.getElementById('reporteContenidoEmpleado');

        let periodoTexto = '';
        switch (periodo) {
            case 'dia': periodoTexto = 'Hoy'; break;
            case 'semana': periodoTexto = 'Esta Semana'; break;
            case 'mes': periodoTexto = 'Este Mes'; break;
        }

        let html = `
            <div class="reporte-cards">
                <div class="card-ventas">
                    <h4><i class="fas fa-chart-line"></i> Ventas Netas</h4>
                    <p style="font-size: 1.5em; font-weight: bold;">$${data.total_ventas_neto.toFixed(2)}</p>
                    <small>${data.cantidad_ventas} ventas</small>
                </div>
                <div class="card-ganancias">
                    <h4><i class="fas fa-dollar-sign"></i> Ganancia Real</h4>
                    <p style="font-size: 1.5em; font-weight: bold;">$${data.ganancia_real.toFixed(2)}</p>
                    <small>Ingreso - Costo</small>
                </div>
                <div class="card-costos">
                    <h4><i class="fas fa-tags"></i> Costo Productos</h4>
                    <p style="font-size: 1.5em; font-weight: bold;">$${data.total_costo_productos.toFixed(2)}</p>
                    <small>Invertido en inventario</small>
                </div>
                <div class="card-margen">
                    <h4><i class="fas fa-percent"></i> Margen de Ganancia</h4>
                    <p style="font-size: 1.5em; font-weight: bold;">${data.total_ventas_bruto > 0 ? ((data.ganancia_real / data.total_ventas_bruto) * 100).toFixed(1) : 0}%</p>
                    <small>Ganancia / Ventas Brutas</small>
                </div>
            </div>
            
            <h3 style="margin-bottom: 15px; color: #333;"><i class="fas fa-boxes"></i> Productos Vendidos (${periodoTexto})</h3>
            <div style="overflow-x: auto;">
                <table class="tabla-reporte">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad Vendida</th>
                            <th>Ingreso</th>
                            <th>Costo</th>
                            <th>Ganancia</th>
                            <th>Stock Actual</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (data.productos_vendidos.length === 0) {
            html += `<tr><td colspan="6" style="text-align: center; padding: 30px;">No hay productos vendidos en este período</td></tr>`;
        } else {
            data.productos_vendidos.forEach((p, index) => {
                html += `
                    <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                        <td style="padding: 12px;">${escapeHtml(p.nombre)}</td>
                        <td style="padding: 12px; text-align: center;">${p.total_vendido}</td>
                        <td style="padding: 12px; text-align: right;">$${p.total_ventas.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: right;">$${p.costo_total.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: right; color: #48bb78; font-weight: bold;">$${p.ganancia.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: center; color: ${p.stock_actual < 5 ? '#e74c3c' : '#48bb78'};">${p.stock_actual} ${p.stock_actual < 5 ? '⚠️' : ''}</td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
            
            <h3 style="margin-bottom: 15px; color: #333;"><i class="fas fa-receipt"></i> Últimas Ventas</h3>
            <div style="overflow-x: auto;">
                <table class="tabla-reporte">
                    <thead>
                        <tr style="background: #764ba2;">
                            <th>Folio</th>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Total</th>
                            <th>Puntos</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (data.ventas.length === 0) {
            html += `<tr><td colspan="5" style="text-align: center; padding: 30px;">No hay ventas en este período</td></tr>`;
        } else {
            data.ventas.forEach((v, index) => {
                html += `
                    <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                        <td style="padding: 12px;">${v.folio}</td>
                        <td style="padding: 12px;">${v.fecha}</td>
                        <td style="padding: 12px;">${escapeHtml(v.cliente)}</td>
                        <td style="padding: 12px; text-align: right; font-weight: bold;">$${v.total.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: center;">${v.puntos_ganados}</td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        contenido.innerHTML = html;

        const botones = document.querySelectorAll('.btn-periodo');
        botones.forEach(btn => {
            btn.style.background = '#667eea';
        });

        let botonActivo;
        switch (periodo) {
            case 'dia': botonActivo = botones[0]; break;
            case 'semana': botonActivo = botones[1]; break;
            case 'mes': botonActivo = botones[2]; break;
        }
        if (botonActivo) {
            botonActivo.style.background = '#764ba2';
        }

    } catch (error) {
        console.error('Error cargando reporte:', error);
        mostrarNotificacion('Error al cargar el reporte', 'error');
    }
}

window.onclick = function (event) {
    const modales = document.querySelectorAll('.modal');
    modales.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
            if (modal.id === 'modalCantidad') {
                productoPendiente = null;
            }
        }
    });
}

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