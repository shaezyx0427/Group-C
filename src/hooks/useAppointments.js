import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { formatDate } from '../utils/dateUtils';

export const useAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('userId', '==', user.uid),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const appointmentList = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              date: formatDate(data.date)
            };
          })
          .filter(apt => apt.status !== 'cancelled' && new Date(apt.date) >= now);

        setAppointments(appointmentList);
      } catch (error) {
        console.error('Error processing appointments:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { appointments, loading };
};