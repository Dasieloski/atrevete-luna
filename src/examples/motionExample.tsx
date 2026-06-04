import { motion, AnimatePresence, Variants } from 'framer-motion';

// Example 1: Simple fade-in animation
const FadeIn = () => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="p-4 bg-blue-500 text-white rounded-lg"
  >
    Fade In Element
  </motion.div>
);

// Example 2: List animation with AnimatePresence
const listVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  },
  exit: { opacity: 0, y: 20 }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
};

const AnimatedList = ({ items }: { items: string[] }) => (
  <AnimatePresence>
    <motion.ul 
      variants={listVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-2"
    >
      {items.map((item, index) => (
        <motion.li
          key={index}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="p-3 bg-gray-100 rounded-lg"
        >
          {item}
        </motion.li>
      ))}
    </motion.ul>
  </AnimatePresence>
);

// Example 3: Drag and drop with motion
const DraggableBox = () => (
  <motion.div
    draggable
    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
    whileDrag={{ scale: 1.1 }}
    dragTransition={{ inertia: false }}
    className="w-32 h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white cursor-grab"
  >
    Drag Me
  </motion.div>
);

export { FadeIn, AnimatedList, DraggableBox };