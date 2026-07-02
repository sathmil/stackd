import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth          from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import Onboarding     from './pages/Onboarding'
import Feed           from './pages/Feed'
import Search         from './pages/Search'
import Scan           from './pages/Scan'
import ProductPage    from './pages/ProductPage'
import ReviewForm     from './pages/ReviewForm'
import Profile        from './pages/Profile'
import { BottomNav, LoadingScreen } from './components/ui'

export default function App() {
  const [session,         setSession]         = useState(undefined) // undefined = loading, null = logged out
  const [recoveryMode,    setRecoveryMode]     = useState(false)
  const [justSignedUp,    setJustSignedUp]     = useState(false)
  const [activeTab,       setActiveTab]       = useState('feed')
  const [productId,       setProductId]       = useState(null)
  const [reviewProductId, setReviewProductId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      setSession(newSession)
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <LoadingScreen />
  if (recoveryMode) return <ResetPassword onDone={() => setRecoveryMode(false)} />
  if (!session) return <Auth onSignedUp={() => setJustSignedUp(true)} />
  if (justSignedUp) return <Onboarding onDone={() => setJustSignedUp(false)} />

  const openProduct = id => { setProductId(id); setReviewProductId(null) }
  const openReview  = id => setReviewProductId(id)
  const goBack      = () => { if (reviewProductId) { setReviewProductId(null) } else { setProductId(null) } }
  const navigate    = tab => { setActiveTab(tab); setProductId(null); setReviewProductId(null) }

  const renderScreen = () => {
    if (reviewProductId) return <ReviewForm productId={reviewProductId} onBack={goBack} />
    if (productId)       return <ProductPage productId={productId} onBack={goBack} onReview={openReview} />
    switch (activeTab) {
      case 'feed':    return <Feed    onNavigate={navigate} onProductClick={openProduct} />
      case 'search':  return <Search  onProductClick={openProduct} />
      case 'scan':    return <Scan    onNavigate={navigate} />
      case 'profile': return <Profile onProductClick={openProduct} onLogout={() => supabase.auth.signOut()} />
      default:        return <Feed    onNavigate={navigate} onProductClick={openProduct} />
    }
  }

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', height: '100dvh', background: '#111', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderScreen()}
      </div>
      {!reviewProductId && !productId && (
        <BottomNav active={activeTab} onNavigate={navigate} />
      )}
    </div>
  )
}
