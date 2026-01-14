import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, CheckCircle, Circle, Folder, Tag, Square, CheckSquare, Calendar, X, Pencil, Save } from "lucide-react";
import { useToast } from "../../hooks/useToast";
import "./TaskDetail.css"

const TaskDetail = ({ task: taskdata, onToggleSubtask, onEdit, onBack, showBackButton = false }) => {

    const textareaRef = useRef(null);
    const [task, setTask] = useState(taskdata || {});
    const [subtasks, setSubtasks] = useState([]);
    const { showToast } = useToast();
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState({});

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
    }, [editing]);

    const handleSaveEdit = async (e) => {
        if (!editData) return;
        try {
            const API_URL = (
                process.env.REACT_APP_API_URL || "http://localhost:3001"
            ).replace(/\/+$/, "");
            const token = localStorage.getItem("accessToken");

            const taskId = task.task_id ?? task.id ?? task._id;
            if (!taskId) return;

            const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(editData),
            });

            if (res.ok) {
                const data = await res.json();
                const updatedTask = data.task || { ...task, ...editData };
                setTask(updatedTask);
                onEdit?.(updatedTask);
            } else {
                showToast("Failed to edit the task", "error");
            }
        } catch (err) {
            console.error("Error editing the task:", err);
            showToast("Failed to edit the task", "error");
        } finally {
            setEditing(false);
        }
    }

    const markSubtaskCompleted = async (subtask) => {
        if (!subtask) return;
        try {
            console.log(JSON.stringify(subtask));
            const API_URL = (
                process.env.REACT_APP_API_URL || "http://localhost:3001"
            ).replace(/\/+$/, "");
            const token = localStorage.getItem("accessToken");

            const rawSubtaskId = subtask.subtask_id ?? subtask.id ?? subtask._id;
            const subtaskId = Number.parseInt(rawSubtaskId, 10);
            if (!Number.isInteger(subtaskId)) {
                showToast("Invalid subtask id", "error");
                return;
            }

            const currentStatus = subtask.is_completed;
            const nextStatus = !currentStatus;

            const res = await fetch(`${API_URL}/api/tasks/subtasks/${subtaskId}/toggle`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                }
            });

            if (res.ok) {
                setSubtasks((prev) =>
                    prev.map((t) => {
                        const rawId = t.subtask_id ?? t.id ?? t._id;
                        const id = Number.parseInt(rawId, 10);
                        return id === subtaskId ? { ...t, is_completed: nextStatus } : t;
                    })
                );

                const rawTaskId = task?.task_id ?? task?.id ?? task?._id;
                const taskId = Number.parseInt(rawTaskId, 10);
                if (typeof onToggleSubtask === "function" && Number.isInteger(taskId)) {
                    onToggleSubtask(taskId, subtaskId, nextStatus);
                }
            } else {
                showToast("Failed to mark subtask as completed", "error");
            }
        } catch (err) {
            console.error("Error marking subtask as completed:", err);
            showToast("Failed to mark subtask as completed", "error");
        }
    };

    useEffect(() => {
        if (!taskdata) return;
        setTask(taskdata);
        setEditData(taskdata);
        setSubtasks(taskdata.subtasks || []);
    }, [taskdata]);

    return (
        <div className="task-detail">
            {showBackButton && (
                <button className="task-detail-back-btn" onClick={onBack}>
                    <ArrowLeft size={20} />
                    <span>Back to Tasks</span>
                </button>
            )}
            <div className="task-detail-header">
                <div>
                    {editing ? (
                        <input
                            type="text"
                            name="title"
                            className="input-field"
                            value={editData.title}
                            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                            style={{ marginBottom: "10px" }}
                        />
                    )
                        :
                        (
                            <h1 className="task-detail-title">{task.title}</h1>
                        )
                    }
                    <div className="task-detail-badges">
                        <span className={`task-detail-status ${task.status === 'completed' ? 'completed' : 'pending'}`}>
                            {task.status === 'completed' ? (
                                <>
                                    <CheckCircle size={14} />
                                    Completed
                                </>
                            ) : (
                                <>
                                    <Circle size={14} />
                                    {task.status || 'Pending'}
                                </>
                            )}
                        </span>
                        {task.priority && (
                            <span className={`task-detail-priority priority-${task.priority}`}>
                                {task.priority}
                            </span>
                        )}
                    </div>
                </div>

                <div className="task-header-actions">
                    {editing ? (
                        <>
                            <button className="task-header-edit-save"
                                onClick={(e) => handleSaveEdit(e)}
                            >
                                <Save size={20} className="task-edit-save-icon"
                                />
                            </button>
                            <div className="task-header-edit-cancel" onClick={() => setEditing(false)}>
                                <X size={20} className="task-edit-cancel-icon" />
                            </div>
                        </>
                    ) : (
                        <div className="task-edit" onClick={() => setEditing(true)}>
                            <Pencil size={20} className="task-edit-icon" />
                        </div>
                    )}
                </div>
            </div>

            {/* Category & Tags */}
            {(task.category || (task.tags && task.tags.length > 0)) && (
                <div className="task-detail-tags-section">
                    {task.category && (
                        <div className="task-detail-category">
                            <Folder size={14} />
                            <span>{task.category}</span>
                        </div>
                    )}
                    {task.tags && task.tags.length > 0 && (
                        <div className="task-detail-tags">
                            <Tag size={14} />
                            {task.tags.map((tag, index) => (
                                <span key={index} className="task-tag">
                                    {typeof tag === 'string' ? tag : tag.tag_name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {task.description && (
                editing ? (
                    <textarea
                        type="text"
                        name="description"
                        className="input-field"
                        ref={textareaRef}
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        style={{ resize: "none", overflow: "hidden", marginBottom: "10px" }}
                    />
                ) : (
                    <p className="task-detail-description">{task.description}</p>
                )
            )}

            {/* Subtasks Checklist */}
            {subtasks && subtasks.length > 0 && (
                <div className="task-detail-subtasks">
                    <h3 className="subtasks-title">Checklist</h3>
                    <div className="subtasks-list">
                        {subtasks.map((subtask, index) => (
                            <div
                                key={subtask.subtask_id || index}
                                className={`subtask-item ${subtask.is_completed ? 'completed' : ''}`}
                            >
                                <div className="subtask-checkbox" onClick={() => markSubtaskCompleted(subtask)}>
                                    {subtask.is_completed ? (
                                        <CheckSquare size={18} className="subtask-checkbox checked" />
                                    ) : (
                                        <Square size={18} className="subtask-checkbox" />
                                    )}
                                </div>
                                <span className="subtask-title">{subtask.title}</span>
                            </div>
                        ))}
                    </div>
                    <div className="subtasks-progress">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{
                                    width: `${(subtasks.filter(s => s.is_completed).length / subtasks.length) * 100}%`
                                }}
                            />
                        </div>
                        <span className="progress-text">
                            {subtasks.filter(s => s.is_completed).length} / {subtasks.length} completed
                        </span>
                    </div>
                </div>
            )}

            <div className="task-detail-meta">
                {task.due_date && (
                    <div className="task-meta-item">
                        <Calendar size={16} className="icon" />
                        <span className="label">Due Date:</span>
                        <span className="value">{new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                )}
                {task.created_at && (
                    <div className="task-meta-item">
                        <Calendar size={16} className="icon" />
                        <span className="label">Created:</span>
                        <span className="value">{new Date(task.created_at).toLocaleDateString()}</span>
                    </div>
                )}
            </div>
        </div>
    );
};


export default TaskDetail;