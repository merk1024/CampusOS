import campusosBrandDark from '../assets/campusos-brand-dark.svg';
import campusosBrandLight from '../assets/campusos-brand-light.svg';
import campusosMobileDark from '../assets/campusos-mobile-dark.svg';
import campusosMobileLight from '../assets/campusos-mobile-light.svg';

function Footer({ theme = 'light' }) {
  const year = new Date().getFullYear();
  const brandLogo = theme === 'dark' ? campusosBrandDark : campusosBrandLight;
  const mobileBrandLogo = theme === 'dark' ? campusosMobileDark : campusosMobileLight;

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="footer-logo">
            <picture className="footer-logo-media">
              <source media="(max-width: 768px)" srcSet={mobileBrandLogo} />
              <img src={brandLogo} alt="CampusOS" className="footer-logo-image" />
            </picture>
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
