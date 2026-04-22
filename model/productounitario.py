from producto import Producto
from utils.sinstockexception import SinStockException

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
