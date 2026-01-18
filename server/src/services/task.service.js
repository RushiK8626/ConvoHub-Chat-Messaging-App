const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createTask = async (userId, taskData) => {
    const { title, description, status, priority, due_date, category } = taskData || {};
    const tags = Array.isArray(taskData?.tags) ? taskData.tags : [];
    const subtasks = Array.isArray(taskData?.subtasks) ? taskData.subtasks : [];

    if (!title || !String(title).trim()) {
        throw new Error('Title is required');
    }

    const task = await prisma.task.create({
        data: {
            user_id: userId,
            title: String(title).trim(),
            description: description != null ? String(description) : null,
            status: status || 'pending',
            priority: priority || 'medium',
            due_date: due_date ? new Date(due_date) : null,
            category: category != null ? String(category) : null,
            tags: tags.length > 0 ? {
                create: tags.map(tag => ({ tag_name: String(tag) }))
            } : undefined,
            subtasks: subtasks.length > 0 ? {
                create: subtasks.map((subtask, index) => ({
                    title: subtask?.title ? String(subtask.title) : String(subtask),
                    order: Number.isInteger(subtask?.order) ? subtask.order : index
                }))
            } : undefined
        },
        include: {
            tags: true,
            subtasks: { orderBy: { order: 'asc' } }
        }
    });
    return task;
}

const getUserTasks = async (userId, filters = {}) => {
    const { status, priority, category, search, due_date, page = 1, limit = 20 } = filters;

    const where = {
        user_id: userId,
        ...(status && { status }),
        ...(priority && { priority }),
        ...(category && { category }),
        ...(search && {
            OR: [
                { title: { contains: search } },
                { description: { contains: search } }
            ]
        }),
        ...(due_date && {
            due_date: {
                gte: new Date(due_date),
                lt: new Date(new Date(due_date).getTime() + 24 * 60 * 60 * 1000)
            }
        })
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tasks, total] = await Promise.all([
        prisma.task.findMany({
            where,
            include: {
                tags: true,
                subtasks: { orderBy: { order: 'asc' } }
            },
            orderBy: [
                { status: 'asc' },
                { due_date: 'asc' },
                { priority: 'desc' },
                { created_at: 'desc' }
            ],
            skip,
            take: parseInt(limit)
        }),
        prisma.task.count({ where })
    ]);

    return {
        tasks,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        }
    };
}

const updateTask = async (taskId, userId, updateData) => {
    const task = await prisma.task.findFirst({
        where: {
            task_id: taskId,
            user_id: userId
        }
    });

    if (!task) {
        throw new Error('Task not found or no permission');
    }

    const { title, description, status, priority, due_date, category, tags, completed_at } = updateData;

    const updates = {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(due_date !== undefined && { due_date: due_date ? new Date(due_date) : null }),
        ...(category !== undefined && { category })
    };

    if (status === 'completed' && task.status !== 'completed') {
        updates.completed_at = new Date();
    } else if (status && status !== 'completed') {
        updates.completed_at = null;
    }

    const updatedTask = await prisma.task.update({
        where: { task_id: taskId },
        data: updates,
        include: {
            tags: true,
            subtasks: { orderBy: { order: 'asc' } }
        }
    });

    if (tags !== undefined) {
        await prisma.taskTag.deleteMany({ where: { task_id: taskId } });
        if (tags.length > 0) {
            await prisma.taskTag.createMany({
                data: tags.map(tag => ({ task_id: taskId, tag_name: tag }))
            });
        }
    }

    return updatedTask;
}

const deleteTask = async (taskId, userId) => {
    const task = await prisma.task.findFirst({
        where: { task_id: taskId, user_id: userId }
    });

    if (!task) {
        throw new Error('Task not found or no permission');
    }

    await prisma.task.delete({ where: { task_id: taskId } });
    return { success: true };
}


const toggleSubtask = async (subtaskId, userId) => {
    const subtask = await prisma.subtask.findFirst({
        where: {
            subtask_id: subtaskId,
            task: { is: { user_id: userId } }
        }
    });

    if (!subtask) {
        throw new Error('Subtask not found');
    }

    const updated = await prisma.subtask.update({
        where: { subtask_id: subtaskId },
        data: {
            is_completed: !subtask.is_completed,
            completed_at: !subtask.is_completed ? new Date() : null
        }
    });

    return updated;
}

const addSubtask = async (taskId, userId, subtaskData) => {
    const task = await prisma.task.findFirst({
        where: { task_id: taskId, user_id: userId }
    });

    if (!task) {
        throw new Error('Task not found');
    }

    const subtask = await prisma.subtask.create({
        data: {
            task_id: taskId,
            title: subtaskData.title,
            order: subtaskData.order || 0
        }
    });

    return subtask;
}

module.exports = {
    createTask,
    getUserTasks,
    updateTask,
    deleteTask,
    toggleSubtask,
    addSubtask,
};