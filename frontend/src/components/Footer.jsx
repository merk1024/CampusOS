import campusosBrand from '../assets/campusos-brand.svg';

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="footer-logo">
            <img src={campusosBrand} alt="CampusOS" className="footer-logo-image" />
          </div>
          <p className="footer-text">Copyright {year} CampusOS by Alatoo University. All rights reserved.</p>
        </div>
        <div className="footer-right">
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
