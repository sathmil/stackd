import { useState } from 'react'
import Auth        from './pages/Auth'
import Feed        from './pages/Feed'
import Search      from './pages/Search'
import Scan        from './pages/Scan'
import ProductPage from './pages/ProductPage'
import ReviewForm  from './pages/ReviewForm'
import Profile     from './pages/Profile'
import { BottomNav } from './components/ui'

export default function App() {
  const [session,         setSession]         = useState(null)
  const [activeTab,       setActiveTab]       = useState('feed')
  const [productId,       setProductId]       = useState(null)
  const [reviewProductId, setReviewProductId] = useState(null)

  if (!session) return <Auth onLogin={user => setSession(user)} />

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
      case 'profile': return <Profile onProductClick={openProduct} onLogout={() => setSession(null)} />
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
