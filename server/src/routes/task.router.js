const express = require('express');
const router = express.Router();
const taskController = require('../controller/task.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);

// Task operations
router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Subtask operations
router.post('/:id/subtasks', taskController.addSubtask);
router.patch('/subtasks/:subtaskId/toggle', taskController.toggleSubtask);

module.exports = router;