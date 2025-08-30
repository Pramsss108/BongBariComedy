import { useState, useEffect, useCallback } from 'react';

interface UseInfiniteScrollProps<T> {
  items: T[];
  fetchMore: () => Promise<T[]>;
  hasMore: boolean;
  threshold?: number;
}

export const useInfiniteScroll = <T>({
  items,
  fetchMore,
  hasMore,
  threshold = 100
}: UseInfiniteScrollProps<T>) => {
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState<T[]>(items);

  useEffect(() => {
    setAllItems(items);
  }, [items]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const newItems = await fetchMore();
      setAllItems(prev => [...prev, ...newItems]);
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, fetchMore]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + threshold
        >= document.documentElement.offsetHeight
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore, threshold]);

  return {
    items: allItems,
    loading,
    loadMore,
    hasMore
  };
};