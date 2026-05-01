let productos = [];
let ventaActual = null;
let folioContador = 100;
let rolActual = null;
let productoPendiente = null;
let productosFiltrados = [];
let intentosFallidosEmpleado = 0;
let intentosFallidosCliente = 0;
let tipoUsuarioARegistrar = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('formProducto').addEventListener('submit', registrarProducto);
    document.getElementById('formCliente').addEventListener('submit', registrarCliente);
    document.getElementById('tipoDescuento').addEventListener('change', toggleCamposDescuento);
    document.getElementById('formRegistroCliente').addEventListener('submit', function (e) {
        e.preventDefault();

        const nombre = formatearNombre(document.getElementById('regClienteNombre').value);
        const apellido = formatearNombre(document.getElementById('regClienteApellido').value);
        const email = obtenerEmailCompleto('regClienteEmail', 'btnDominioRegistro');
        const telefono = document.getElementById('regClienteTelefono').value;
        const password = document.getElementById('regClientePassword').value;

        if (!nombre || !apellido || !email || !telefono || !password) {
            mostrarNotificacion('Completa todos los campos', 'error');
            return;
        }

        fetch('/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: nombre,
                apellido: apellido,
                telefono: telefono,
                email: email,
                password: password,
                puntos_iniciales: 0
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    mostrarNotificacion('Cliente registrado exitosamente', 'success');
                    cerrarModalRegistroCliente();
                    if (document.getElementById('modalBaseDatosUsuarios').style.display === 'block') {
                        cargarClientesBD();
                    }
                } else {
                    mostrarNotificacion('Error al registrar cliente', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                mostrarNotificacion('Error al registrar cliente', 'error');
            });
    });

    document.getElementById('formRegistroEmpleado').addEventListener('submit', function (e) {
        e.preventDefault();

        const nombre = formatearNombre(document.getElementById('regNombre').value);
        const apellido = formatearNombre(document.getElementById('regApellido').value);
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;

        if (!nombre || !apellido || !username || !password) {
            mostrarNotificacion('Completa todos los campos', 'error');
            return;
        }

        fetch('/api/empleados/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nombre, apellido: apellido, username: username, password: password })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    mostrarNotificacion('Empleado registrado exitosamente', 'success');
                    cerrarModalRegistroEmpleado();
                    if (document.getElementById('modalBaseDatosUsuarios').style.display === 'block') {
                        cargarEmpleadosBD();
                    }
                } else {
                    mostrarNotificacion('Error: ' + data.detail, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                mostrarNotificacion('Error al registrar empleado', 'error');
            });
    });

    document.getElementById('formAgregarProductoInventario').addEventListener('submit', async function (e) {
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

    document.getElementById('formEditarProductoInventario').addEventListener('submit', async function (e) {
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

    const btnCerrarAdvertenciaSesion = document.getElementById('btnCerrarAdvertenciaSesion');
    if (btnCerrarAdvertenciaSesion) {
        btnCerrarAdvertenciaSesion.addEventListener('click', function () {
            document.getElementById('modalAdvertenciaCerrarSesion').style.display = 'none';
        });
    }

    const btnCerrarAdvertenciaVenta = document.getElementById('btnCerrarAdvertenciaVenta');
    if (btnCerrarAdvertenciaVenta) {
        btnCerrarAdvertenciaVenta.addEventListener('click', function () {
            document.getElementById('modalAdvertenciaVenta').style.display = 'none';
        });
    }

    const btnConfirmarVaciarCarrito = document.getElementById('btnConfirmarVaciarCarrito');
    if (btnConfirmarVaciarCarrito) {
        btnConfirmarVaciarCarrito.addEventListener('click', async function () {
            document.getElementById('modalConfirmarVaciarCarrito').style.display = 'none';
            try {
                const response = await fetch('/api/ventas/cancelar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                const result = await response.json();

                if (result.success) {
                    ventaActual = null;
                    document.getElementById('folioVenta').textContent = '';
                    document.getElementById('carritoItems').innerHTML = '<div class="carrito-vacio">Agrega productos al carrito</div>';
                    document.getElementById('subtotal').textContent = '$0.00';
                    document.getElementById('impuestos').textContent = '$0.00';
                    document.getElementById('descuento').textContent = '-$0.00';
                    document.getElementById('total').textContent = '$0.00';
                    document.getElementById('tipoDescuento').value = 'ninguno';
                    document.getElementById('valorDescuento').value = '';
                    document.getElementById('categoriaDescuento').value = '';
                    toggleCamposDescuento();
                    await cargarProductos();
                    await nuevaVenta();
                    mostrarNotificacion('Carrito vaciado y stock restaurado', 'success');
                } else {
                    mostrarNotificacion('Error al vaciar el carrito', 'error');
                }
            } catch (error) {
                console.error('Error vaciando carrito:', error);
                mostrarNotificacion('Error al vaciar el carrito', 'error');
            }
        });
    }

    const btnCancelarVaciarCarrito = document.getElementById('btnCancelarVaciarCarrito');
    if (btnCancelarVaciarCarrito) {
        btnCancelarVaciarCarrito.addEventListener('click', function () {
            document.getElementById('modalConfirmarVaciarCarrito').style.display = 'none';
        });
    }

    const btnConfirmarCerrarSesion = document.getElementById('btnConfirmarCerrarSesion');
    if (btnConfirmarCerrarSesion) {
        btnConfirmarCerrarSesion.addEventListener('click', function () {
            document.getElementById('modalConfirmarCerrarSesion').style.display = 'none';
            if (ventaActual && ventaActual.carrito && ventaActual.carrito.length > 0) {
                fetch('/api/ventas/cancelar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }).catch(function () { });
            }
            rolActual = null;
            document.getElementById('contenidoPrincipal').style.display = 'none';
            document.getElementById('menuInicial').style.display = 'flex';
            document.getElementById('rolActual').style.display = 'block';
            document.getElementById('saludoCliente').style.display = 'none';
            productos = [];
            ventaActual = null;
        });
    }

    const btnCancelarCerrarSesion = document.getElementById('btnCancelarCerrarSesion');
    if (btnCancelarCerrarSesion) {
        btnCancelarCerrarSesion.addEventListener('click', function () {
            document.getElementById('modalConfirmarCerrarSesion').style.display = 'none';
        });
    }

    document.addEventListener('click', function (event) {
        if (!event.target.closest('[id^="btnDominio"]') && !event.target.closest('[id^="dropdownDominio"]')) {
            document.querySelectorAll('[id^="dropdownDominio"]').forEach(d => d.style.display = 'none');
        }
    });

    const loginClienteEmailInput = document.getElementById('loginClienteEmail');
    if (loginClienteEmailInput) {
        loginClienteEmailInput.addEventListener('input', function () {
            this.value = this.value.replace(/@/g, '');
        });
    }

    const regClienteEmailInput = document.getElementById('regClienteEmail');
    if (regClienteEmailInput) {
        regClienteEmailInput.addEventListener('input', function () {
            this.value = this.value.replace(/@/g, '');
        });
    }

    const reestablecerEmailClienteInput = document.getElementById('reestablecerEmailCliente');
    if (reestablecerEmailClienteInput) {
        reestablecerEmailClienteInput.addEventListener('input', function () {
            this.value = this.value.replace(/@/g, '');
        });
    }
});

function seleccionarRol(rol) {
    rolActual = rol;
    document.getElementById('menuInicial').style.display = 'none';
    document.getElementById('contenidoPrincipal').style.display = 'block';

    if (rol === 'empleado') {
        document.getElementById('rolActual').style.display = 'block';
        document.getElementById('saludoCliente').style.display = 'none';
        document.getElementById('puntosCliente').style.display = 'none';
        document.getElementById('mainContentCliente').style.display = 'none';
        document.getElementById('mainContentEmpleado').style.display = 'grid';
        cargarInventarioEmpleado();
        cargarReporteEmpleado('dia');
    } else {
        document.getElementById('mainContentCliente').style.display = 'grid';
        document.getElementById('mainContentEmpleado').style.display = 'none';
        document.getElementById('btnAgregarProducto').style.display = 'none';
        document.getElementById('descuentoSection').style.display = 'none';
        cargarProductos();
        cargarClientes();
        nuevaVenta();
        document.getElementById('rolActual').style.display = 'none';
        document.getElementById('saludoCliente').style.display = 'block';

        const textoRolActual = document.getElementById('rolActual').textContent || document.getElementById('rolActual').innerText || '';
        const partes = textoRolActual.replace('Cliente ', '').trim().split(' ');
        const primerNombre = formatearNombre(partes[0]) || 'Cliente';
        document.getElementById('saludoCliente').innerHTML = '<i class="fas fa-user"></i> Hola ' + primerNombre;
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
    intentosFallidosEmpleado = 0;
    document.getElementById('btnReestablecerEmpleado').style.display = 'none';
}

function mostrarLoginCliente() {
    document.getElementById('modalLoginCliente').style.display = 'block';
    document.getElementById('loginClienteEmail').value = '';
    document.getElementById('loginClientePassword').value = '';
    document.getElementById('loginClienteError').innerHTML = '';
}

function mostrarRegistroCliente() {
    var modalBaseDatos = document.getElementById('modalBaseDatosUsuarios');
    if (modalBaseDatos && modalBaseDatos.style.display === 'block') {
        modalBaseDatos.style.display = 'none';
    }
    setTimeout(function () {
        document.getElementById('modalRegistroCliente').style.display = 'block';
        document.getElementById('formRegistroCliente').reset();
    }, 300);
}

function cerrarModalLoginCliente() {
    document.getElementById('modalLoginCliente').style.display = 'none';
    intentosFallidosCliente = 0;
    document.getElementById('btnReestablecerCliente').style.display = 'none';
}

function verificarLoginCliente() {
    const email = obtenerEmailCompleto('loginClienteEmail', 'btnDominioLogin'); const password = document.getElementById('loginClientePassword').value;

    if (!email || !password) {
        document.getElementById('loginClienteError').innerHTML = 'Por favor ingresa email y contrasena';
        return;
    }

    fetch('/api/clientes/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                intentosFallidosCliente = 0;
                document.getElementById('btnReestablecerCliente').style.display = 'none';
                cerrarModalLoginCliente();
                const nombreCompleto = formatearNombre(data.nombre + ' ' + (data.apellido || ''));
                const primerNombre = nombreCompleto.split(' ')[0];
                document.getElementById('rolActual').innerHTML = '<i class="fas fa-user"></i> Cliente ' + nombreCompleto;
                document.getElementById('saludoCliente').innerHTML = '<i class="fas fa-user"></i> Hola ' + primerNombre;
                document.getElementById('saludoCliente').style.display = 'none';
                document.getElementById('rolActual').style.display = 'block';
                document.getElementById('puntosCliente').style.display = 'block';
                document.getElementById('cantidadPuntosCliente').textContent = data.puntos;
                seleccionarRol('cliente');
            } else {
                intentosFallidosCliente++;
                document.getElementById('loginClienteError').innerHTML = data.message || 'Email o contrasena incorrectos';
                document.getElementById('loginClientePassword').value = '';
                if (intentosFallidosCliente >= 3) {
                    document.getElementById('btnReestablecerCliente').style.display = 'block';
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('loginClienteError').innerHTML = 'Error al verificar credenciales';
        });
}

function cerrarModalRegistroCliente() {
    document.getElementById('modalRegistroCliente').style.display = 'none';
    var modalBaseDatos = document.getElementById('modalBaseDatosUsuarios');
    if (modalBaseDatos && modalBaseDatos.style.display !== 'block') {
        modalBaseDatos.style.display = 'block';
    }
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
                intentosFallidosEmpleado = 0;
                document.getElementById('btnReestablecerEmpleado').style.display = 'none';
                cerrarModalLoginEmpleado();
                const nombreCompleto = formatearNombre(data.nombre);
                const primerNombre = nombreCompleto.split(' ')[0];
                document.getElementById('rolActual').innerHTML = '<i class="fas fa-user-tie"></i> Empleado: ' + primerNombre + ' | Modo Administracion';
                seleccionarRol('empleado');
            } else {
                intentosFallidosEmpleado++;
                document.getElementById('loginError').innerHTML = data.message || 'Usuario o contraseña incorrectos';
                document.getElementById('loginPassword').value = '';
                if (intentosFallidosEmpleado >= 3) {
                    document.getElementById('btnReestablecerEmpleado').style.display = 'block';
                }
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


function cerrarModalPassword() {
    const modal = document.getElementById('modalPassword');
    modal.style.display = 'none';
    document.getElementById('passwordError').innerHTML = '';
}

document.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        const modalLogin = document.getElementById('modalLoginEmpleado');
        if (modalLogin && modalLogin.style.display === 'block') {
            verificarLoginEmpleado();
        }
        const modalLoginCliente = document.getElementById('modalLoginCliente');
        if (modalLoginCliente && modalLoginCliente.style.display === 'block') {
            verificarLoginCliente();
        }
        const modalPassword = document.getElementById('modalPassword');
        if (modalPassword && modalPassword.style.display === 'block') {
            verificarPasswordAdmin();
        }
    }
});

function cerrarSesion() {
    if (ventaActual && ventaActual.carrito && ventaActual.carrito.length > 0) {
        document.getElementById('modalAdvertenciaCerrarSesion').style.display = 'block';
        return;
    }

    document.getElementById('modalConfirmarCerrarSesion').style.display = 'block';
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

        const textoRolActual = document.getElementById('rolActual').textContent || document.getElementById('rolActual').innerText || '';
        const esCliente = textoRolActual.includes('Cliente');

        if (esCliente) {
            const partes = textoRolActual.replace('Cliente ', '').trim().split(' ');
            const clienteNombre = partes.join(' ');
            const clienteEncontrado = clientes.find(c => {
                const nombreCompleto = (c.nombre + ' ' + (c.apellido || '')).trim();
                return nombreCompleto.toLowerCase() === clienteNombre.toLowerCase();
            });
            if (clienteEncontrado) {
                document.getElementById('cantidadPuntosCliente').textContent = clienteEncontrado.puntos;
                document.getElementById('puntosCliente').style.display = 'block';
            }
        }
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
    if (ventaActual && ventaActual.carrito && ventaActual.carrito.length > 0) {
        document.getElementById('modalAdvertenciaVenta').style.display = 'block';
        return;
    }

    if (ventaActual && (!ventaActual.carrito || ventaActual.carrito.length === 0)) {
        mostrarNotificacion('No puedes realizar una nueva venta con el carrito vacio', 'error');
        return;
    }

    folioContador++;
    const folio = `F-${folioContador}`;
    const textoRolActual = document.getElementById('rolActual').textContent || document.getElementById('rolActual').innerText || '';
    const esCliente = textoRolActual.includes('Cliente');
    let telefonoCliente = '';

    if (esCliente) {
        const partes = textoRolActual.replace('Cliente ', '').trim().split(' ');
        const clienteNombre = partes.join(' ');
        const responseClientes = await fetch('/api/clientes');
        const clientes = await responseClientes.json();
        const clienteEncontrado = clientes.find(c => {
            const nombreCompleto = (c.nombre + ' ' + (c.apellido || '')).trim();
            return nombreCompleto.toLowerCase() === clienteNombre.toLowerCase();
        });
        if (clienteEncontrado) {
            telefonoCliente = clienteEncontrado.telefono;
        }
    }

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
            await cargarProductos();
        } else {
            mostrarNotificacion('Error al crear nueva venta', 'error');
        }
    } catch (error) {
        console.error('Error creando nueva venta:', error);
        mostrarNotificacion('Error al crear nueva venta', 'error');
    }
}

async function agregarAlCarrito(codigoBarra) {
    try {
        const response = await fetch('/api/productos');
        const productosActualizados = await response.json();
        const producto = productosActualizados.find(p => p.codigoBarra === codigoBarra);

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
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al cargar producto', 'error');
    }
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

    const productoActual = productoPendiente;
    const codigoBarra = productoActual.codigoBarra;
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
            productoPendiente = null;
            return;
        }

        if (result.alertas && result.alertas.length > 0) {
            result.alertas.forEach(alerta => mostrarNotificacion(alerta, 'warning'));
        }

        const ventaResponse = await fetch('/api/ventas/actual');
        ventaActual = await ventaResponse.json();

        if (ventaActual.carrito) {
            actualizarCarrito();
            await cargarProductos();
            mostrarNotificacion(`${productoActual.nombre} agregado al carrito`, 'success');
        } else {
            mostrarNotificacion('Producto agregado', 'success');
        }
    } catch (error) {
        console.error('Error:', error);
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

    if (!ventaActual || !ventaActual.carrito || ventaActual.carrito.length === 0) {
        carritoDiv.innerHTML = '<div class="carrito-vacio">Agrega productos al carrito</div>';
        document.getElementById('subtotal').textContent = '$0.00';
        document.getElementById('impuestos').textContent = '$0.00';
        document.getElementById('descuento').textContent = '-$0.00';
        document.getElementById('total').textContent = '$0.00';
        return;
    }

    let subtotal = 0;
    let impuestos = 0;

    carritoDiv.innerHTML = ventaActual.carrito.map((item, index) => {
        subtotal += item.subtotal_detalle;
        impuestos += (item.impuesto_detalle || 0);
        return `
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
    `}).join('');

    ventaActual.subtotal = subtotal;
    ventaActual.impuestos = impuestos;
    ventaActual.total = subtotal + impuestos - (ventaActual.descuento || 0);

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
    if (!ventaActual || !ventaActual.carrito || ventaActual.carrito.length === 0) {
        mostrarNotificacion('No hay productos en el carrito', 'error');
        return;
    }

    if (!ventaActual.total || ventaActual.total === 0) {
        ventaActual.subtotal = ventaActual.carrito.reduce(function (sum, item) {
            return sum + item.subtotal_detalle;
        }, 0);
        ventaActual.impuestos = ventaActual.carrito.reduce(function (sum, item) {
            return sum + (item.impuesto_detalle || 0);
        }, 0);
        ventaActual.total = ventaActual.subtotal + ventaActual.impuestos - (ventaActual.descuento || 0);
    }

    document.getElementById('totalConfirmar').textContent = '$' + ventaActual.total.toFixed(2);
    document.getElementById('modalConfirmarCompra').style.display = 'block';
}

async function vaciarCarrito() {
    if (!ventaActual || !ventaActual.carrito || ventaActual.carrito.length === 0) {
        mostrarNotificacion('No hay productos en el carrito', 'error');
        return;
    }

    document.getElementById('modalConfirmarVaciarCarrito').style.display = 'block';
}

document.getElementById('btnConfirmarVaciarCarrito').addEventListener('click', async function () {
    document.getElementById('modalConfirmarVaciarCarrito').style.display = 'none';
    try {
        const response = await fetch('/api/ventas/cancelar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.success) {
            ventaActual = null;
            document.getElementById('folioVenta').textContent = '';
            document.getElementById('carritoItems').innerHTML = '<div class="carrito-vacio">Agrega productos al carrito</div>';
            document.getElementById('subtotal').textContent = '$0.00';
            document.getElementById('impuestos').textContent = '$0.00';
            document.getElementById('descuento').textContent = '-$0.00';
            document.getElementById('total').textContent = '$0.00';
            document.getElementById('tipoDescuento').value = 'ninguno';
            document.getElementById('valorDescuento').value = '';
            document.getElementById('categoriaDescuento').value = '';
            toggleCamposDescuento();
            await cargarProductos();
            await nuevaVenta();
            mostrarNotificacion('Carrito vaciado y stock restaurado', 'success');
        } else {
            mostrarNotificacion('Error al vaciar el carrito', 'error');
        }
    } catch (error) {
        console.error('Error vaciando carrito:', error);
        mostrarNotificacion('Error al vaciar el carrito', 'error');
    }
});

document.getElementById('btnCancelarVaciarCarrito').addEventListener('click', function () {
    document.getElementById('modalConfirmarVaciarCarrito').style.display = 'none';
});

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

function cerrarModalAdvertenciaVenta() {
    document.getElementById('modalAdvertenciaVenta').style.display = 'none';
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
            mostrarNotificacion('Venta completada. Puntos ganados: ' + result.puntos_ganados, 'success');
            await cargarProductos();
            await cargarClientes();
            actualizarPuntosCliente();
            ventaActual = null;
            await nuevaVenta();

            if (rolActual === 'empleado') {
                await cargarInventarioEmpleado();
                await cargarReporteEmpleado('dia');
            }
        } else {
            mostrarNotificacion(result.error || 'Error al finalizar venta', 'error');
        }
    } catch (error) {
        console.error('Error finalizando venta:', error);
        mostrarNotificacion('Error al finalizar venta', 'error');
    }
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

function obtenerPrimerNombre() {
    const elementoRol = document.getElementById('rolActual');
    const textoSpan = elementoRol.textContent || elementoRol.innerText || '';
    const nombreSinIcono = textoSpan.replace(/<i[^>]*><\/i>/g, '').trim();
    const partes = nombreSinIcono.split(' ');
    const primerNombre = partes.length > 1 ? partes[1] : partes[0];
    return primerNombre && primerNombre !== 'Cliente' ? primerNombre : 'Cliente';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function toggleDropdownDominio(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        document.querySelectorAll('[id^="dropdownDominio"]').forEach(d => d.style.display = 'none');
        dropdown.style.display = 'block';
    }
}

function seleccionarDominio(btnId, dropdownId, dominio) {
    const btn = document.getElementById(btnId);
    const dropdown = document.getElementById(dropdownId);
    if (!btn || !dropdown) return;
    btn.innerHTML = dominio + ' <i class="fas fa-chevron-down" style="float: right; margin-top: 2px;"></i>';
    dropdown.style.display = 'none';
}

function obtenerEmailCompleto(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return '';
    const usuario = input.value.trim();
    const btnTexto = btn.textContent.trim();
    const dominio = btnTexto.split(' ')[0];
    if (!usuario) return '';
    return usuario + dominio;
}

function mostrarReestablecerEmpleado() {
    cerrarModalLoginEmpleado();
    document.getElementById('modalReestablecerEmpleado').style.display = 'block';
    document.getElementById('formReestablecerEmpleado').reset();
    document.getElementById('reestablecerEmpleadoError').innerHTML = '';
}

function cerrarModalReestablecerEmpleado() {
    document.getElementById('modalReestablecerEmpleado').style.display = 'none';
    intentosFallidosEmpleado = 0;
    document.getElementById('btnReestablecerEmpleado').style.display = 'none';
}

document.getElementById('formReestablecerEmpleado').addEventListener('submit', function (e) {
    e.preventDefault();

    const username = document.getElementById('reestablecerUsernameEmpleado').value;
    const adminPassword = document.getElementById('reestablecerAdminPasswordEmpleado').value;
    const nuevaPassword = document.getElementById('reestablecerNuevaPasswordEmpleado').value;

    if (!username || !adminPassword || !nuevaPassword) {
        document.getElementById('reestablecerEmpleadoError').innerHTML = 'Completa todos los campos';
        return;
    }

    fetch('/api/empleados/reestablecer-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: username,
            admin_password: adminPassword,
            nueva_password: nuevaPassword
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarNotificacion('Contrasena reestablecida exitosamente', 'success');
                cerrarModalReestablecerEmpleado();
                mostrarLoginEmpleado();
            } else {
                document.getElementById('reestablecerEmpleadoError').innerHTML = data.message || 'Error al reestablecer';
            }
        })
        .catch(error => {
            document.getElementById('reestablecerEmpleadoError').innerHTML = 'Error al procesar la solicitud';
        });
});

function mostrarReestablecerCliente() {
    cerrarModalLoginCliente();
    document.getElementById('modalReestablecerCliente').style.display = 'block';
    document.getElementById('formReestablecerCliente').reset();
    document.getElementById('reestablecerClienteError').innerHTML = '';
}

function cerrarModalReestablecerCliente() {
    document.getElementById('modalReestablecerCliente').style.display = 'none';
    intentosFallidosCliente = 0;
    document.getElementById('btnReestablecerCliente').style.display = 'none';
}

document.getElementById('formReestablecerCliente').addEventListener('submit', function (e) {
    e.preventDefault();

    const email = obtenerEmailCompleto('reestablecerEmailCliente', 'btnDominioReestablecer');
    const telefono = document.getElementById('reestablecerTelefonoCliente').value;
    const adminPassword = document.getElementById('reestablecerAdminPasswordCliente').value;
    const nuevaPassword = document.getElementById('reestablecerNuevaPasswordCliente').value;

    if (!email || !telefono || !adminPassword || !nuevaPassword) {
        document.getElementById('reestablecerClienteError').innerHTML = 'Completa todos los campos';
        return;
    }

    fetch('/api/clientes/reestablecer-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: email,
            telefono: telefono,
            admin_password: adminPassword,
            nueva_password: nuevaPassword
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarNotificacion('Contrasena reestablecida exitosamente', 'success');
                cerrarModalReestablecerCliente();
                mostrarLoginCliente();
            } else {
                document.getElementById('reestablecerClienteError').innerHTML = data.message || 'Error al reestablecer';
            }
        })
        .catch(error => {
            document.getElementById('reestablecerClienteError').innerHTML = 'Error al procesar la solicitud';
        });
});

async function mostrarBaseDatosUsuarios() {
    document.getElementById('modalBaseDatosUsuarios').style.display = 'block';
    await cargarEmpleadosBD();
    await cargarClientesBD();
}

function cerrarModalBaseDatosUsuarios() {
    document.getElementById('modalBaseDatosUsuarios').style.display = 'none';
}

async function cargarEmpleadosBD() {
    try {
        const response = await fetch('/api/empleados/listar');
        const empleados = await response.json();
        const tbody = document.getElementById('tablaEmpleadosBD');

        if (empleados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No hay empleados registrados</td></tr>';
            return;
        }

        tbody.innerHTML = empleados.map((e, index) => `
            <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                <td style="padding: 12px;">${e.id}</td>
                <td style="padding: 12px;">${escapeHtml(e.nombre)}</td>
                <td style="padding: 12px;">${escapeHtml(e.apellido)}</td>
                <td style="padding: 12px;">${escapeHtml(e.username)}</td>
                <td style="padding: 12px;">${e.fecha_creacion}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando empleados:', error);
        document.getElementById('tablaEmpleadosBD').innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #e74c3c;">Error al cargar empleados</td></tr>';
    }
}

async function cargarClientesBD() {
    try {
        const response = await fetch('/api/clientes');
        const clientes = await response.json();
        const tbody = document.getElementById('tablaClientesBD');

        if (clientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No hay clientes registrados</td></tr>';
            return;
        }

        tbody.innerHTML = clientes.map((c, index) => `
            <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                <td style="padding: 12px;">${c.codigo_cliente || 'N/A'}</td>
                <td style="padding: 12px;">${escapeHtml(c.nombre)}</td>
                <td style="padding: 12px;">${escapeHtml(c.apellido || '')}</td>
                <td style="padding: 12px;">${escapeHtml(c.email || 'No registrado')}</td>
                <td style="padding: 12px;">${escapeHtml(c.telefono)}</td>
                <td style="padding: 12px; text-align: center;">${c.puntos}</td>
                <td style="padding: 12px;">${c.fecha_registro || 'No disponible'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando clientes:', error);
        document.getElementById('tablaClientesBD').innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #e74c3c;">Error al cargar clientes</td></tr>';
    }
}

function actualizarPuntosCliente() {
    const textoRolActual = document.getElementById('rolActual').textContent || document.getElementById('rolActual').innerText || '';
    const esCliente = textoRolActual.includes('Cliente');
    if (!esCliente) return;

    const partes = textoRolActual.replace('Cliente ', '').trim().split(' ');
    const clienteNombre = partes.join(' ');

    fetch('/api/clientes')
        .then(response => response.json())
        .then(clientes => {
            const clienteEncontrado = clientes.find(c => {
                const nombreCompleto = (c.nombre + ' ' + (c.apellido || '')).trim();
                return nombreCompleto.toLowerCase() === clienteNombre.toLowerCase();
            });
            if (clienteEncontrado) {
                document.getElementById('cantidadPuntosCliente').textContent = clienteEncontrado.puntos;
                document.getElementById('puntosCliente').style.display = 'block';
            }
        })
        .catch(error => console.error('Error actualizando puntos:', error));
}

function mostrarOpcionesAgregarUsuario() {
    document.getElementById('modalOpcionesAgregarUsuario').style.display = 'block';
}

function cerrarModalOpcionesAgregarUsuario() {
    document.getElementById('modalOpcionesAgregarUsuario').style.display = 'none';
}

function solicitarPasswordAdminParaRegistro(tipo) {
    console.log('PASO 1: solicitarPasswordAdminParaRegistro llamado con tipo:', tipo);
    cerrarModalOpcionesAgregarUsuario();
    tipoUsuarioARegistrar = tipo;
    console.log('PASO 2: tipoUsuarioARegistrar guardado:', tipoUsuarioARegistrar);
    var modalPasswordAdmin = document.getElementById('modalPasswordAdminRegistro');
    console.log('PASO 3: modalPasswordAdminRegistro encontrado:', modalPasswordAdmin);
    if (modalPasswordAdmin) {
        modalPasswordAdmin.style.display = 'block';
        document.getElementById('passwordAdminRegistro').value = '';
        document.getElementById('passwordAdminRegistroError').innerHTML = '';
        console.log('PASO 4: modal mostrado correctamente');
    } else {
        console.log('ERROR: No se encontro modalPasswordAdminRegistro');
    }
}

function verificarPasswordAdminRegistro() {
    console.log('PASO 5: verificarPasswordAdminRegistro llamado');
    console.log('PASO 6: tipoUsuarioARegistrar actual:', tipoUsuarioARegistrar);
    const password = document.getElementById('passwordAdminRegistro').value;
    if (!password) {
        document.getElementById('passwordAdminRegistroError').innerHTML = 'Ingresa la contrasena de administrador';
        return;
    }
    console.log('PASO 7: Enviando fetch a /api/empleados/verificar-admin');
    fetch('/api/empleados/verificar-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
    })
        .then(response => response.json())
        .then(data => {
            console.log('PASO 8: Respuesta del servidor:', data);
            if (data.success) {
                var tipoGuardado = tipoUsuarioARegistrar;
                console.log('PASO 9: Autenticacion exitosa, tipoGuardado:', tipoGuardado);
                document.getElementById('modalPasswordAdminRegistro').style.display = 'none';
                document.getElementById('modalOpcionesAgregarUsuario').style.display = 'none';
                tipoUsuarioARegistrar = null;
                console.log('PASO 10: Modales cerrados, preparando apertura en 300ms');
                setTimeout(function () {
                    if (tipoGuardado === 'empleado') {
                        console.log('PASO 11: Intentando abrir modalRegistroEmpleado');
                        var modalEmp = document.getElementById('modalRegistroEmpleado');
                        console.log('PASO 12: modalRegistroEmpleado encontrado:', modalEmp);
                        if (modalEmp) {
                            modalEmp.style.display = 'block';
                            document.getElementById('formRegistroEmpleado').reset();
                            console.log('PASO 13: modalRegistroEmpleado abierto');
                        }
                    } else if (tipoGuardado === 'cliente') {
                        console.log('PASO 11: Intentando abrir modalRegistroCliente');
                        var modalCli = document.getElementById('modalRegistroCliente');
                        console.log('PASO 12: modalRegistroCliente encontrado:', modalCli);
                        if (modalCli) {
                            modalCli.style.display = 'block';
                            document.getElementById('formRegistroCliente').reset();
                            console.log('PASO 13: modalRegistroCliente abierto');
                        }
                    }
                }, 300);
            } else {
                console.log('ERROR: Contrasena incorrecta');
                document.getElementById('passwordAdminRegistroError').innerHTML = 'Contrasena incorrecta';
                document.getElementById('passwordAdminRegistro').value = '';
            }
        })
        .catch(error => {
            console.log('ERROR en fetch:', error);
            document.getElementById('passwordAdminRegistroError').innerHTML = 'Error al verificar';
        });
}

function mostrarBusquedaUsuarios() {
    document.getElementById('modalBusquedaUsuarios').style.display = 'block';
    document.getElementById('busquedaId').value = '';
    document.getElementById('busquedaNombre').value = '';
    document.getElementById('busquedaApellido').value = '';
    document.getElementById('busquedaCorreo').value = '';
    document.getElementById('busquedaTelefono').value = '';
    document.getElementById('resultadosBusqueda').innerHTML = '';
}

function cerrarModalBusquedaUsuarios() {
    document.getElementById('modalBusquedaUsuarios').style.display = 'none';
}

async function realizarBusquedaUsuarios() {
    const id = document.getElementById('busquedaId').value.trim();
    const nombre = document.getElementById('busquedaNombre').value.trim();
    const apellido = document.getElementById('busquedaApellido').value.trim();
    const correo = document.getElementById('busquedaCorreo').value.trim();
    const telefono = document.getElementById('busquedaTelefono').value.trim();

    if (!id && !nombre && !apellido && !correo && !telefono) {
        document.getElementById('resultadosBusqueda').innerHTML = '<p style="text-align: center; color: #e53e3e;">Debes llenar al menos un campo</p>';
        return;
    }

    try {
        const responseEmpleados = await fetch('/api/empleados/listar');
        const empleados = await responseEmpleados.json();

        const responseClientes = await fetch('/api/clientes');
        const clientes = await responseClientes.json();

        let resultados = [];

        empleados.forEach(e => {
            let coincide = false;
            if (id && e.id.toString() === id) coincide = true;
            if (nombre && e.nombre.toLowerCase().includes(nombre.toLowerCase())) coincide = true;
            if (apellido && e.apellido.toLowerCase().includes(apellido.toLowerCase())) coincide = true;
            if (!id && !nombre && !apellido && !correo && !telefono) coincide = false;

            if (!id && !nombre && !apellido && !coincide) {
                if (correo || telefono) coincide = false;
            }

            if (coincide || (id && e.id.toString() === id) || (nombre && e.nombre.toLowerCase().includes(nombre.toLowerCase())) || (apellido && e.apellido.toLowerCase().includes(apellido.toLowerCase()))) {
                coincide = true;
            }

            if (coincide) {
                if ((!correo && !telefono) || (correo && telefono)) {
                    resultados.push({
                        tipo: 'Empleado',
                        id: e.id,
                        nombre: e.nombre,
                        apellido: e.apellido,
                        correo: 'N/A',
                        telefono: 'N/A',
                        username: e.username
                    });
                }
            }
        });

        if (!correo || correo === '') {
            empleados.forEach(e => {
                let coincide = false;
                if (id && e.id.toString() === id) coincide = true;
                else if (nombre && e.nombre.toLowerCase().includes(nombre.toLowerCase())) coincide = true;
                else if (apellido && e.apellido.toLowerCase().includes(apellido.toLowerCase())) coincide = true;
                else if (!id && !nombre && !apellido && !apellido) coincide = true;

                if (coincide && !resultados.some(r => r.tipo === 'Empleado' && r.id === e.id)) {
                    resultados.push({
                        tipo: 'Empleado',
                        id: e.id,
                        nombre: e.nombre,
                        apellido: e.apellido,
                        correo: 'N/A',
                        telefono: 'N/A',
                        username: e.username
                    });
                }
            });
        }

        clientes.forEach(c => {
            let coincide = false;
            if (id && c.codigo_cliente && c.codigo_cliente.toString() === id) coincide = true;
            if (nombre && c.nombre && c.nombre.toLowerCase().includes(nombre.toLowerCase())) coincide = true;
            if (apellido && c.apellido && c.apellido.toLowerCase().includes(apellido.toLowerCase())) coincide = true;
            if (correo && c.email && c.email.toLowerCase().includes(correo.toLowerCase())) coincide = true;
            if (telefono && c.telefono && c.telefono.includes(telefono)) coincide = true;

            if (!id && !nombre && !apellido && !correo && !telefono) coincide = false;

            if (coincide) {
                resultados.push({
                    tipo: 'Cliente',
                    id: c.codigo_cliente,
                    nombre: c.nombre,
                    apellido: c.apellido || '',
                    correo: c.email || 'No registrado',
                    telefono: c.telefono,
                    username: 'N/A'
                });
            }
        });

        if (resultados.length === 0) {
            document.getElementById('resultadosBusqueda').innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">No se encontraron usuarios con los criterios especificados</p>';
            return;
        }

        let html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: #4299e1; color: white;"><th style="padding: 10px;">Tipo</th><th style="padding: 10px;">ID</th><th style="padding: 10px;">Nombre</th><th style="padding: 10px;">Apellido</th><th style="padding: 10px;">Correo/Usuario</th><th style="padding: 10px;">Telefono</th></tr></thead><tbody>';

        resultados.forEach((r, index) => {
            html += `<tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};"><td style="padding: 10px;">${r.tipo}</td><td style="padding: 10px;">${r.id}</td><td style="padding: 10px;">${escapeHtml(r.nombre)}</td><td style="padding: 10px;">${escapeHtml(r.apellido)}</td><td style="padding: 10px;">${escapeHtml(r.correo !== 'N/A' ? r.correo : r.username)}</td><td style="padding: 10px;">${escapeHtml(r.telefono)}</td></tr>`;
        });

        html += '</tbody></table>';
        document.getElementById('resultadosBusqueda').innerHTML = html;

    } catch (error) {
        console.error('Error buscando usuarios:', error);
        document.getElementById('resultadosBusqueda').innerHTML = '<p style="text-align: center; color: #e53e3e;">Error al realizar la busqueda</p>';
    }
}

function mostrarEliminarUsuario() {
    document.getElementById('modalEliminarUsuario').style.display = 'block';
    document.getElementById('idUsuarioEliminar').value = '';
    document.getElementById('passwordAdminEliminar').value = '';
    document.getElementById('eliminarUsuarioError').innerHTML = '';
}

function cerrarModalEliminarUsuario() {
    document.getElementById('modalEliminarUsuario').style.display = 'none';
}

async function eliminarUsuario() {
    const tipo = document.getElementById('tipoUsuarioEliminar').value;
    const id = document.getElementById('idUsuarioEliminar').value.trim();
    const password = document.getElementById('passwordAdminEliminar').value;

    if (!id || !password) {
        document.getElementById('eliminarUsuarioError').innerHTML = 'Completa todos los campos';
        return;
    }

    const textoRolActual = document.getElementById('rolActual').textContent || document.getElementById('rolActual').innerText || '';

    try {
        const adminResponse = await fetch('/api/empleados/verificar-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });
        const adminData = await adminResponse.json();

        if (!adminData.success) {
            document.getElementById('eliminarUsuarioError').innerHTML = 'Contrasena de administrador incorrecta';
            return;
        }

        if (tipo === 'empleado') {
            const empResponse = await fetch('/api/empleados/listar');
            const empleados = await empResponse.json();
            const empleadoAEliminar = empleados.find(e => e.id.toString() === id);

            if (!empleadoAEliminar) {
                document.getElementById('eliminarUsuarioError').innerHTML = 'Empleado no encontrado';
                return;
            }

            if (empleadoAEliminar.id === 1) {
                document.getElementById('eliminarUsuarioError').innerHTML = 'No se puede eliminar al administrador principal';
                return;
            }

            const textoRolActual = document.getElementById('rolActual').textContent || document.getElementById('rolActual').innerText || '';
            if (textoRolActual.includes('Empleado')) {
                const usuarioActual = textoRolActual.replace(/<i[^>]*><\/i>/g, '').replace('Empleado:', '').trim();
                const partesUsuario = usuarioActual.split(' ');
                if (partesUsuario.length >= 1) {
                    const nombreActual = partesUsuario[0];
                    if (empleadoAEliminar.nombre === nombreActual) {
                        document.getElementById('eliminarUsuarioError').innerHTML = 'No puedes eliminar tu propio usuario';
                        return;
                    }
                }
            }

            const deleteResponse = await fetch(`/api/empleados/eliminar/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_password: password })
            });

            if (deleteResponse.ok) {
                mostrarNotificacion('Empleado eliminado exitosamente', 'success');
                cerrarModalEliminarUsuario();
                if (document.getElementById('modalBaseDatosUsuarios').style.display === 'block') {
                    await cargarEmpleadosBD();
                }
            } else {
                const error = await deleteResponse.json();
                document.getElementById('eliminarUsuarioError').innerHTML = error.detail || 'Error al eliminar empleado';
            }
        } else if (tipo === 'cliente') {
            const deleteResponse = await fetch(`/api/clientes/eliminar/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_password: password })
            });

            if (deleteResponse.ok) {
                mostrarNotificacion('Cliente eliminado exitosamente', 'success');
                cerrarModalEliminarUsuario();
                await cargarClientes();
                if (document.getElementById('modalBaseDatosUsuarios').style.display === 'block') {
                    await cargarClientesBD();
                }
            } else {
                const error = await deleteResponse.json();
                document.getElementById('eliminarUsuarioError').innerHTML = error.detail || 'Error al eliminar cliente';
            }
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        document.getElementById('eliminarUsuarioError').innerHTML = 'Error al procesar la solicitud';
    }
}

function formatearNombre(texto) {
    if (!texto) return '';
    return texto.toLowerCase().replace(/(?:^|\s)\S/g, function (letra) {
        return letra.toUpperCase();
    });
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

async function cargarInventarioEmpleado(categoriaFiltro) {
    try {
        const response = await fetch('/api/productos');
        const productos = await response.json();
        mostrarInventarioEmpleado(productos, categoriaFiltro);
    } catch (error) {
        console.error('Error cargando inventario:', error);
    }
}

function mostrarInventarioEmpleado(productos, categoriaFiltro) {
    const tbody = document.getElementById('inventarioBodyEmpleado');
    const filtro = document.getElementById('filtroInventarioEmpleado')?.value.toLowerCase() || '';

    let productosFiltrados = productos.filter(p => {
        const matchTexto = p.nombre.toLowerCase().includes(filtro) ||
            p.codigoBarra.toLowerCase().includes(filtro);
        const matchCategoria = !categoriaFiltro || p.categoria === categoriaFiltro;
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
    const filtroCategoria = document.getElementById('filtroCategoriaInventarioEmpleado').value;
    cargarInventarioEmpleado(filtroCategoria);
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
    if (ventaActualEmpleado && ventaActualEmpleado.carrito && ventaActualEmpleado.carrito.length > 0) {
        document.getElementById('modalAdvertenciaVenta').style.display = 'block';
        return;
    }

    if (ventaActualEmpleado && (!ventaActualEmpleado.carrito || ventaActualEmpleado.carrito.length === 0)) {
        mostrarNotificacion('No puedes realizar una nueva venta con el carrito vacio', 'error');
        return;
    }

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
            await cargarInventarioEmpleado();
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
    if (!ventaActualEmpleado || !ventaActualEmpleado.carrito || ventaActualEmpleado.carrito.length === 0) {
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
            ventaActualEmpleado = null;
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
            if (modal.id === 'modalRegistroCliente') {
                document.getElementById('formRegistroCliente').reset();
            }
            if (modal.id === 'modalRegistroEmpleado') {
                document.getElementById('formRegistroEmpleado').reset();
            }
            if (modal.id === 'modalConfirmarVaciarCarrito') {
                document.getElementById('modalConfirmarVaciarCarrito').style.display = 'none';
            }
            if (modal.id === 'modalBaseDatosUsuarios') {
                document.getElementById('modalBaseDatosUsuarios').style.display = 'none';
            }
            if (modal.id === 'modalOpcionesAgregarUsuario') {
                document.getElementById('modalOpcionesAgregarUsuario').style.display = 'none';
            }
            if (modal.id === 'modalPasswordAdminRegistro') {
                document.getElementById('modalPasswordAdminRegistro').style.display = 'none';
                tipoUsuarioARegistrar = null;
            }
            if (modal.id === 'modalBusquedaUsuarios') {
                document.getElementById('modalBusquedaUsuarios').style.display = 'none';
            }
            if (modal.id === 'modalEliminarUsuario') {
                document.getElementById('modalEliminarUsuario').style.display = 'none';
            }
        }
    });
}