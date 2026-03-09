import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MapPin, Loader2 } from 'lucide-react';

interface LocationSuggestion {
  display: string;
  city: string;
  state: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

// Capitalize first letter of each word
function capitalize(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Enter location',
  className,
  id,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions from Nominatim
  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchQuery = `${query}, India`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'LovableTravelPlanner/1.0' }
      });
      
      if (!response.ok) {
        setSuggestions([]);
        return;
      }
      
      const data = await response.json();
      
      const results: LocationSuggestion[] = data.map((item: any) => {
        const address = item.address || {};
        const city = address.city || address.town || address.village || address.county || address.state_district || '';
        const state = address.state || '';
        
        return {
          display: city && state ? `${city}, ${state}` : item.display_name.split(',').slice(0, 2).join(', '),
          city: city || query,
          state: state,
        };
      });
      
      // Filter duplicates
      const unique = results.filter((item, idx, arr) => 
        arr.findIndex(x => x.display === item.display) === idx
      );
      
      setSuggestions(unique);
    } catch (error) {
      console.error('Location suggestion error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = capitalize(e.target.value);
    onChange(newValue);
    setShowDropdown(true);
    setHighlightedIndex(-1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  // Handle suggestion selection
  const handleSelect = (suggestion: LocationSuggestion) => {
    onChange(suggestion.display);
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={handleInputChange}
          onFocus={() => value.length >= 2 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn('text-lg pr-8', className)}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.display}-${index}`}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={cn(
                'w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors',
                index === highlightedIndex 
                  ? 'bg-accent text-accent-foreground' 
                  : 'hover:bg-muted'
              )}
            >
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm truncate">{suggestion.display}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
