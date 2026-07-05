import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useOwnUsername } from './hooks/useOwnUsername'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import Onboarding from './pages/Onboarding'
import Feed from './pages/Feed'
import Search from './pages/Search'
import Scan from './pages/Scan'
import ProductPage from './pages/ProductPage'
import ReviewForm from './pages/ReviewForm'
import Profile from './pages/Profile'
import Lists from './pages/Lists'
import ListDetail from './pages/ListDetail'
import AddProduct from './pages/AddProduct'
import { BottomNav, LoadingScreen } from './components/ui'

function AuthRoute({ session, onSignedUp }) {
  const [searchParams] = useSearchParams()
  if (session) return <Navigate to={searchParams.get('returnTo') || '/feed'} replace />
  return <Auth onSignedUp={onSignedUp} />
}

function RequireAuth({ session, children }) {
  const location = useLocation()
  if (!session) return <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname)}`} replace />
  return children
}

const TAB_ROUTES = ['feed', 'search', 'scan', 'lists']

function AppShell({ session, setJustSignedUp }) {
  const location = useLocation()
  const navigate = useNavigate()
  const ownUsername = useOwnUsername(!!session)

  const activeTab = TAB_ROUTES.find((t) => location.pathname.startsWith(`/${t}`)) || (location.pathname.startsWith('/profile') ? 'profile' : null)

  const goToTab = (tab) => {
    if (tab === 'profile') {
      if (ownUsername) navigate(`/profile/${ownUsername}`)
      return
    }
    navigate(`/${tab}`)
  }

  return (
    <div style={{ position: 'relative', maxWidth: 430, margin: '0 auto', height: '100dvh', background: '#111', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/auth" element={<AuthRoute session={session} onSignedUp={() => setJustSignedUp(true)} />} />
          <Route path="/reset-password" element={<ResetPassword onDone={() => navigate('/feed')} />} />
          <Route
            path="/feed"
            element={
              <RequireAuth session={session}>
                <Feed />
              </RequireAuth>
            }
          />
          <Route
            path="/search"
            element={
              <RequireAuth session={session}>
                <Search />
              </RequireAuth>
            }
          />
          <Route
            path="/scan"
            element={
              <RequireAuth session={session}>
                <Scan />
              </RequireAuth>
            }
          />
          <Route path="/product/:variantId" element={<ProductPage />} />
          <Route
            path="/product/:variantId/review"
            element={
              <RequireAuth session={session}>
                <ReviewForm />
              </RequireAuth>
            }
          />
          <Route
            path="/product/:variantId/edit"
            element={
              <RequireAuth session={session}>
                <AddProduct />
              </RequireAuth>
            }
          />
          <Route
            path="/lists"
            element={
              <RequireAuth session={session}>
                <Lists />
              </RequireAuth>
            }
          />
          <Route path="/lists/:listId" element={<ListDetail />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route
            path="/add-product"
            element={
              <RequireAuth session={session}>
                <AddProduct />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to={session ? '/feed' : '/auth'} replace />} />
        </Routes>
      </div>
      {activeTab && <BottomNav active={activeTab} onNavigate={goToTab} />}
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading, null = logged out
  // Checked synchronously from the URL itself (not just the onAuthStateChange
  // event) -- the event only fires once during Supabase's async client init,
  // and can be missed if that finishes before this component's effect runs.
  // Checks both shapes: the hash (#...type=recovery, the implicit flow's
  // format) and the query string (?...type=recovery, PKCE's format -- see
  // supabaseClient.js for why PKCE is used).
  const [recoveryMode, setRecoveryMode] = useState(() => window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery'))
  const [justSignedUp, setJustSignedUp] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      setSession(newSession)
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <LoadingScreen />
  if (recoveryMode) {
    return (
      <ResetPassword
        onDone={() => {
          // Land on a real destination, not the same pathname -- if the
          // recovery link's path was itself /reset-password (as it is with
          // the token_hash-based email template), leaving the path
          // unchanged means the router's own /reset-password route
          // immediately re-matches once recoveryMode flips off, mounting a
          // second fresh ResetPassword instance with no token_hash left in
          // the URL and looping back to the same form. verifyOtp + updateUser
          // leaves a real, valid session behind, so /feed is a safe landing.
          window.history.replaceState(null, '', '/feed')
          setRecoveryMode(false)
        }}
      />
    )
  }
  if (justSignedUp) return <Onboarding onDone={() => setJustSignedUp(false)} />

  return (
    <BrowserRouter>
      <AppShell session={session} setJustSignedUp={setJustSignedUp} />
    </BrowserRouter>
  )
}
