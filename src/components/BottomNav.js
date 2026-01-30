import { NavLink } from 'react-router-dom';

function BottomNav() {
  return (
    <div className="bottom-nav-wrapper">
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <span className="nav-icon">🏠</span>
          <span>Home</span>
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📋</span>
          <span>History</span>
        </NavLink>
        <NavLink to="/insights" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📊</span>
          <span>Insights</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default BottomNav;
