import { useEffect, useState } from 'react'

// Page provisoire (Phase 1) : vérifie que le proxy /api atteint le back-end.
// Remplacée par le routeur en T019.
function App() {
  const [api, setApi] = useState('vérification…')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((body: { status: string }) => setApi(body.status))
      .catch(() => setApi('injoignable'))
  }, [])

  return (
    <main>
      <h1>Occaz</h1>
      <p>API : {api}</p>
    </main>
  )
}

export default App
