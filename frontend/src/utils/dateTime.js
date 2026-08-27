/**
 * Date and Time Utility Functions
 * Provides consistent date/time formatting across the system
 * Uses user preferences from localStorage
 */

/**
 * Get date format preference from localStorage
 * @returns {string} Date format (DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD)
 */
const getDateFormat = () => {
  return localStorage.getItem('systemDateFormat') || 'DD/MM/YYYY';
};

/**
 * Get time format preference from localStorage
 * @returns {string} Time format (24h or 12h)
 */
const getTimeFormat = () => {
  return localStorage.getItem('systemTimeFormat') || '24h';
};

/**
 * Format date according to user preference
 * @param {Date} date - Date object
 * @param {string} format - Date format (DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD)
 * @returns {string} Formatted date string
 */
const formatDateByPreference = (date, format) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
    default:
      return `${day}/${month}/${year}`;
  }
};

/**
 * Format time according to user preference
 * @param {Date} date - Date object
 * @param {string} format - Time format (24h or 12h)
 * @returns {string} Formatted time string
 */
const formatTimeByPreference = (date, format) => {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  if (format === '12h') {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } else {
    // 24h format
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
};

/**
 * Format date and time according to user preferences
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid date
    
    const dateFormat = getDateFormat();
    const timeFormat = getTimeFormat();
    
    const formattedDate = formatDateByPreference(date, dateFormat);
    const formattedTime = formatTimeByPreference(date, timeFormat);
    
    return `${formattedDate} ${formattedTime}`;
  } catch (error) {
    return dateString;
  }
};

/**
 * Format date only according to user preference
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const dateFormat = getDateFormat();
    return formatDateByPreference(date, dateFormat);
  } catch (error) {
    return dateString;
  }
};

/**
 * Format time only according to user preference
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted time string
 */
export const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const timeFormat = getTimeFormat();
    return formatTimeByPreference(date, timeFormat);
  } catch (error) {
    return dateString;
  }
};

/**
 * Get current date and time formatted according to user preferences
 * @returns {string} Current date and time
 */
export const getCurrentDateTime = () => {
  return formatDateTime(new Date());
};

/**
 * Get current date formatted according to user preferences
 * @returns {string} Current date
 */
export const getCurrentDate = () => {
  return formatDate(new Date());
};

/**
 * Get current time formatted according to user preferences
 * @returns {string} Current time
 */
export const getCurrentTime = () => {
  return formatTime(new Date());
};
