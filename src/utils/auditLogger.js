import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Logs an audit trail action to Firestore.
 *
 * @param {Object} params
 * @param {string|null} params.userId - The user's UID (or null for failed logins).
 * @param {string|null} params.userEmail - The user's email (or attempted email for failed logins).
 * @param {string} params.action - The action type (e.g., 'LOGIN', 'FAILED_LOGIN', 'BOOK_APPOINTMENT', etc.).
 * @param {Object|string|null} [params.details] - Optional details about the action (e.g., pet info, appointment info).
 * @param {string|null} [params.ipAddress] - Optional IP address of the user.
 * @param {string} [params.userType] - Type of user ('admin', 'customer', 'staff').
 * @param {string} [params.resourceId] - ID of the resource being modified (appointment ID, pet ID, etc.).
 * @param {string} [params.resourceType] - Type of resource ('appointment', 'pet', 'user', 'report').
 * @param {Object} [params.changes] - Object containing before/after values for modifications.
 *
 * Usage:
 *   await logAuditTrail({
 *     userId: user.uid,
 *     userEmail: user.email,
 *     action: 'LOGIN',
 *     details: { ... },
 *     ipAddress: '...', // optional
 *     userType: 'admin',
 *     resourceId: 'appointment123',
 *     resourceType: 'appointment',
 *     changes: { before: {...}, after: {...} }
 *   });
 */
export async function logAuditTrail({
  userId,
  userEmail,
  action,
  details = null,
  ipAddress = null,
  userType = 'customer',
  resourceId = null,
  resourceType = null,
  changes = null,
}) {
  try {
    await addDoc(collection(db, 'userAuditTrail'), {
      userId: userId || null,
      userEmail: userEmail || null,
      action,
      details: details || null,
      timestamp: serverTimestamp(),
      ipAddress: ipAddress || null,
      userType,
      resourceId,
      resourceType,
      changes,
    });
  } catch (error) {
    console.error('Failed to log audit trail:', error);
  }
}

/**
 * Helper function to get client IP address
 */
export const getClientIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error fetching IP address:', error);
    return null;
  }
};

/**
 * Predefined action types for consistency
 */
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  FAILED_LOGIN: 'FAILED_LOGIN',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  
  // Pet Management
  PET_CREATED: 'PET_CREATED',
  PET_UPDATED: 'PET_UPDATED',
  PET_DELETED: 'PET_DELETED',
  
  // Appointment Management
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED',
  
  // Admin/Staff Actions
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_LOGOUT: 'ADMIN_LOGOUT',
  MANUAL_BOOKING_EDIT: 'MANUAL_BOOKING_EDIT',
  CUSTOMER_PROFILE_EDIT: 'CUSTOMER_PROFILE_EDIT',
  REPORT_DOWNLOAD: 'REPORT_DOWNLOAD',
  REPORT_PRINT: 'REPORT_PRINT',
  DASHBOARD_ACCESS: 'DASHBOARD_ACCESS',
  
  // User Management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  
  // System Actions
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_IMPORT: 'DATA_IMPORT',
}; 