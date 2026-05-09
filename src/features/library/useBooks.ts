import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listBooks, deleteBook } from '@/lib/supabaseSync';
import { useAuth } from '@/features/auth/useAuth';
import { toast } from '@/app/toastStore';

export function useBooks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['books', user?.id],
    queryFn: () => listBooks(user!.id),
    enabled: !!user?.id,
  });
}

export function useDeleteBook() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => deleteBook(bookId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['books', user?.id] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Failed to remove book');
    },
  });
}
