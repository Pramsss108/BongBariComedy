import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Volume2, VolumeX } from 'lucide-react';

interface CharmOption {
  id: string;
  name: string;
  description: string;
  frequency: number;
  type: OscillatorType;
  harmonic: number;
}

const charmOptions: CharmOption[] = [
  {
    id: 'crystal',
    name: '✨ Crystal Chime',
    description: 'Pure, bright, magical sparkle',
    frequency: 1200,
    type: 'sine',
    harmonic: 1.5
  },
  {
    id: 'bell',
    name: '🔔 Warm Bell',
    description: 'Soft, warm, gentle ringing',
    frequency: 900,
    type: 'triangle',
    harmonic: 2
  },
  {
    id: 'fairy',
    name: '🧚‍♀️ Fairy Dust',
    description: 'High, delicate, ethereal',
    frequency: 1500,
    type: 'sine',
    harmonic: 1.7
  },
  {
    id: 'dream',
    name: '🌙 Dream Chime',
    description: 'Deep, soothing, mystical',
    frequency: 800,
    type: 'sine',
    harmonic: 1.25
  },
  {
    id: 'sparkle',
    name: '⭐ Sparkle Dust',
    description: 'Mid-range, cheerful, bouncy',
    frequency: 1000,
    type: 'triangle',
    harmonic: 1.4
  }
];

interface CharmSoundSelectorProps {
  onSelect: (charm: CharmOption) => void;
  onDisable: () => void;
}

export function CharmSoundSelector({ onSelect, onDisable }: CharmSoundSelectorProps) {
  const [selectedCharm, setSelectedCharm] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<AudioContext | null>(null);

  const playPreview = async (charm: CharmOption) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const harmonic = audioContext.createOscillator();
      const harmonicGain = audioContext.createGain();
      
      // Main tone
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.type = charm.type;
      oscillator.frequency.setValueAtTime(charm.frequency, audioContext.currentTime);
      
      // Harmonic
      harmonic.connect(harmonicGain);
      harmonicGain.connect(audioContext.destination);
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(charm.frequency * charm.harmonic, audioContext.currentTime);
      
      // Set volumes
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
      
      harmonicGain.gain.setValueAtTime(0, audioContext.currentTime);
      harmonicGain.gain.linearRampToValueAtTime(0.03, audioContext.currentTime + 0.1);
      harmonicGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
      
      // Play preview for 1 second
      oscillator.start(audioContext.currentTime);
      harmonic.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
      harmonic.stop(audioContext.currentTime + 1);
      
      setPreviewAudio(audioContext);
      
    } catch (error) {
      console.log('Preview not available');
    }
  };

  const selectCharm = (charm: CharmOption) => {
    setSelectedCharm(charm.id);
    onSelect(charm);
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-white/95 backdrop-blur shadow-xl">
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-3 text-center">🎵 Select Your Charm Sound</h3>
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {charmOptions.map((charm) => (
            <div 
              key={charm.id}
              className={`p-2 rounded-lg border cursor-pointer transition-all ${
                selectedCharm === charm.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">{charm.name}</div>
                  <div className="text-xs text-gray-600">{charm.description}</div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    onClick={() => playPreview(charm)}
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedCharm === charm.id ? "default" : "outline"}
                    className="h-7 px-2"
                    onClick={() => selectCharm(charm)}
                  >
                    {selectedCharm === charm.id ? '✓' : 'Use'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-3 pt-3 border-t">
          <Button
            onClick={onDisable}
            variant="outline"
            className="w-full"
          >
            <VolumeX className="h-4 w-4 mr-2" />
            Disable Charm Sound
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}