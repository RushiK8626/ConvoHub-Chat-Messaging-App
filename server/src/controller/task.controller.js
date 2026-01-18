const taskService = require('../services/task.service');

exports.createTask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const task = await taskService.createTask(userId, req.body);
        res.status(201).json({ success: true, task });
    } catch (error) {
        console.error('Error creating task: ', error);
        res.status(500).json({ error: error.message || 'Failed to create task' });
    }
};

exports.getTasks = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const tasks = await taskService.getUserTasks(userId, req.query);
        res.status(200).json({ success: true, ...tasks });
    } catch (error) {
        console.error('Error fetching tasks: ', error);
        res.status(500).json({ error: error.message || 'Failed to fetch tasks' });
    }
};

exports.updateTask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const taskId = parseInt(req.params.id);
        const updated = await taskService.updateTask(taskId, userId, req.body);
        res.json({ success: true, task: updated });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(error.message.includes('not found') ? 404 : 500)
            .json({ error: error.message || 'Failed to update task' });
    }
}

exports.deleteTask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const taskId = parseInt(req.params.id);
        await taskService.deleteTask(taskId, userId);
        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(error.message.includes('not found') ? 404 : 500)
            .json({ error: error.message || 'Failed to delete task' });
    }
}

exports.toggleSubtask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const subtaskId = Number.parseInt(req.params.subtaskId, 10);
        if (!Number.isInteger(subtaskId)) {
            return res.status(400).json({ error: 'Invalid subtaskId' });
        }
        const subtask = await taskService.toggleSubtask(subtaskId, userId);
        res.json({ success: true, subtask });
    } catch (error) {
        console.error('Error toggling subtask:', error);
        const message = error?.message || 'Failed to toggle subtask';
        const lowered = message.toLowerCase();
        const status = lowered.includes('not found') ? 404 : lowered.includes('invalid') ? 400 : 500;
        res.status(status).json({ error: message });
    }
};

exports.addSubtask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const taskId = parseInt(req.params.id);
        const subtask = await taskService.addSubtask(taskId, userId, req.body);
        res.status(201).json({ success: true, subtask });
    } catch (error) {
        console.error('Error adding subtask:', error);
        res.status(500).json({ error: error.message || 'Failed to add subtask' });
    }
};