import { Routes, Route, useLocation } from 'react-router-dom'
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
import AdminPage from './pages/AdminPage'
import './styles/App.css'

function App() {
  const location = useLocation()
  const isAdminPage = location.pathname.startsWith('/admin')
  
  return (
    <div className="app">
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
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      {!isAdminPage && <Footer />}
    </div>
  )
}

export default App
