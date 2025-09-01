import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { SimpleCropStudio } from "./SimpleCropStudio";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, 
  Eye, 
  EyeOff, 
  Upload, 
  Type, 
  Image, 
  Square, 
  Move,
  Trash2,
  Plus,
  Settings,
  Timer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { HomepageElement } from "@shared/schema";

interface EditableElementProps {
  element: HomepageElement;
  isEditing: boolean;
  onUpdate: (updates: Partial<HomepageElement>) => void;
  onDelete: () => void;
}

const EditableElement = ({ element, isEditing, onUpdate, onDelete }: EditableElementProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCropStudio, setShowCropStudio] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const position = element.position ? JSON.parse(element.position) : { x: 0, y: 0, width: 200, height: 100 };
  const styles = element.styles ? JSON.parse(element.styles) : {};

  const handleResize = useCallback((e: React.MouseEvent, direction: string) => {
    if (!isEditing) return;
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = position.width;
    const startHeight = position.height;

    const handleMouseMove = (e: MouseEvent) => {
      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction.includes('right')) {
        newWidth = startWidth + (e.clientX - startX);
      }
      if (direction.includes('left')) {
        newWidth = startWidth - (e.clientX - startX);
      }
      if (direction.includes('bottom')) {
        newHeight = startHeight + (e.clientY - startY);
      }
      if (direction.includes('top')) {
        newHeight = startHeight - (e.clientY - startY);
      }

      onUpdate({
        position: JSON.stringify({
          ...position,
          width: Math.max(50, newWidth),
          height: Math.max(50, newHeight)
        })
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isEditing, position, onUpdate]);

  const handleDrag = useCallback((e: React.MouseEvent) => {
    if (!isEditing || isResizing) return;
    e.stopPropagation();
    setIsDragging(true);

    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleMouseMove = (e: MouseEvent) => {
      onUpdate({
        position: JSON.stringify({
          ...position,
          x: e.clientX - startX,
          y: e.clientY - startY
        })
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isEditing, isResizing, position, onUpdate]);

  const handleTextEdit = (e: React.FormEvent<HTMLDivElement>) => {
    if (element.elementType === 'text' || element.elementType === 'button') {
      onUpdate({ content: e.currentTarget.innerText });
    }
  };

  const handleImageUpload = (imageData: string) => {
    onUpdate({ content: imageData });
    setShowCropStudio(false);
  };

  return (
    <>
      <div
        ref={elementRef}
        data-testid={`element-${element.elementId}`}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: position.width,
          height: position.height,
          zIndex: element.zIndex || 1,
          ...styles,
          outline: isEditing ? '2px dashed #FFCC00' : 'none',
          cursor: isEditing ? 'move' : 'default'
        }}
        onMouseDown={handleDrag}
        className={`${isEditing ? 'group' : ''} transition-all`}
      >
        {/* Content based on element type */}
        {element.elementType === 'text' && (
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onInput={handleTextEdit}
            className="w-full h-full p-2"
            style={{ ...styles }}
          >
            {element.content || 'Click to edit text'}
          </div>
        )}

        {element.elementType === 'image' && (
          <div className="relative w-full h-full">
            {element.content ? (
              <img 
                src={element.content} 
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Image className="w-12 h-12 mx-auto mb-2" />
                  <p>Click upload to add image</p>
                </div>
              </div>
            )}
            {isEditing && (
              <Button
                onClick={() => setShowCropStudio(true)}
                className="absolute top-2 right-2 bg-yellow-500 hover:bg-yellow-600"
                size="sm"
                data-testid="button-upload-image"
              >
                <Upload className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {element.elementType === 'button' && (
          <div className="w-full h-full">
            <Button
              className="w-full h-full"
              style={{ ...styles }}
              data-testid={`button-${element.elementId}`}
              onClick={() => {}}
            >
              <span
                contentEditable={isEditing}
                suppressContentEditableWarning
                onInput={handleTextEdit}
                onClick={(e) => isEditing && e.preventDefault()}
              >
                {element.content || 'Click me'}
              </span>
            </Button>
          </div>
        )}

        {/* Resize handles */}
        {isEditing && (
          <>
            {/* Corner handles */}
            <div
              className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-500 cursor-nw-resize"
              onMouseDown={(e) => handleResize(e, 'top-left')}
            />
            <div
              className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 cursor-ne-resize"
              onMouseDown={(e) => handleResize(e, 'top-right')}
            />
            <div
              className="absolute -bottom-1 -left-1 w-3 h-3 bg-yellow-500 cursor-sw-resize"
              onMouseDown={(e) => handleResize(e, 'bottom-left')}
            />
            <div
              className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-500 cursor-se-resize"
              onMouseDown={(e) => handleResize(e, 'bottom-right')}
            />
            
            {/* Delete button */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="absolute -top-8 right-0 bg-red-500 hover:bg-red-600"
              size="sm"
              data-testid="button-delete-element"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Crop Studio Modal */}
      {showCropStudio && element.elementType === 'image' && (
        <div className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-[90%] max-w-4xl">
            <SimpleCropStudio
              imageUrl={element.content || ''}
              onCropChange={handleImageUpload}
              className="w-full"
            />
            <Button 
              onClick={() => setShowCropStudio(false)}
              className="mt-4"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

interface HomepageEditorProps {
  onClose: () => void;
}

export const HomepageEditor = ({ onClose }: HomepageEditorProps) => {
  const [isEditing, setIsEditing] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing elements
  const { data: elements = [], isLoading } = useQuery<HomepageElement[]>({
    queryKey: ['/api/homepage-elements'],
  });

  // Local state for editing - initialize with empty array
  const [localElements, setLocalElements] = useState<HomepageElement[]>([]);

  // Only update when elements actually change
  useEffect(() => {
    if (elements && elements.length > 0) {
      setLocalElements(elements);
    }
  }, [elements.length]);

  // 5-minute timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          onClose();
          toast({
            title: "Edit session expired",
            description: "Your 5-minute edit session has ended.",
            variant: "default"
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose, toast]);

  // Save elements mutation
  const saveMutation = useMutation({
    mutationFn: async (elements: HomepageElement[]) => {
      return apiRequest('/api/homepage-elements', {
        method: 'POST',
        body: JSON.stringify({ elements }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/homepage-elements'] });
      toast({
        title: "Changes saved",
        description: "Homepage has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleUpdateElement = (id: number, updates: Partial<HomepageElement>) => {
    setLocalElements(prev => 
      prev.map(el => el.id === id ? { ...el, ...updates } : el)
    );
  };

  const handleDeleteElement = (id: number) => {
    setLocalElements(prev => prev.filter(el => el.id !== id));
  };

  const handleAddElement = (type: 'text' | 'image' | 'button') => {
    const tempId = Date.now(); // Temporary ID for new elements
    const newElement: HomepageElement = {
      id: tempId, // Temporary ID
      elementId: `element-${tempId}`,
      elementType: type,
      content: type === 'text' ? 'Click to edit text' : type === 'button' ? 'Click me' : '',
      position: JSON.stringify({
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
        width: type === 'image' ? 300 : 200,
        height: type === 'image' ? 200 : type === 'text' ? 100 : 50
      }),
      styles: JSON.stringify({
        backgroundColor: type === 'button' ? '#FFCC00' : 'transparent',
        color: type === 'button' ? '#000' : '#333',
        fontSize: type === 'text' ? '16px' : '14px',
        padding: type === 'text' ? '10px' : '0'
      }),
      zIndex: localElements.length + 1,
      isVisible: true,
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setLocalElements(prev => [...prev, newElement]);
  };

  const handleSave = () => {
    saveMutation.mutate(localElements);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="text-white">Loading editor...</div>
    </div>;
  }

  return (
    <div className="fixed inset-0 bg-white z-[9999]">
      {/* Toolbar */}
      <div className="fixed top-0 left-0 right-0 bg-gray-900 text-white p-4 z-[10000] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Homepage Editor</h2>
          
          {/* Add elements buttons */}
          <Button
            onClick={() => handleAddElement('text')}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
            data-testid="button-add-text"
          >
            <Type className="w-4 h-4 mr-1" /> Add Text
          </Button>
          <Button
            onClick={() => handleAddElement('image')}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
            data-testid="button-add-image"
          >
            <Image className="w-4 h-4 mr-1" /> Add Image
          </Button>
          <Button
            onClick={() => handleAddElement('button')}
            className="bg-purple-600 hover:bg-purple-700"
            size="sm"
            data-testid="button-add-button"
          >
            <Square className="w-4 h-4 mr-1" /> Add Button
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded">
            <Timer className="w-4 h-4" />
            <span className="font-mono">{formatTime(timeRemaining)}</span>
          </div>

          {/* Preview toggle */}
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant="outline"
            size="sm"
            className="text-black"
            data-testid="button-toggle-preview"
          >
            {isEditing ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {isEditing ? 'Preview' : 'Edit'}
          </Button>

          {/* Save button */}
          <Button
            onClick={handleSave}
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
            size="sm"
            disabled={saveMutation.isPending}
            data-testid="button-save-changes"
          >
            <Save className="w-4 h-4 mr-1" />
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>

          {/* Close button */}
          <Button
            onClick={onClose}
            variant="destructive"
            size="sm"
            data-testid="button-close-editor"
          >
            Close Editor
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="mt-16 relative w-full h-full overflow-auto bg-gray-50">
        <div className="relative min-h-screen" style={{ width: '100%', minHeight: '100vh' }}>
          {localElements.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-xl mb-2">No elements yet</p>
                <p>Click the buttons above to add text, images, or buttons</p>
              </div>
            </div>
          )}
          {localElements.map(element => (
            <EditableElement
              key={element.elementId || element.id}
              element={element}
              isEditing={isEditing}
              onUpdate={(updates) => handleUpdateElement(element.id, updates)}
              onDelete={() => handleDeleteElement(element.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};