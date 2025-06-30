import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaEnvelope, FaPhone, FaMapMarkerAlt, FaTimes } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const PrivacyModal = () => (
    <div className="modal-overlay" onClick={() => setShowPrivacyModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setShowPrivacyModal(false)}>
          <FaTimes />
        </button>
        <h2>Privacy Policy for Pawpoint</h2>
        <div className="modal-body">
          <p><strong>Effective Date:</strong> June 13, 2025 <strong>Last Updated:</strong> June 13, 2025</p>
          <p>Welcome to Pawpoint! Your privacy is important to us, and we are committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website or use our grooming services.</p>
          
          <h3>1. Information We Collect</h3>
          <p>We collect the following types of information:</p>
          <ul>
            <li><strong>Personal Information:</strong> Name, email address, phone number, home address, and pet details (such as breed, birthday, age, size, gender, and health conditions).</li>
            <li><strong>Payment Information:</strong> Payments for services are collected in cash upon arrival at Pawpoint.</li>
            <li><strong>Website Usage Data:</strong> Information about your interactions with our website, including cookies, IP addresses, and browsing behavior.</li>
          </ul>
  
          <h3>2. How We Use Your Information</h3>
          <p>We use your information to:</p>
          <ul>
            <li>Schedule and manage grooming appointments</li>
            <li>Process payments securely</li>
            <li>Send appointment reminders, promotions, and updates</li>
            <li>Improve our services and website experience</li>
            <li>Comply with legal obligations</li>
          </ul>
  
          <h3>3. Sharing Your Information</h3>
          <p>We do not sell or rent your personal information. However, we may share your data with:</p>
          <ul>
            <li><strong>Service Providers:</strong> Third-party companies that help us process payments, send communications, or improve our website.</li>
            <li><strong>Legal Authorities:</strong> If required by law or to protect our legal rights and safety.</li>
          </ul>
  
          <h3>4. Data Security</h3>
          <p>We take appropriate security measures to protect your personal information from unauthorized access, alteration, or disclosure. While no online system is completely secure, we encourage you to use strong passwords and safeguard your personal data.</p>
  
          <h3>5. Your Rights</h3>
          <p>You have the right to:</p>
          <ul>
            <li>Access, update, or delete your personal information</li>
            <li>Opt out of marketing communications</li>
            <li>Request details about how we process your data</li>
          </ul>
          <p>To exercise these rights, contact us at <a href="mailto:pawpointt@gmail.com">pawpointt@gmail.com</a>.</p>
  
          <h3>6. Cookies & Tracking Technologies</h3>
          <p>We use cookies to enhance your browsing experience. We may also use third-party analytics tools to monitor website performance and improve user experience. You can manage cookie preferences through your browser settings.</p>
  
          <h3>7. Changes to This Policy</h3>
          <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date.</p>
  
          <h3>8. Contact Us</h3>
          <p>If you have any questions about this Privacy Policy, please contact us at:</p>
          <p>Pawpoint Grooming Services<br />
          UPS V, Parañaque City<br />
          <a href="mailto:pawpointt@gmail.com">pawpointt@gmail.com</a><br />
          +63 956 2775 784</p>
        </div>
      </div>
    </div>
  );

  const TermsModal = () => (
    <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setShowTermsModal(false)}>
          <FaTimes />
        </button>
        <h2>Terms and Conditions for Pawpoint</h2>
        <div className="modal-body">
          <p><strong>Effective Date:</strong> June 13, 2025 <strong>Last Updated:</strong> June 13, 2025</p>
          <p>Welcome to Pawpoint! These Terms and Conditions govern the use of our grooming services and website. By booking an appointment or accessing our website, you agree to these terms.</p>
          
          <h3>1. Services Offered</h3>
          <p>Pawpoint provides professional pet grooming services, including bathing, nail trimming, fur styling, and related pet care treatments.</p>
          
          <h3>2. Appointments & Cancellations</h3>
          <p>Appointments must be scheduled in advance.</p>
          <p>Customers must arrive on time; a 30-minute grace period is allowed.</p>
          
          <h3>3. Payment Terms</h3>
          <p>Payments are collected in cash upon arrival at Pawpoint.</p>
          
          <h3>4. Customer Responsibilities</h3>
          <p>Customers must disclose any health conditions or behavioral concerns regarding their pets before the grooming session.</p>
          <p>Pets must be up-to-date on vaccinations before the appointment.</p>
          <p>Pawpoint reserves the right to refuse service if a pet is aggressive or poses a safety risk.</p>
          
          <h3>5. Liability Disclaimer</h3>
          <p>Pawpoint is not responsible for unforeseen reactions, allergies, or pet stress resulting from grooming.</p>
          <p>We take every precaution to ensure pet safety, but owners assume full responsibility for any risks.</p>
          <p>Pawpoint is not liable for pre-existing conditions that may be exacerbated by grooming.</p>
          
          <h3>6. Privacy & Data Usage</h3>
          <p>By using our services, customers agree to our Privacy Policy regarding data collection and usage.</p>
          
          <h3>7. Website Usage</h3>
          <p>Users must not engage in fraudulent or harmful activities when interacting with our website.</p>
          <p>We may update website content and policies without prior notice.</p>
          
          <h3>8. Changes to Terms</h3>
          <p>We may modify these Terms and Conditions periodically. Updates will be posted with an effective date.</p>
          
          <h3>9. Contact Us</h3>
          <p>For any questions regarding these terms, please contact us:</p>
          <p>Pawpoint Grooming Services<br />
          UPS V, Parañaque City<br />
          <a href="mailto:pawpointt@gmail.com">pawpointt@gmail.com</a><br />
          +63 956 2775 784</p>
        </div>
      </div>
    </div>
  );

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>PawPoint</h3>
          <p>Your trusted partner in pet care. We provide professional grooming services to keep your furry friends happy and healthy.</p>
          <div className="social-links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
              <FaFacebook />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
              <FaTwitter />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              <FaInstagram />
            </a>
          </div>
        </div>

        <div className="footer-section">
          <h3>Contact Info</h3>
          <ul className="contact-info">
            <li>
              <FaMapMarkerAlt />
              <span>UPS V, Parañaque City</span>
            </li>
            <li>
              <FaPhone />
              <span>+63 956 2775 784</span>
            </li>
            <li>
              <FaEnvelope />
              <span><a href="mailto:pawpointt@gmail.com">pawpointt@gmail.com</a></span>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-links">
          <button onClick={() => setShowPrivacyModal(true)} className="footer-link">Privacy Policy</button>
          <span className="divider">|</span>
          <button onClick={() => setShowTermsModal(true)} className="footer-link">Terms & Conditions</button>
        </div>
        <p>&copy; {new Date().getFullYear()} PawPoint. All rights reserved.</p>
      </div>

      {showPrivacyModal && <PrivacyModal />}
      {showTermsModal && <TermsModal />}
    </footer>
  );
};

export default Footer;