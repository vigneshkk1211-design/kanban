const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// GET /api/tasks — fetch all tasks (optionally filtered by status)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      const statusMap = {
        todo: 'TODO',
        in_progress: 'IN_PROGRESS',
        done: 'DONE',
        approved: 'APPROVED',
        TODO: 'TODO',
        IN_PROGRESS: 'IN_PROGRESS',
        DONE: 'DONE',
        APPROVED: 'APPROVED',
      };
      const mappedStatus = statusMap[req.query.status];
      if (mappedStatus) filter.status = mappedStatus;
    }

    const tasks = await Task.find(filter).sort({ status: 1, order: 1, createdAt: 1 });
    res.json({ success: true, tasks });
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching tasks' });
  }
});

// GET /api/tasks/:id — fetch single task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (error) {
    console.error('GET /api/tasks/:id error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/tasks — create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, status, priority, assignee } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    // Auto-assign order at end of column
    const count = await Task.countDocuments({ status: status || 'TODO' });

    const task = new Task({
      title: title.trim(),
      description: description?.trim() || '',
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      assignee: assignee?.trim() || '',
      order: count,
    });

    const saved = await task.save();
    res.status(201).json({ success: true, task: saved });
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    res.status(500).json({ success: false, message: 'Server error creating task' });
  }
});

// PUT /api/tasks/:id — update task (status, title, description, priority, assignee, order)
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;

    // Validate status if being updated
    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE', 'APPROVED'];
    if (updates.status && !validStatuses.includes(updates.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (error) {
    console.error('PUT /api/tasks/:id error:', error);
    res.status(500).json({ success: false, message: 'Server error updating task' });
  }
});

// DELETE /api/tasks/:id — delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/tasks/:id error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting task' });
  }
});

module.exports = router;
