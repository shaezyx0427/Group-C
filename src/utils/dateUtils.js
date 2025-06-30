export const parseAppointmentDateTime = (date, time) => {
  if (!date) return { start: null, end: null };
  let start = new Date(date);
  let end = new Date(date);
  if (time && time.includes(' - ')) {
    const [startTime, endTime] = time.split(' - ');
    start = new Date(`${date}T${convertTo24Hour(startTime)}`);
    end = new Date(`${date}T${convertTo24Hour(endTime)}`);
  } else {
    start = new Date(`${date}T09:00:00`);
    end = new Date(`${date}T10:00:00`);
  }
  return { start, end };
};

export const convertTo24Hour = (timeStr) => {
  if (!timeStr) return '09:00:00';
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  if (modifier === 'PM' && hours !== '12') hours = String(Number(hours) + 12);
  if (modifier === 'AM' && hours === '12') hours = '00';
  return `${hours.padStart(2, '0')}:${minutes}:00`;
};

export const parseAppointmentTime = (timeStr) => {
  if (!timeStr) return null;
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  if (modifier === 'PM' && hours !== '12') hours = String(Number(hours) + 12);
  if (modifier === 'AM' && hours === '12') hours = '00';
  return { hours: parseInt(hours), minutes: parseInt(minutes) };
};

export const formatDate = (date) => {
  if (!date) return null;
  if (typeof date === 'string') {
    return new Date(date);
  } else if (date.toDate) {
    return date.toDate();
  } else if (date instanceof Date) {
    return date;
  }
  return null;
}; 