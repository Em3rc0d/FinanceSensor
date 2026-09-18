const item = (text, x, y, width = 40, height = 10, sequence = 0) => ({ text, x, y, width, height, sequence });

export const bcpSavingsLayoutV1 = {
  pages: [
    {
      pageNumber: 1,
      width: 600,
      height: 800,
      items: [
        item('Estado de Cuenta de Ahorros Cuenta Digital BCP', 40, 760, 260, 12, 0),
        item('DEL 01/07/26 AL 31/07/26', 390, 735, 150, 10, 1),
        item('FECHA PROC.', 40, 700, 55, 10, 2),
        item('FECHA VALOR', 105, 700, 55, 10, 3),
        item('DESCRIPCION', 180, 700, 100, 10, 4),
        item('CARGOS / DEBE', 380, 700, 75, 10, 5),
        item('ABONOS / HABER', 485, 700, 80, 10, 6),
        item('SALDO ANTERIOR', 180, 675, 80, 10, 7),
        item('50.00', 500, 675, 35, 10, 8),
        item('01JUL', 40, 650, 35, 10, 9),
        item('01JUL', 105, 650, 35, 10, 10),
        item('ABONO DEMO', 180, 650, 85, 10, 11),
        item('125.00', 500, 650, 40, 10, 12),
        item('02JUL', 40, 625, 35, 10, 13),
        item('02JUL', 105, 625, 35, 10, 14),
        item('COMPRA DEMO', 180, 625, 90, 10, 15),
        item('20.50', 395, 625, 35, 10, 16),
        item('TOTAL MOVIMIENTO', 180, 575, 95, 10, 17),
        item('20.50', 395, 575, 35, 10, 18),
        item('125.00', 500, 575, 40, 10, 19)
      ]
    },
    {
      pageNumber: 2,
      width: 600,
      height: 800,
      items: [
        item('Estado de Cuenta de Ahorros Cuenta Digital BCP', 40, 760, 260, 12, 0),
        item('DEL 01/07/26 AL 31/07/26', 390, 735, 150, 10, 1),
        item('FECHA PROC.', 40, 700, 55, 10, 2),
        item('FECHA VALOR', 105, 700, 55, 10, 3),
        item('DESCRIPCION', 180, 700, 100, 10, 4),
        item('CARGOS / DEBE', 380, 700, 75, 10, 5),
        item('ABONOS / HABER', 485, 700, 80, 10, 6),
        item('03JUL', 40, 650, 35, 10, 7),
        item('03JUL', 105, 650, 35, 10, 8),
        item('TRANSFERENCIA DEMO', 180, 650, 120, 10, 9),
        item('70.00', 395, 650, 35, 10, 10),
        item('SALDO', 180, 575, 40, 10, 11),
        item('84.50', 500, 575, 35, 10, 12)
      ]
    }
  ]
};
