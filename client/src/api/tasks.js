import axios from 'axios';

// Target Node.js Express backend directly on port 5001
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://kanban-1-ftyd.onrender.com/api';

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Fetch all tasks, optionally filtered by status
 * @param {string|null} status - e.g. 'TODO', 'IN_PROGRESS', 'DONE', 'APPROVED'
 */
export const fetchTasks = async (status = null) => {
  const params = status ? { status } : {};
  const { data } = await API.get('/tasks', { params });
  return data.tasks || [];
};

/**
 * Create a new task
 * @param {{ title, description, status, priority, assignee }} taskData
 */
export const createTask = async (taskData) => {
  const { data } = await API.post('/tasks', taskData);
  return data.task;
};

/**
 * Update an existing task
 * @param {string} id - Task MongoDB _id
 * @param {object} updates - Fields to update
 */
export const updateTask = async (id, updates) => {
  const { data } = await API.put(`/tasks/${id}`, updates);
  return data.task;
};

/**
 * Delete a task
 * @param {string} id - Task MongoDB _id
 */
export const deleteTask = async (id) => {
  const { data } = await API.delete(`/tasks/${id}`);
  return data;
};
