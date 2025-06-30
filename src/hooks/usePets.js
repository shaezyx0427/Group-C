import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const usePets = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    const petsRef = collection(db, 'pets');
    const q = query(
      petsRef,
      where('userId', '==', userId)
      // Temporarily removed status and orderBy for index testing
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const petsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPets(petsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching pets:', error);
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { pets, loading, error };
};