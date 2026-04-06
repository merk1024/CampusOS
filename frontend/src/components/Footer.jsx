import campusosBrandDark from '../assets/campusos-brand-dark.svg';
import campusosBrandLight from '../assets/campusos-brand-light.svg';
import campusosMobileDark from '../assets/campusos-mobile-dark.svg';
import campusosMobileLight from '../assets/campusos-mobile-light.svg';
import { getShellCopy } from '../appPreferences';
import useMediaQuery from '../hooks/useMediaQuery';

function Footer({ theme = 'light', language = 'English', onNavigate }) {
  const year = new Date().getFullYear();
  const copy = getShellCopy(language).footer;
  const isCompactBrand = useMediaQuery('(max-width: 768px)');
  const brandLogo = theme === 'dark' ? campusosBrandDark : campusosBrandLight;
  const mobileBrandLogo = theme === 'dark' ? campusosMobileDark : campusosMobileLight;
  const activeBrandLogo = isCompactBrand ? mobileBrandLogo : brandLogo;

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="footer-logo">
            <span className="footer-logo-media">
              <img src={activeBrandLogo} alt="CampusOS" className="footer-logo-image" />
            </span>
          </div>
          <p className="footer-text">{copy.copyright.replace('{year}', String(year))}</p>
        </div>
        <div className="footer-right">
          <div className="footer-links">
            <button type="button" className="footer-link" onClick={() => onNavigate?.('privacy')}>{copy.privacy}</button>
            <button type="button" className="footer-link" onClick={() => onNavigate?.('terms')}>{copy.terms}</button>
            <button type="button" className="footer-link" onClick={() => onNavigate?.('support')}>{copy.support}</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
