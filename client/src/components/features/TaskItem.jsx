import { CheckCircle, Circle, Clock, Tag, Trash2 } from "lucide-react";
import "./TaskItem.css"

function TaskItem({ task, isSelected, isCompleted, onClick, onDelete, onToggleComplete }) {
  
  const {
    title,
    updated_at,
    due_date,
    tags = [],
    category,
    subtasks = [],
  } = task;
  
  const completedSubtasks = subtasks.filter((st) => st.completed).length;
  
  const handleTaskComplete = (e) => {
    e.stopPropagation();              
    onToggleComplete?.();
  };

  const handleTaskDelete = (e) => {
    e.stopPropagation();
    onDelete?.(task);
  }

  return (
    <div
      className={`task-item ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div
        className="task-left"
        onClick={(e) => {
          handleTaskComplete(e);
        }}
      >
        {isCompleted ? (
          <CheckCircle size={20} className="task-icon completed" />
        ) : (
          <Circle size={20} className="task-icon pending" />
        )}
      </div>

      <div className="task-content">
        <div className="task-header">
          <div className="task-header-left">
            <h3 className={`task-title ${isCompleted ? "done" : ""}`}>
              {title}
            </h3>

            {category && (
              <span className="task-category">{category}</span>
            )}
          </div>

          <div className="task-delete" onClick={(e) => handleTaskDelete(e)}>
            <Trash2 size={18} className="task-delete-icon" />
          </div>
        </div>

        <div className="task-meta">
          {due_date && (
            <span className="task-meta-item">
              <Clock size={14} />
              {new Date(due_date).toLocaleDateString()}
            </span>
          )}

          {subtasks.length > 0 && (
            <span className="task-meta-item">
              {completedSubtasks}/{subtasks.length} subtasks
            </span>
          )}

        </div>

        {tags.length > 0 && (
          <div className="task-tags">
            {tags.map(tag => (
              <span key={tag.tag_name} className="task-tag">
                <Tag size={12} />
                {tag.tag_name}
              </span>
            ))}
          </div>
        )}

        <div className="task-dates">
          {/* <span>Created: {new Date(created_at).toLocaleDateString()}</span> */}
          <span>Updated: {new Date(updated_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

export default TaskItem;
