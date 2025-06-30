import React from 'react';
import './Service.css';
import { 
  FaShower, 
  FaCut, 
  FaPaw, 
  FaTooth, 
  FaHeadphonesAlt,
  FaDog,
  FaCat,
  FaHeart,
  FaStar,
  FaMagic,
  FaCalendar
} from 'react-icons/fa';

const Service = () => {
  const services = [
    {
      title: "Bath and Blowdry",
      icon: <FaShower />,
      secondaryIcon: <FaDog />,
      description: "Complete spa treatment including premium hypoallergenic shampoo, deep conditioning, gentle blowdry, and light brushing. Perfect for maintaining a clean and healthy coat.",
      prices: [
        { size: "Small", price: 300 },
        { size: "Medium", price: 400 },
        { size: "Large", price: 500 }
      ]
    },
    {
      title: "Basic Haircut and Trim",
      icon: <FaCut />,
      secondaryIcon: <FaMagic />,
      description: "Professional grooming service tailored to your pet's breed standards. Includes full body trim, face shaping, and sanitary trim. We ensure your pet looks their best while staying comfortable.",
      prices: [
        { size: "Small", price: 300 },
        { size: "Medium", price: 400 },
        { size: "Large", price: 500 }
      ]
    },
    {
      title: "Paw Pad Care",
      icon: <FaPaw />,
      secondaryIcon: <FaHeart />,
      description: "Specialized treatment for your pet's paws. Includes thorough cleaning, moisturizing treatment, and paw pad inspection. Helps prevent cracks and keeps paws healthy and soft.",
      price: 100
    },
    {
      title: "Nail Trimming",
      icon: <FaCut />,
      secondaryIcon: <FaStar />,
      description: "Professional nail care service with gentle trimming and filing. We ensure your pet's nails are at the perfect length for comfort and health. Includes paw inspection and light massage.",
      price: 100
    },
    {
      title: "Ear Cleaning",
      icon: <FaHeadphonesAlt />,
      secondaryIcon: <FaCat />,
      description: "Comprehensive ear care including gentle cleaning, inspection for any issues, and treatment if needed. Helps prevent infections and maintains ear health. Suitable for all breeds.",
      price: 100
    },
    {
      title: "Teeth Cleaning",
      icon: <FaTooth />,
      secondaryIcon: <FaHeart />,
      description: "Professional dental care service with gentle cleaning, plaque removal, and fresh breath treatment. Helps maintain oral health and prevent dental issues. Includes dental health check.",
      price: 100
    }
  ];

  return (
    <section id="service" className="service-section">
      <div className="service-container">
        <h2 className="service-title">Our Services</h2>
        <p className="service-subtitle">
          Treat your furry friend to our premium grooming services. Each service is performed with love and care by our certified pet stylists, ensuring your pet looks and feels their best.
        </p>
        
        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="service-card">
              <div className="service-icons">
                <div className="primary-icon">{service.icon}</div>
                <div className="secondary-icon">{service.secondaryIcon}</div>
              </div>
              <h3 className="service-name">{service.title}</h3>
              <p className="service-description">{service.description}</p>
              {service.prices ? (
                <div className="price-list">
                  {service.prices.map((price, idx) => (
                    <div key={idx} className="price-item">
                      <span className="size">{price.size}</span>
                      <span className="price">₱{price.price}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="single-price">
                  <span className="price">₱{service.price}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Service; 