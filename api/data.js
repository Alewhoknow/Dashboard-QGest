// Funzione serverless (gira su Vercel, non nel browser).
// Fa lei la richiesta a Google Apps Script "lato server", dove non esistono
// i blocchi di Safari su redirect incrociati. Il browser parla solo con
// questo endpoint, sullo stesso dominio della PWA: nessun redirect incrociato,
// nessun blocco possibile.
//
// CONFIGURAZIONE (su vercel.com, non nel codice):
// Project → Settings → Environment Variables → aggiungi:
//   WEBAPP_URL   = https://script.google.com/macros/s/xxxxx/exec
//   WEBAPP_TOKEN = sharonq   (lo stesso token scritto in CONFIG.token su Apps Script)

module.exports = async (req, res) => {
  const url = process.env.WEBAPP_URL;
  const token = process.env.WEBAPP_TOKEN;

  if (!url || !token) {
    res.status(500).json({ error: 'config_mancante', message: 'WEBAPP_URL o WEBAPP_TOKEN non impostati su Vercel.' });
    return;
  }

  try {
    const risposta = await fetch(`${url}?token=${encodeURIComponent(token)}`);
    const dati = await risposta.json();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(dati);
  } catch (err) {
    res.status(502).json({ error: 'richiesta_fallita', message: err.message });
  }
};
