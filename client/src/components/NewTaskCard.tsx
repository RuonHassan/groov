import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddTaskModal from "./AddTaskModal";
import { motion } from "framer-motion";

export default function NewTaskCard() {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <motion.div 
        className="border-b border-gray-100 w-full hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setShowAddModal(true)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center justify-center py-2 px-2 text-gray-400 hover:text-gray-600">
          <PlusCircle className="h-3 w-3 mr-1.5" />
          <span className="text-xs">Add new task</span>
        </div>
      </motion.div>

      <AddTaskModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </>
  );
}