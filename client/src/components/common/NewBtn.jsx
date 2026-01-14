import React from "react";
import { Plus } from "lucide-react";
import "./NewBtn.css";

const NewBtn = ({ 
  onClick
}) => {
  return (
    <button className="new-btn" onClick={onClick}>
        <Plus size={24} />
    </button>
  );
};

export default NewBtn;
