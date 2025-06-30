import React, { useState } from 'react';
import './FAQ.css';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
// import mascot from '../About/mascot.png'; // Use the same mascot if available

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqItems = [
    {
      question: "What pets do you groom?",
      answer: "We welcome both dogs and cats of all breeds and sizes!"
    },
    {
      question: "Do I need to book an appointment?",
      answer: "Yes, we recommend booking in advance to ensure your preferred time slot."
    },
    {
      question: "What products do you use?",
      answer: "We use only high-quality, pet-safe shampoos and grooming products."
    },
    {
      question: "What if my pet is afraid of grooming?",
      answer: "If your pet has anxiety, let us know! We'll tailor our approach to make their session as comfortable as possible. Some pets may feel nervous about grooming, but we're experts at creating a calm, positive experience! We use: \n• Slow, gentle handling to help pets relax.\n• Soothing techniques like pet-friendly aromatherapy and low-noise clippers.\n• Breaks if needed to prevent stress."
    },
    {
      question: "How do I prepare my pet for grooming?",
      answer: "At PawPoint, we strive to make every visit enjoyable for both pets and owners! \nWould you like to add any personalized details about PawPoint's approach or specialty services? I can fine-tune this further!"
    }
  ];

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="faq-section">
      <div className="faq-wavy-divider"></div>
      <div className="faq-container">
        <h2 className="faq-title">Frequently Asked Questions 🐾</h2>
        <div className="faq-content">
          {faqItems.map((item, index) => (
            <div 
              key={index} 
              className={`faq-card ${openIndex === index ? 'active' : ''}`}
            >
              <button 
                className="faq-question"
                onClick={() => toggleAccordion(index)}
              >
                <span>{item.question}</span>
                {openIndex === index ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              {openIndex === index && (
                <div className="faq-answer">
                  <div className="faq-answer-inner">
                    <span className="faq-answer-icon">{index % 2 === 0 ? '🐾' : '❤️'}</span>
                    {item.answer.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ; 