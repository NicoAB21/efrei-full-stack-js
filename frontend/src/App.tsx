import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router'
import { DesignPage } from './pages/DesignPage'

// Page provisoire : chaque story remplace la sienne par la vraie page.
function Todo({ title, task }: { title: string; task: string }) {
  return (
    <>
      <h1>{title}</h1>
      <p className="muted">Page à réaliser ({task}).</p>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="logo">
            Occaz
          </Link>
          {/* US1 (T027) : afficher l'email et « Se déconnecter » une fois connecté */}
          <nav aria-label="Navigation principale">
            <NavLink to="/listings">Mes annonces</NavLink>
            <NavLink to="/listings/new">Publier</NavLink>
            <NavLink to="/login">Se connecter</NavLink>
          </nav>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Todo title="Annonces" task="US4, T046" />} />
          <Route path="/login" element={<Todo title="Connexion" task="US1, T026" />} />
          <Route path="/register" element={<Todo title="Inscription" task="US1, T026" />} />
          <Route path="/listings" element={<Todo title="Mes annonces" task="US2, T035" />} />
          <Route path="/listings/new" element={<Todo title="Publier une annonce" task="US2, T036" />} />
          <Route path="/listings/:id" element={<Todo title="Détail de l'annonce" task="US2, T037" />} />
          <Route path="/listings/:id/edit" element={<Todo title="Modifier l'annonce" task="US2, T036" />} />
          <Route path="/design" element={<DesignPage />} />
          <Route path="*" element={<Todo title="Page introuvable" task="—" />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
