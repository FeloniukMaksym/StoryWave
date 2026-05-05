import { Navigate, Route, Routes } from 'react-router-dom';
import { SignInPage } from '@/features/auth/SignInPage';
import { AuthGuard } from '@/features/auth/AuthGuard';
import { LibraryPage } from '@/features/library/LibraryPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route
        path="/library"
        element={
          <AuthGuard>
            <LibraryPage />
          </AuthGuard>
        }
      />
      <Route path="/" element={<Navigate to="/library" replace />} />
      <Route path="*" element={<Navigate to="/library" replace />} />
    </Routes>
  );
}
