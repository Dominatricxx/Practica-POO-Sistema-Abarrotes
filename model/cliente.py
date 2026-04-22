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
