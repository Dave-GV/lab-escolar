import { Navigate, Route, Routes } from 'react-router-dom'
import RutaProtegida from './components/RutaProtegida.jsx'
import CrudPage from './components/CrudPage.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import Login from './pages/Login.jsx'
import Inicio from './pages/Inicio.jsx'
import Perfil from './pages/Perfil.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RutaProtegida><DashboardLayout /></RutaProtegida>}>
        <Route index element={<Inicio />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="alumnos" element={<CrudPage key="alumnos" entidad="alumnos" />} />
        <Route path="maestros" element={<CrudPage key="maestros" entidad="maestros" />} />
        <Route path="materias" element={<CrudPage key="materias" entidad="materias" />} />
        <Route path="grupos" element={<CrudPage key="grupos" entidad="grupos" />} />
        <Route
          path="usuarios"
          element={<RutaProtegida soloAdmin><CrudPage key="usuarios" entidad="usuarios" /></RutaProtegida>}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
