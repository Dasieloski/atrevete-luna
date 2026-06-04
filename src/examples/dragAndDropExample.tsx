import { useDrag, useDrop } from '@atlaskit/pragmatic-drag-and-drop/react';

// Example 1: Simple draggable element
const DraggableItem = ({ id, children, onMove }: { 
  id: string; 
  children: React.ReactNode; 
  onMove: (dragId: string) => void 
}) => {
  const { draggableProps } = useDrag({
    getInitialItem: () => ({ id, type: 'ITEM' }),
  });

  return (
    <div 
      {...draggableProps}
      className="draggable p-4 m-2 bg-blue-100 border border-blue-300 rounded-lg cursor-grab"
      style={{ 
        userSelect: 'none',
        touchAction: 'none' 
      }}
    >
      {children}
    </div>
  );
};

// Example 2: Drop target
const DropTarget = ({ onItemsDrop }: { onItemsDrop: (items: Array<{id: string}>) => void }) => {
  const { dropProps } = useDrop({
    accept: 'ITEM',
    getDropResult: () => ({}),
    drop: () => {
      // In a real app, you'd get the items from the drag context
      // This is a simplified example
      onItemsDrop([{ id: 'dropped-item' }]);
    }
  });

  return (
    <div 
      {...dropProps}
      className="drop-target p-6 m-4 min-h-[100px] bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg"
    >
      Drop items here
    </div>
  );
};

// Example 3: Reorderable list
interface ListItem {
  id: string;
  content: string;
}

const ReorderableList = ({ items, onReorder }: { 
  items: ListItem[]; 
  onReorder: (newItems: ListItem[]) => void 
}) => {
  const handleDragEnd = (itemId: string, newIndex: number) => {
    onReorder(prevItems => {
      const item = prevItems.find(i => i.id === itemId)!;
      const newItems = [...prevItems];
      const oldIndex = newItems.findIndex(i => i.id === itemId);
      newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, item);
      return newItems;
    });
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const { draggableProps } = useDrag({
          getInitialItem: () => ({ id: item.id, type: 'LIST_ITEM', index }),
        });

        const { dropProps } = useDrop({
          accept: 'LIST_ITEM',
          hover: (dropResult) => {
            if (!dropResult) return;
            
            const dragIndex = dropResult.index;
            const hoverIndex = index;
            
            if (dragIndex === hoverIndex) return;
            
            // Move item in state
            onReorder(prevItems => {
              const dragItem = prevItems[dragIndex];
              const newItems = [...prevItems];
              newItems.splice(dragIndex, 1);
              newItems.splice(hoverIndex, 0, dragItem);
              return newItems;
            });
          }
        });

        return (
          <div 
            key={item.id}
            {...draggableProps}
            {...dropProps}
            className={`list-item p-3 m-1 bg-white border border-gray-200 rounded-lg flex items-center justify-between 
                       ${index === items.length - 1 ? 'border-b-0' : ''}`}
            style={{ 
              userSelect: 'none',
              touchAction: 'none',
              opacity: 0.8 
            }}
          >
            <span>{item.content}</span>
            <div className="text-xs text-gray-500">Drag to reorder</div>
          </div>
        );
      })}
    </div>
  );
};

// Example 4: Custom drag preview
const CustomDragPreview = ({ children }: { children: React.ReactNode }) => {
  const { draggableProps, setPreview } = useDrag({
    getInitialItem: () => ({ type: 'CUSTOM_PREVIEW' }),
  });

  // Create a custom preview element
  useEffect(() => {
    const previewElement = document.createElement('div');
    previewElement.innerHTML = `
      <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg">
        ${typeof children === 'string' ? children : 'Custom Preview'}
      </div>
    `;
    previewElement.style.position = 'fixed';
    previewElement.style.top = '-1000px'; // Start off-screen
    previewElement.style.pointerEvents = 'none';
    previewElement.style.zIndex = '9999';
    document.body.appendChild(previewElement);
    
    setPreview(previewElement);
    
    return () => {
      document.body.removeChild(previewElement);
    };
  }, [children, setPreview]);

  return (
    <div 
      {...draggableProps}
      className="drag-preview p-4 m-2 bg-gray-200 border border-gray-400 rounded-lg cursor-grab"
      style={{ 
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      {children}
    </div>
  );
};

export { DraggableItem, DropTarget, ReorderableList, CustomDragPreview };