import React from 'react';
import './Gallery.css';
import gallery1 from './gallery1.jpg';
import gallery2 from './gallery2.jpg';
import gallery3 from './gallery3.jpg';
import gallery4 from './gallery4.jpg';
import gallery5 from './gallery5.jpg';
import gallery6 from './gallery6.jpg';

const Gallery = () => {
  const galleryImages = [
    { id: 1, src: gallery1, alt: 'Gallery Image 1' },
    { id: 2, src: gallery2, alt: 'Gallery Image 2' },
    { id: 3, src: gallery3, alt: 'Gallery Image 3' },
    { id: 4, src: gallery4, alt: 'Gallery Image 4' },
    { id: 5, src: gallery5, alt: 'Gallery Image 5' },
    { id: 6, src: gallery6, alt: 'Gallery Image 6' }
  ];

  return (
    <section id="gallery" className="gallery-section">
      <div className="gallery-container">
        <h2 className="gallery-title">Our Gallery 🐾</h2>
        <p className="gallery-subtitle">Take a peek at our happy furry clients</p>
        
        <div className="gallery-grid">
          {galleryImages.map((image) => (
            <div key={image.id} className="gallery-item">
              <img 
                src={image.src} 
                alt={image.alt} 
                className="gallery-image"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery; 