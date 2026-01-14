import './AddTaskModal.css';
import React, { useState, useRef } from "react";
import { X, Plus, Calendar } from 'lucide-react'
import ContextMenu from '../../components/common/ContextMenu';
import useContextMenu from "../../hooks/useContextMenu";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const AddTaskModal = ({ isOpen, onClose, onAddTask }) => {
    const priorityContextMenu = useContextMenu();
    const priorityItems = [
        {
            id: 'priority-low',
            label: 'Low',
            onClick: () => { setPriority('low'); priorityContextMenu.closeMenu(); }
        },
        {
            id: 'priority-medium',
            label: 'Medium',
            color: 'warning',
            onClick: () => { setPriority('medium'); priorityContextMenu.closeMenu(); }
        },
        {
            id: 'priority-high',
            label: 'High',
            color: 'danger',
            onClick: () => { setPriority('high'); priorityContextMenu.closeMenu(); }
        }
    ];

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [duedate, setDuedate] = useState(null);
    const [category, setCategory] = useState("");
    const [priority, setPriority] = useState("")
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState("");
    const [subtasks, setSubtasks] = useState([]);
    const [subtaskInput, setSubtaskInput] = useState("");
    const datePickerRef = useRef(null);

    if (!isOpen) return null;

    const handleTagKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();

            const value = tagInput.trim();
            if (!value) return;

            // prevent duplicates
            if (tags.includes(value)) return;

            setTags([...tags, value]);
            setTagInput("");
        }
    };

    const removeTag = (indexToRemove) => {
        setTags(tags.filter((_, index) => index !== indexToRemove));
    };

    const addSubtask = () => {
        const value = subtaskInput.trim();
        if (!value) return;
        if (subtasks.includes(value)) return;
        setSubtasks([...subtasks, value]);
        setSubtaskInput("");
    };

    const handleSubtaskKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addSubtask();
        }
    };

    const handleRemoveSubtask = (indexToRemove) => {
        setSubtasks(subtasks.filter((_, index) => index !== indexToRemove));
    }

    const handleAddNewTask = async () => {
        try {
            const API_URL = (
                process.env.REACT_APP_API_URL || "http://localhost:3001"
            ).replace(/\/+$/, "");

            let token = localStorage.getItem("accessToken");

            const payload = {
                title: title.trim(),
                description: description.trim(),
                ...(priority.trim() && { priority: priority.trim() }),
                ...(duedate && { due_date: new Date(duedate).toISOString() }),
                ...(category.trim() && { category: category.trim() }),
                ...(tags.length > 0 && { tags }),
                ...(subtasks.length > 0 && {
                    subtasks: subtasks.map((t, index) => ({ title: t, order: index }))
                })
            };

            const res = await fetch(`${API_URL}/api/tasks`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to create task");
            }
            else {
                const data = await res.json();
                onAddTask?.(data.task);
            }
            onClose && onClose();
        } catch (error) {
            console.error("Error creating new task:", error);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container">

                {/* Header */}
                <div className="modal-header">
                    <h2>Add New Task</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div className="modal-body">

                    {/* Required */}
                    <div className="form-group">
                        <label>Title *</label>
                        <input
                            type="text"
                            placeholder="Enter task title"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                            }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Description *</label>
                        <textarea
                            rows="3"
                            placeholder="Short description of the task"
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                            }}
                        />
                    </div>

                    {/* Optional Section */}
                    <div className="optional-section">

                        {/* Priority */}
                        <div className="form-group">
                            <label>Priority</label>
                            <button onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                priorityContextMenu.setMenu({
                                    isOpen: true,
                                    x: rect.left,
                                    y: rect.bottom,
                                    position: 'bottom-left',
                                });
                            }} className="priority">
                                {priority ? priority : "Select the priority"}
                            </button>
                        </div>

                        <ContextMenu
                            isOpen={priorityContextMenu.isOpen}
                            x={priorityContextMenu.x}
                            y={priorityContextMenu.y}
                            items={priorityItems}
                            onClose={priorityContextMenu.closeMenu}
                        />

                        {/* Due Date */}
                        <div className="form-group">
                            <label>Due Date</label>
                            <div className="date-input-with-icon">
                                <button
                                    type="button"
                                    aria-label="Open calendar"
                                    className="icon-button calendar-button"
                                    onClick={() => datePickerRef.current && datePickerRef.current.setOpen(true)}
                                >
                                    <Calendar size={24} className="calendar-icon"/>
                                </button>
                                <DatePicker
                                    ref={datePickerRef}
                                    selected={duedate}
                                    onChange={(date) => {
                                        setDuedate(date);
                                    }}
                                    minDate={new Date()}            
                                    showMonthDropdown
                                    showYearDropdown
                                    dropdownMode="select"
                                    dateFormat="dd MMM yyyy"
                                    popperPlacement="bottom-start"
                                    isClearable
                                    placeholderText="Select a due date"
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div className="form-group">
                            <label>Category</label>
                            <input
                                type="text"
                                placeholder="e.g. Work, Personal, Study"
                                value={category}
                                onChange={(e) => {
                                    setCategory(e.target.value);
                                }}
                            />
                        </div>


                        {/* Tags */}
                        <div className="form-group">
                            <label>Tags</label>
                            <input
                                type="text"
                                placeholder="Type a tag and press Enter"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                            />
                        </div>

                        {/* Tag Pills */}
                        <div className="tag-list">
                            {tags.map((tag, index) => (
                                <span key={index} className="tag-pill">
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => removeTag(index)}
                                    >
                                        <X size={16} />
                                    </button>
                                </span>
                            ))}
                        </div>

                        {/* Subtasks */}
                        <div className="form-group">
                            <label>Subtasks</label>

                            <div className="subtask-input">
                                <input
                                    type="text"
                                    placeholder="Subtask title"
                                    value={subtaskInput}
                                    onChange={(e) => setSubtaskInput(e.target.value)}
                                    onKeyDown={handleSubtaskKeyDown}
                                />
                                <button
                                    type="button"
                                    onClick={addSubtask}>
                                    <Plus size={16} />
                                </button>
                            </div>

                            {/* Subtask List */}
                            <ul className="subtask-list">
                                {subtasks.length > 0 && subtasks.map((subtask, index) => (
                                    <li key={index}>
                                        <input type="checkbox" />
                                        <span className="subtask-item">{subtask}</span>
                                        <button onClick={() => handleRemoveSubtask(index)}>
                                            <X size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        disabled={!title.trim() || !description.trim()}
                        className="btn-primary"
                        onClick={handleAddNewTask}>
                        Add Task
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AddTaskModal;
