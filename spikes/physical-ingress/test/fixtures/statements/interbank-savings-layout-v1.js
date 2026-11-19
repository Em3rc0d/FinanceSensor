const item = (text, x, y, width = 40, height = 10, sequence = 0) => ({ text, x, y, width, height, sequence });

export const interbankSavingsLayoutV1 = {
  pages: [
    {
      pageNumber: 1,
      width: 600,
      height: 800,
      items: [
        item('ESTADO DE CUENTA', 400, 760, 120, 12, 0),
        item('CUENTA SIMPLE SOLES', 400, 740, 130, 12, 1),
        item('DETALLE DE MOVIMIENTOS', 40, 700, 170, 12, 2),
        item('Fecha', 40, 675, 40, 10, 3),
        item('Concepto', 120, 675, 70, 10, 4),
        item('Ingresos', 330, 675, 60, 10, 5),
        item('Gastos', 410, 675, 50, 10, 6),
        item('Saldo Contable', 500, 675, 85, 10, 7),
        item('EMPEZASTE MES ANTERIOR CON', 40, 650, 170, 10, 8),
        item('500.00', 505, 650, 40, 10, 9),
        item('03/08/2026', 40, 625, 65, 10, 10),
        item('PLANILLA DEMO', 120, 625, 90, 10, 11),
        item('+300.00', 335, 625, 45, 10, 12),
        item('800.00', 505, 625, 40, 10, 13),
        item('05/08/2026', 40, 600, 65, 10, 14),
        item('PAGO DEMO', 120, 600, 70, 10, 15),
        item('-80.00', 415, 600, 40, 10, 16),
        item('720.00', 505, 600, 40, 10, 17),
        item('SALDO CONTABLE AL 31/08', 40, 550, 150, 10, 18),
        item('+300.00', 335, 550, 45, 10, 19),
        item('-80.00', 415, 550, 40, 10, 20),
        item('720.00', 505, 550, 40, 10, 21)
      ]
    },
    {
      pageNumber: 2,
      width: 600,
      height: 800,
      items: [
        item('Recuerda', 40, 720, 60, 10, 0),
        item('Realiza GRATIS tus consultas desde nuestros canales digitales.', 40, 690, 340, 10, 1),
        item('En Interbank nos preocupamos por tu seguridad.', 40, 640, 270, 10, 2)
      ]
    },
    {
      pageNumber: 3,
      width: 600,
      height: 800,
      items: [
        item('Te ayudamos a conocer tu Estado de Cuenta:', 40, 730, 240, 10, 0),
        item('ESTADO DE CUENTA', 300, 700, 120, 10, 1),
        item('CUENTA SIMPLE SOLES', 300, 682, 120, 10, 2),
        item('DETALLE DE MOVIMIENTOS', 300, 650, 150, 10, 3),
        item('Fecha', 300, 625, 40, 10, 4),
        item('Concepto', 360, 625, 60, 10, 5),
        item('Ingresos', 430, 625, 50, 10, 6),
        item('Gastos', 485, 625, 45, 10, 7),
        item('Saldo Contable', 535, 625, 60, 10, 8),
        item('03/10/2021', 300, 600, 65, 10, 9),
        item('TRANSF DEMO', 360, 600, 70, 10, 10),
        item('-47.20', 490, 600, 40, 10, 11),
        item('450.00', 540, 600, 40, 10, 12)
      ]
    }
  ]
};
