from abc import ABC, abstractmethod

class Producto(ABC):
    def __init__(self, codigoBarra, nombre, categoria, precioCompra, precioVenta, stock):
        self.codigoBarra = codigoBarra
        self.nombre = nombre
        self.categoria = categoria
        self.precioCompra = precioCompra
        self.precioVenta = precioVenta
        self.__stock = stock
    
    
    @abstractmethod
    def calcularImpuesto(self):
        pass
    

    @abstractmethod
    def vender(self, cantidad):
        pass


    def actualizar_stock(self, cantidad):
        self.__stock -= cantidad


class SinStockException(Exception):
    pass


class ProductoUnitario(Producto):
    def __init__(self, codigoBarra, nombre, categoria, precioCompra, precioVenta, stock):
        super().__init__(codigoBarra, nombre, categoria, precioCompra, precioVenta, stock)


    def calcularImpuesto(self):
        return self.precioVenta * 0.16
    

    def vender(self, cantidad):
        if not isinstance(cantidad, int):
            print(f" Error: El producto {self.nombre} solo se vende por unidades enteras.")
            return False
        
        if cantidad <= self.stock:
            self.actualizar_stock(cantidad)
            print(f" Vendiendo {cantidad} pieza(s) de {self.nombre}")
            return True
        
        else:
            raise SinStockException(f" Stock insuficiente para {self.nombre}")


class ProductoGranel(Producto):
    def __init__(self, codigoBarra, nombre, categoria, precioCompra, precioVenta, stock):
        super().__init__(codigoBarra, nombre, categoria, precioCompra, precioVenta, stock)
    
    
    def calcularImpuesto(self):
        return self.precioVenta * 0.08
    

    def vender(self, cantidad):
        if cantidad <= self.stock:
            self.actualizar_stock(cantidad)
            print(f" Vendiendo {cantidad:.2f} kg(s) de {self.nombre}")
            return True
        
        else:
            raise SinStockException(f" Ya no queda producto disponible de {self.nombre}")


class Inventario:
    _instancia = None

    def __new__(cls):
        if cls._instancia is None:
            cls._instancia = super(Inventario, cls).__new__(cls)
            cls._instancia.productos = []
        return cls._instancia
    

    def agregar_producto(self, producto):
        self.productos.append(producto)
        print(f" Producto '{producto.nombre}' registrado en el sistema.")
    

    def buscar_por_codigo(self, codigo):
        for p in self.productos:
            if p.codigoBarra == codigo:
                return p
        return None
    

    def listar_por_categoria(self, categoria):
        return [p for p in self.productos if p.categoria.lower() == categoria.lower()]
    

    def obtener_todo(self):
        return self.productos


class Cliente:
    def __init__(self, nombre_cliente, telefono, puntos_acumulados):
        self.nombre_cliente = nombre_cliente
        self.telefono = telefono
        self.puntos_acumulados = puntos_acumulados
    

    def sumar_puntos(self, monto_total):
        nuevos_puntos = int(monto_total // 10)
        self.puntos_acumulados += nuevos_puntos
        print(f" {self.nombre_cliente} ha ganado {nuevos_puntos} puntos!")
    

    def usar_puntos(self, cantidad):
        if cantidad <= self.puntos_acumulados:
            self.puntos_acumulados -= cantidad
            return True
        return False
    

    def __str__(self):
        return f" Cliente: {self.nombre_cliente} | Puntos: {self.puntos_acumulados}"
    

class DetalleVenta:
    def __init__(self, producto, cantidad):
        self.producto = producto
        self.cantidad = cantidad
        self.precio_unitario = producto.precioVenta
        self.subtotal_detalle = self.calcular_subtotal()
    
    def calcular_subtotal(self):
        return self.precio_unitario * self.cantidad
    
    def __str__(self):
        return f"{self.producto.nombre:<15} x{self.cantidad:>3}   ${self.subtotal_detalle:>8.2f}"


class Venta:
    def __init__(self, folio, cliente=None):
        self.folio = folio
        self.fecha = ""
        self.cliente = cliente
        self.carrito = []
        self.__subtotal = 0.0
        self.__total = 0.0
    
    
    def agregar_producto(self, producto, cantidad):
        if producto.vender(cantidad):
            nuevo_detalle = DetalleVenta(producto, cantidad)
            self.carrito.append(nuevo_detalle)
            self._recalcular_totales()
            return True
        return False
    

    def _recalcular_totales(self):
        self.__subtotal = sum(item.subtotal_detalle for item in self.carrito)
        impuestos = sum(item.producto.calcularImpuesto() * item.cantidad for item in self.carrito)
        self.__total = self.__subtotal + impuestos
    

    def generar_ticket(self):
        ticket = f"=== ABARROTES DON PEPE ===\n"
        ticket += f"Folio: {self.folio}\n"
        ticket += f"Fecha: {self.fecha.strftime('%d/%m/%Y %H:%M')}\n"
        ticket += f"Cliente: {self.cliente.nombre_cliente if self.cliente else 'Publico General'}\n"
        ticket += f"=" * 27 + "\n"

        for item in self.carrito:
            ticket += f"{str(item)}\n"
        
        ticket += f"=" * 27 + "\n"
        ticket += f"Subtotal: ${self.__subtotal:>10.2f}\n"
        ticket += f"Total:    ${self.__total:>10.2f}\n"
        ticket += "  ¡Gracias por su compra   !"
        return ticket
