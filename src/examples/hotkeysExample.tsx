import { useHotkeys } from 'hotkeys-js';
import { useEffect } from 'react';

// Example 1: Basic hotkey usage
const BasicHotkeys = () => {
  useHotkeys('ctrl+s', (event, handler) => {
    event.preventDefault();
    console.log('Save document');
    // Save logic here
  }, []); // Empty deps array means this runs once

  useHotkeys('ctrl+z', (event, handler) => {
    event.preventDefault();
    console.log('Undo last action');
    // Undo logic here
  }, []);

  useHotkeys('ctrl+y', (event, handler) => {
    event.preventDefault();
    console.log('Redo last action');
    // Redo logic here
  }, []);

  return (
    <div className="p-4">
      <h2>Hotkeys Demo</h2>
      <p>Try these shortcuts:</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Ctrl+S: Save</li>
        <li>Ctrl+Z: Undo</li>
        <li>Ctrl+Y: Redo</li>
      </ul>
    </div>
  );
};

// Example 2: Hotkeys with scope and modifiers
const ScopedHotkeys = () => {
  // Global hotkeys (work anywhere)
  useHotkeys('ctrl+f', (event, handler) => {
    event.preventDefault();
    console.log('Open global search');
    // Open search dialog
  }, [], { scope: 'global' });

  // Hotkeys that only work when an input is not focused
  useHotkeys('ctrl+k', (event, handler) => {
    event.preventDefault();
    console.log('Open command palette');
    // Open command palette
  }, [], { 
    scope: 'local',
    enableOnTags: ['INPUT', 'SELECT', 'TEXTAREA'] // Disable when these are focused
  });

  // Hotkey with sequence (like vim)
  useHotkeys('g i', (event, handler) => {
    event.preventDefault();
    console.log('Go to inbox');
    // Navigate to inbox
  }, [], { 
    scope: 'local'
  });

  return (
    <div className="p-4">
      <h2>Scoped Hotkeys Demo</h2>
      <p>Try these shortcuts:</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Ctrl+F: Open global search</li>
        <li>Ctrl+K: Open command palette (when not in input)</li>
        <li>G then I: Go to inbox (vim-style sequence)</li>
      </ul>
    </div>
  );
};

// Example 3: Hotkey with dynamic changes based on state
const DynamicHotkeys = ({ isEditing }: { isEditing: boolean }) => {
  // Different hotkeys based on editing state
  useHotkeys('ctrl+enter', (event, handler) => {
    event.preventDefault();
    if (isEditing) {
      console.log('Save changes');
      // Save changes
    } else {
      console.log('Enter edit mode');
      // Enter edit mode
    }
  }, [isEditing]); // Dependency array - will update when isEditing changes

  // Delete hotkey (only when editing)
  useHotkeys('delete', (event, handler) => {
    event.preventDefault();
    if (isEditing) {
      console.log('Delete selected item');
      // Delete selected item
    }
  }, [isEditing]);

  return (
    <div className="p-4">
      <h2>Dynamic Hotkeys Demo</h2>
      <p>Editing mode: {isEditing ? 'ON' : 'OFF'}</p>
      <p>Try these shortcuts:</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Ctrl+Enter: {"Save changes" if isEditing else "Enter edit mode"}</li>
        <li>Delete: {isEditing ? "Delete selected item" : "(disabled - not in edit mode)"}</li>
      </ul>
    </div>
  );
};

// Example 4: Using useHotkeys with return value for manual control
const ManualControlHotkeys = () => {
  const [count, setCount] = useState(0);
  
  // Returns a function to disable/enable the hotkey
  const disableHotkey = useHotkeys('space', (event, handler) => {
    event.preventDefault();
    setCount(c => c + 1);
    console.log(`Space pressed ${count + 1} times`);
  }, []);

  useEffect(() => {
    // Auto-disable after 5 presses
    if (count >= 5) {
      disableHotkey();
      console.log('Hotkey disabled after 5 presses');
    }
  }, [count, disableHotkey]);

  return (
    <div className="p-4">
      <h2>Manual Control Hotkeys Demo</h2>
      <p>Space bar pressed: {count} times</p>
      {count < 5 ? (
        <p>Press space to increment (will disable after 5 presses)</p>
      ) : (
        <p>Hotkey has been disabled</p>
      )}
    </div>
  );
};

export { BasicHotkeys, ScopedHotkeys, DynamicHotkeys, ManualControlHotkeys };