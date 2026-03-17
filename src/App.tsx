/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import TournamentDetails from "./pages/TournamentDetails";
import Registration from "./pages/Registration";
import AdminDashboard from "./pages/AdminDashboard";
import Draw from "./pages/Draw";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tournament/:id" element={<TournamentDetails />} />
        <Route path="/tournament" element={<Home />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/:id" element={<AdminDashboard />} />
        <Route path="/draw" element={<Draw />} />
        <Route path="/draw/:id" element={<Draw />} />
      </Routes>
    </Router>
  );
}
