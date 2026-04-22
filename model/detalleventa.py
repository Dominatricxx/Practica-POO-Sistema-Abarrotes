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
