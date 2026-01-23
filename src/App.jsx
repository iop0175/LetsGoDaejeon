import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Header from './components/Header/Header'
import Footer from './components/Footer/Footer'
import HomePage from './pages/HomePage'
import TravelPage from './pages/TravelPage'
import FestivalPage from './pages/FestivalPage'
import FoodPage from './pages/FoodPage'
import SearchPage from './pages/SearchPage'
import ParkingPage from './pages/ParkingPage'
import MapPage from './pages/MapPage'
import CulturePage from './pages/CulturePage'
import MedicalPage from './pages/MedicalPage'
import ShoppingPage from './pages/ShoppingPage'
import AccommodationPage from './pages/AccommodationPage'
import LeisurePage from './pages/LeisurePage'
import AdminPage from './pages/AdminPage'
import MyTripPage from './pages/MyTripPage'
import SharedTripPage from './pages/SharedTripPage'
import SharedTripsPage from './pages/SharedTripsPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import CopyrightPage from './pages/CopyrightPage'
import { recordPageVisitDB } from './services/dbService'
import './styles/App.css'

// 경로를 페이지 이름으로 변환
const getPageName = (pathname) => {
  const pathMap = {
    '/': 'home',
    '/travel': 'travel',
    '/festival': 'festival',
    '/food': 'food',
    '/search': 'search',
    '/parking': 'parking',
    '/map': 'map',
    '/culture': 'culture',
    '/medical': 'medical',
    '/shopping': 'shopping',
    '/accommodation': 'accommodation',
    '/leisure': 'leisure',
    '/my-trip': 'my-trip'
  }
  return pathMap[pathname] || null
}

function App() {
  const location = useLocation()
  const isAdminPage = location.pathname.startsWith('/admin')
  
  // 페이지 방문 추적
  useEffect(() => {
    const pageName = getPageName(location.pathname)
    if (pageName) {
      recordPageVisitDB(pageName)
    }
  }, [location.pathname])
  
  return (
    <div className="app">
      <SpeedInsights />
      {!isAdminPage && <Header />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/travel" element={<TravelPage />} />
          <Route path="/festival" element={<FestivalPage />} />
          <Route path="/food" element={<FoodPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/parking" element={<ParkingPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/culture" element={<CulturePage />} />
          <Route path="/medical" element={<MedicalPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="/accommodation" element={<AccommodationPage />} />
          <Route path="/leisure" element={<LeisurePage />} />
          <Route path="/my-trip" element={<MyTripPage />} />
          <Route path="/shared-trips" element={<SharedTripsPage />} />
          <Route path="/trip/shared/:tripId" element={<SharedTripPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/copyright" element={<CopyrightPage />} />
        </Routes>
      </main>
      {!isAdminPage && <Footer />}
    </div>
  )
}

export default App
