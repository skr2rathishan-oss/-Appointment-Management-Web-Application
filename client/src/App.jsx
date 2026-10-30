import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import AppointmentsPage from './pages/AppointmentsPage';
import DoctorsPage from './pages/DoctorsPage';
import DoctorDetailsPage from './pages/DoctorDetailsPage';
import PatientsPage from './pages/PatientsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DoctorTodayPage from './pages/doctor/DoctorTodayPage';
import DoctorSchedulePage from './pages/doctor/DoctorSchedulePage';
import DoctorProfilePage from './pages/doctor/DoctorProfilePage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route index element={<DashboardPage />} />
        <Route path="doctors" element={<DoctorsPage />} />
        <Route path="doctors/:id" element={<DoctorDetailsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Patient and admin */}
        <Route element={<ProtectedRoute roles={['patient', 'admin']} />}>
          <Route path="appointments" element={<AppointmentsPage />} />
        </Route>

        {/* Admin only */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="patients" element={<PatientsPage />} />
        </Route>

        {/* Doctor portal */}
        <Route path="doctor" element={<ProtectedRoute roles={['doctor']} />}>
          <Route index element={<DoctorTodayPage />} />
          <Route path="schedule" element={<DoctorSchedulePage />} />
          <Route path="profile" element={<DoctorProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
