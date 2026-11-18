// Per lo screenshot della dieta (poster/screenshot.mjs ... js:<questo file>):
// colazione e spuntino già mangiati oggi, nel diario dello store finto.
(async () => {
  const m = await import('/scratchpad/finto-store-vivo.js')
  const d = m.leggiFinto().diete[0]
  const pasti = d.allenamento.pasti
  const oggi = new Date().toLocaleDateString('sv-SE')
  const voce = (pasto, nome, kcal, proteine, carbo, grassi) => ({
    id: `${pasto.id}-${nome}`, testo: nome, nome, alimentoId: null, grammi: null, quantita: null, unita: 'g',
    kcal, proteine, carbo, grassi, pasto: pasto.nome, pastoId: pasto.id, stimata: true, ora: new Date().toISOString(),
  })
  m.impostaFinto({
    diario: {
      [oggi]: {
        id: oggi, data: oggi, acqua: 4,
        voci: [voce(pasti[0], 'Yogurt greco con avena e frutti di bosco', 260, 20, 30, 6), voce(pasti[1], 'Mela e mandorle', 210, 6, 22, 12), voce(pasti[2], 'Riso con pollo e zucchine', 640, 48, 82, 14)],
      },
    },
  })
})()
