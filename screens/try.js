// Add this CSS either in a separate stylesheet or in a <style> tag in your component
// Here's the recommended approach - add a style tag at the top of your component or in your main CSS file:

const footerStyles = `
  .footer-section {
    background: #004d2c;
    padding: 40px 20px;
    text-align: center;
  }

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 30px;
  }

  .contact-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .footer-address,
  .footer-contact {
    color: #fff;
    font-size: 14px;
    margin: 0;
  }

  .copyright-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .copyright-title {
    color: #fff;
    font-size: 24px;
    font-weight: bold;
    margin: 0;
  }

  .copyright-text {
    color: #d0d0d0;
    font-size: 13px;
    margin: 0;
  }

  /* Tablet and larger screens */
  @media (min-width: 768px) {
    .footer-content {
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
    }

    .contact-info {
      align-items: flex-start;
      text-align: left;
    }

    .copyright-info {
      align-items: flex-end;
      text-align: right;
    }
  }
`;

// Then in your component, replace the footer section with this structure:
// (This is just the HTML structure - the styles above handle the responsive layout)

// EXAMPLE IMPLEMENTATION:
// Add this at the top of your file or in your main App component:
useEffect(() => {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = footerStyles;
  document.head.appendChild(styleTag);
  return () => document.head.removeChild(styleTag);
}, []);

// Then use these className attributes in your footer JSX:
/*
<div className="footer-section">
  <div className="footer-content">
    <div className="contact-info">
      <p className="footer-address">1975 Corner Donada & San Juan St.,</p>
      <p className="footer-address">Pasay City, 1300</p>
      <p className="footer-contact">Phone: (63 2) 525-9191 to 9198</p>
      <p className="footer-contact">Email: info@mac.edu.ph</p>
    </div>
    <div className="copyright-info">
      <p className="copyright-title">EnrollEase</p>
      <p className="copyright-text">© Copyright EnrollEase All Rights Reserved</p>
    </div>
  </div>
</div>
*/

// ALTERNATIVE: If you prefer inline styles, use this:
const inlineFooterStyles = {
  footerSection: {
    background: '#004d2c',
    padding: '40px 20px',
    textAlign: 'center',
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px',
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  footerText: {
    color: '#fff',
    fontSize: '14px',
    margin: '0',
  },
  copyrightInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  copyrightTitle: {
    color: '#fff',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0',
  },
  copyrightText: {
    color: '#d0d0d0',
    fontSize: '13px',
    margin: '0',
  },
  // Responsive styles would need to be handled with window.matchMedia or a responsive hook
};

// Usage with inline styles:
/*
<div style={inlineFooterStyles.footerSection}>
  <div style={inlineFooterStyles.footerContent}>
    <div style={inlineFooterStyles.contactInfo}>
      <p style={inlineFooterStyles.footerText}>1975 Corner Donada & San Juan St.,</p>
      <p style={inlineFooterStyles.footerText}>Pasay City, 1300</p>
      <p style={inlineFooterStyles.footerText}>Phone: (63 2) 525-9191 to 9198</p>
      <p style={inlineFooterStyles.footerText}>Email: info@mac.edu.ph</p>
    </div>
    <div style={inlineFooterStyles.copyrightInfo}>
      <p style={inlineFooterStyles.copyrightTitle}>EnrollEase</p>
      <p style={inlineFooterStyles.copyrightText}>© Copyright EnrollEase All Rights Reserved</p>
    </div>
  </div>
</div>
*/

export { footerStyles, inlineFooterStyles };