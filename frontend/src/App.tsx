import { LayoutGrid, LogIn, LogOut, Plus, Tag } from 'lucide-react'
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router'
import { Logo } from './components/Logo'
import { DesignPage } from './pages/DesignPage'
import { ListingDetail } from './pages/ListingDetail'
import { EditListingPage, NewListingPage } from './pages/ListingForm'
import { MyListings } from './pages/MyListings'
import { AuthProvider, RequireAuth, useAuth } from './auth'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Button } from './components/Button'

// Page provisoire : chaque story remplace la sienne par la vraie page.
function Todo({ title, task }: { title: string; task: string }) {
  return (
    <div className="stack">
      <h1>{title}</h1>
      <p className="muted">Page à réaliser ({task}).</p>
    </div>
  )
}

const navClass = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

function AppContent() {
  const { user, logout } = useAuth()
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Logo />
          <nav aria-label="Navigation principale">
            <NavLink to="/" end className={navClass}>
              <LayoutGrid size={20} aria-hidden />
              <span className="nav-label">Annonces</span>
            </NavLink>
            <NavLink to="/listings" end className={navClass}>
              <Tag size={20} aria-hidden />
              <span className="nav-label">Mes annonces</span>
            </NavLink>
            {user ? (
              <>
                <span className="account-email" title={user.email}>{user.email}</span>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut size={20} aria-hidden />
                  <span className="nav-label">Se déconnecter</span>
                </Button>
              </>
            ) : (
              <NavLink to="/login" className={navClass}>
                <LogIn size={20} aria-hidden />
                <span className="nav-label">Se connecter</span>
              </NavLink>
            )}
            <Link to="/listings/new" className="btn btn-primary btn-sm">
              <Plus size={18} aria-hidden />
              Vendre
            </Link>
          </nav>
        </div>
      </header>

      <main className="site-main">
        <div className="wrap">
          <Routes>
            <Route path="/" element={<Todo title="Annonces" task="US4, T046" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<RequireAuth />}>
              <Route path="/listings" element={<MyListings />} />
              <Route path="/listings/new" element={<NewListingPage />} />
              <Route path="/listings/:id" element={<ListingDetail />} />
              <Route path="/listings/:id/edit" element={<EditListingPage />} />
            </Route>
            <Route path="/design" element={<DesignPage />} />
            <Route path="*" element={<Todo title="Page introuvable" task="—" />} />
          </Routes>
        </div>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <Logo />
          <span>Vos objets ont encore de la valeur.</span>
          <span>Projet EFREI · Full Stack JS</span>
        </div>
      </footer>
    </>
  )
}

export default App
