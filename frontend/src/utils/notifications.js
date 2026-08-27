/**
 * Notification utility to track unviewed operations
 */

const STORAGE_KEY = 'unviewed_operations';

/**
 * Get all unviewed operation IDs
 */
export const getUnviewedOperations = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const operations = JSON.parse(stored);
    // Filter out operations older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return operations.filter(op => op.timestamp > thirtyDaysAgo);
  } catch (error) {
    console.error('Error getting unviewed operations:', error);
    return [];
  }
};

/**
 * Add an operation to unviewed list
 * @param {number|string} operationId - The ID of the operation
 * @param {string} type - Type of operation (e.g., 'payment_approved', 'payment_rejected')
 * @param {object} data - Additional data about the operation
 */
export const addUnviewedOperation = (operationId, type = 'operation', data = {}) => {
  try {
    const operations = getUnviewedOperations();
    const operationKey = `${type}_${operationId}`;
    
    // Check if operation already exists
    if (operations.some(op => op.id === operationKey)) {
      return;
    }
    
    operations.push({
      id: operationKey,
      operationId: operationId,
      type: type,
      timestamp: Date.now(),
      ...data
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
    
    // Dispatch event to update notification count
    window.dispatchEvent(new CustomEvent('unviewedOperationsChanged'));
  } catch (error) {
    console.error('Error adding unviewed operation:', error);
  }
};

/**
 * Mark an operation as viewed
 * @param {number|string} operationId - The ID of the operation
 * @param {string} type - Type of operation
 */
export const markOperationAsViewed = (operationId, type = 'operation') => {
  try {
    const operations = getUnviewedOperations();
    const operationKey = `${type}_${operationId}`;
    const filtered = operations.filter(op => op.id !== operationKey);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    
    // Dispatch event to update notification count
    window.dispatchEvent(new CustomEvent('unviewedOperationsChanged'));
  } catch (error) {
    console.error('Error marking operation as viewed:', error);
  }
};

/**
 * Mark all operations as viewed
 */
export const markAllOperationsAsViewed = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('unviewedOperationsChanged'));
  } catch (error) {
    console.error('Error marking all operations as viewed:', error);
  }
};

/**
 * Get count of unviewed operations
 */
export const getUnviewedOperationsCount = () => {
  return getUnviewedOperations().length;
};

/**
 * Check if an operation is unviewed
 * @param {number|string} operationId - The ID of the operation
 * @param {string} type - Type of operation
 */
export const isOperationUnviewed = (operationId, type = 'operation') => {
  const operations = getUnviewedOperations();
  const operationKey = `${type}_${operationId}`;
  return operations.some(op => op.id === operationKey);
};
