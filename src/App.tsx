/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import TournamentDetails from "./pages/TournamentDetails";
import Registration from "./pages/Registration";
import AdminDashboard from "./pages/AdminDashboard";
import BackButton from "./components/common/BackButton";

export default function App() {
  return (
    <Router>
      <BackButton />
      <Routes>
        <Route path="/" element={<Navigate to="/tournament" replace />} />
        <Route path="/tournament" element={<Home />} />
        <Route path="/tournament/:id" element={<TournamentDetails />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/:id" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}
